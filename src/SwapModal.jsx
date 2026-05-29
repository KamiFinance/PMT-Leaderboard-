import { useState, useEffect, useCallback } from 'react'
import { parseEther, parseUnits, formatUnits, formatEther, encodeFunctionData, decodeAbiParameters } from 'viem'
import { useAccount, useConnect, useDisconnect, useSwitchChain, useWalletClient } from 'wagmi'
import { PMT_TOKEN, WBNB, USDT, BSC_CHAIN_ID } from './wagmi.js'

// PancakeSwap V3 addresses (BSC)
const V3_QUOTER  = '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997'
const V3_ROUTER  = '0x13f4EA83D0bd40E75C8222255bc855a974568Dd4'

// V3 pool fees
const FEE_WBNB_USDT = 500   // 0.05% — WBNB/USDT pool
const FEE_USDT_PMT  = 2500  // 0.25% — USDT/PMT pool

const BSC_RPC = 'https://bsc-dataseed.binance.org/'

const SLIPPAGE_OPTIONS = [
  { label: '0.1%', value: 0.001 },
  { label: '0.5%', value: 0.005 },
  { label: '1%',   value: 0.01 },
]

const ERC20_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] }
]

const V3_ROUTER_ABI = [
  // exactInputSingle — USDT → PMT
  { name: 'exactInputSingle', type: 'function', stateMutability: 'payable',
    inputs: [{ name: 'params', type: 'tuple', components: [
      { name: 'tokenIn', type: 'address' }, { name: 'tokenOut', type: 'address' },
      { name: 'fee', type: 'uint24' }, { name: 'recipient', type: 'address' },
      { name: 'amountIn', type: 'uint256' }, { name: 'amountOutMinimum', type: 'uint256' },
      { name: 'sqrtPriceLimitX96', type: 'uint160' }
    ]}],
    outputs: [{ name: 'amountOut', type: 'uint256' }]
  },
  // exactInput — BNB → USDT → PMT (multi-hop)
  { name: 'exactInput', type: 'function', stateMutability: 'payable',
    inputs: [{ name: 'params', type: 'tuple', components: [
      { name: 'path', type: 'bytes' }, { name: 'recipient', type: 'address' },
      { name: 'amountIn', type: 'uint256' }, { name: 'amountOutMinimum', type: 'uint256' }
    ]}],
    outputs: [{ name: 'amountOut', type: 'uint256' }]
  }
]

// Encode V3 path bytes: token0 + fee (3 bytes) + token1 + ...
const encodePath = (...segments) => {
  // segments: [addr, fee, addr, fee, addr] alternating
  let hex = ''
  for (let i = 0; i < segments.length; i++) {
    if (i % 2 === 0) {
      hex += segments[i].toLowerCase().replace('0x', '')
    } else {
      hex += segments[i].toString(16).padStart(6, '0')
    }
  }
  return ('0x' + hex)
}

// Raw RPC call helper (bypasses wagmi, works regardless of wallet chain)
const rpcCall = async (to, data) => {
  const res = await fetch(BSC_RPC, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to, data }, 'latest'] })
  })
  const json = await res.json()
  if (json.error) throw new Error(json.error.message)
  return json.result
}

// QuoterV2 quoteExactInput — returns amountOut
const quoteExactInput = async (pathHex, amountIn) => {
  // selector: keccak256("quoteExactInput(bytes,uint256)") = 0xcdca1753
  const pathBytes = pathHex.replace('0x', '')
  const pathLen = pathBytes.length / 2
  const paddedPath = pathBytes.padEnd(Math.ceil(pathLen / 32) * 64, '0')
  const pad = n => BigInt(n).toString(16).padStart(64, '0')
  const data = '0xcdca1753' + pad(64) + pad(amountIn) + pad(pathLen) + paddedPath
  const result = await rpcCall(V3_QUOTER, data)
  return BigInt('0x' + result.slice(2, 66)) // first 32 bytes = amountOut
}

// ERC20 balanceOf via raw RPC
const getErc20Balance = async (token, addr) => {
  // balanceOf(address) selector: 0x70a08231
  const data = '0x70a08231' + addr.toLowerCase().replace('0x', '').padStart(64, '0')
  const result = await rpcCall(token, data)
  return BigInt('0x' + result.slice(2, 66))
}

// ERC20 allowance via raw RPC
const getErc20Allowance = async (token, owner, spender) => {
  // allowance(address,address) selector: 0xdd62ed3e
  const pad = a => a.toLowerCase().replace('0x', '').padStart(64, '0')
  const data = '0xdd62ed3e' + pad(owner) + pad(spender)
  const result = await rpcCall(token, data)
  return BigInt('0x' + result.slice(2, 66))
}

// BNB balance via eth_getBalance
const getBnbBalance = async (addr) => {
  const res = await fetch(BSC_RPC, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBalance', params: [addr, 'latest'] })
  })
  return BigInt((await res.json()).result)
}

const shortenAddr = a => `${a.slice(0, 6)}...${a.slice(-4)}`

const fmtPmt = (raw) => {
  if (!raw) return null
  const n = parseFloat(formatUnits(raw, 18))
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toFixed(2)
}

export default function SwapModal({ onClose }) {
  const { address, isConnected, chain } = useAccount()
  const { connect, connectors, isPending: isConnecting } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()
  const { data: walletClient } = useWalletClient()

  const [inputToken, setInputToken] = useState('BNB')
  const [amount, setAmount] = useState('0.1')
  const [pmtOut, setPmtOut] = useState(null)
  const [bnbBalance, setBnbBalance] = useState(null)
  const [usdtBalance, setUsdtBalance] = useState(null)
  const [quoting, setQuoting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [approving, setApproving] = useState(false)
  const [needsApproval, setNeedsApproval] = useState(false)
  const [txHash, setTxHash] = useState(null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [slippage, setSlippage] = useState(0.005)

  const wrongChain = isConnected && chain?.id !== BSC_CHAIN_ID

  // Fetch balances
  useEffect(() => {
    if (!address) return
    const load = async () => {
      try {
        const [bnb, usdt] = await Promise.all([
          getBnbBalance(address),
          getErc20Balance(USDT, address)
        ])
        setBnbBalance(bnb)
        setUsdtBalance(usdt)
      } catch {}
    }
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [address])

  // Check USDT allowance
  useEffect(() => {
    if (!address || inputToken !== 'USDT') { setNeedsApproval(false); return }
    const check = async () => {
      try {
        const amtIn = parseUnits(amount || '0', 18)
        const allowance = await getErc20Allowance(USDT, address, V3_ROUTER)
        setNeedsApproval(allowance < amtIn)
      } catch {}
    }
    check()
  }, [address, inputToken, amount])

  // Quote
  const getQuote = useCallback(async (val, token) => {
    const num = parseFloat(val)
    if (!num || num <= 0) { setPmtOut(null); return }
    setQuoting(true)
    try {
      let amountIn, path
      if (token === 'BNB') {
        amountIn = parseEther(val)
        path = encodePath(WBNB, FEE_WBNB_USDT, USDT, FEE_USDT_PMT, PMT_TOKEN)
      } else {
        amountIn = parseUnits(val, 18)
        path = encodePath(USDT, FEE_USDT_PMT, PMT_TOKEN)
      }
      const out = await quoteExactInput(path, amountIn)
      setPmtOut(out)
    } catch {
      setPmtOut(null)
    }
    setQuoting(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => getQuote(amount, inputToken), 500)
    return () => clearTimeout(t)
  }, [amount, inputToken, getQuote])

  const handleMax = () => {
    if (inputToken === 'BNB' && bnbBalance !== null) {
      const safe = bnbBalance - parseEther('0.005')
      setAmount(safe > 0n ? parseFloat(formatEther(safe)).toFixed(4) : '0')
    } else if (inputToken === 'USDT' && usdtBalance !== null) {
      setAmount(parseFloat(formatUnits(usdtBalance, 18)).toFixed(2))
    }
  }

  const handleApprove = async () => {
    if (!walletClient) return
    setApproving(true); setError(null)
    try {
      const amtIn = parseUnits(amount, 18)
      await walletClient.writeContract({
        address: USDT, abi: ERC20_ABI, functionName: 'approve',
        args: [V3_ROUTER, amtIn]
      })
      setNeedsApproval(false)
    } catch (e) { setError(e.shortMessage || 'Approval failed') }
    setApproving(false)
  }

  const handleSwap = async () => {
    if (!walletClient || !address || !pmtOut) return
    setError(null); setLoading(true)
    try {
      const amtOutMin = pmtOut - (pmtOut * BigInt(Math.floor(slippage * 10000)) / BigInt(10000))
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200)
      let hash

      if (inputToken === 'BNB') {
        const amtIn = parseEther(amount)
        const path = encodePath(WBNB, FEE_WBNB_USDT, USDT, FEE_USDT_PMT, PMT_TOKEN)
        hash = await walletClient.writeContract({
          address: V3_ROUTER, abi: V3_ROUTER_ABI, functionName: 'exactInput',
          args: [{ path, recipient: address, amountIn: amtIn, amountOutMinimum: amtOutMin }],
          value: amtIn,
        })
      } else {
        const amtIn = parseUnits(amount, 18)
        hash = await walletClient.writeContract({
          address: V3_ROUTER, abi: V3_ROUTER_ABI, functionName: 'exactInputSingle',
          args: [{ tokenIn: USDT, tokenOut: PMT_TOKEN, fee: FEE_USDT_PMT,
            recipient: address, amountIn: amtIn, amountOutMinimum: amtOutMin, sqrtPriceLimitX96: 0n }],
        })
      }
      setTxHash(hash); setSuccess(true)
    } catch (e) {
      setError(e.shortMessage || e.message?.slice(0, 120) || 'Transaction failed')
    }
    setLoading(false)
  }

  const metaMaskConn = connectors.find(c => c.id === 'metaMask' || c.name === 'MetaMask')
  const wcConn       = connectors.find(c => c.id === 'walletConnect')
  const symbol       = inputToken === 'BNB' ? 'BNB' : 'USDT'
  const balance      = inputToken === 'BNB'
    ? (bnbBalance !== null ? parseFloat(formatEther(bnbBalance)).toFixed(4) : null)
    : (usdtBalance !== null ? parseFloat(formatUnits(usdtBalance, 18)).toFixed(2) : null)

  return (
    <div className="video-modal-overlay" onClick={onClose}>
      <div className="swap-modal-box" onClick={e => e.stopPropagation()}>
        <button className="video-modal-close" onClick={onClose}>✕</button>

        <div className="swap-modal-header">
          <div className="swap-modal-title">Buy PMT</div>
          {isConnected && (
            <button className="swap-wallet-badge" onClick={() => disconnect()}>
              <span className="swap-wallet-dot" />{shortenAddr(address)}
            </button>
          )}
        </div>

        {wrongChain && (
          <div className="swap-wrong-chain">
            <span>⚠ Switch to BSC</span>
            <button onClick={() => switchChain({ chainId: BSC_CHAIN_ID })}>Switch</button>
          </div>
        )}

        {success ? (
          <div className="swap-success">
            <div className="swap-success-icon">✓</div>
            <h3>Swap Submitted!</h3>
            <p>Your transaction is on its way.</p>
            <a href={`https://bscscan.com/tx/${txHash}`} target="_blank" rel="noreferrer" className="swap-bscscan-link">View on BSCScan ↗</a>
            <button className="lp-btn-primary" onClick={onClose} style={{width:'100%',border:'none',cursor:'pointer',marginTop:8}}>Close</button>
          </div>

        ) : !isConnected ? (
          <div className="swap-connect-section">
            <p className="swap-connect-hint">Connect your wallet to swap for PMT</p>
            <div className="swap-connectors">
              {metaMaskConn && (
                <button className="swap-connector-btn" onClick={() => connect({ connector: metaMaskConn })} disabled={isConnecting}>
                  <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask" width={28} height={28} />
                  MetaMask
                </button>
              )}
              {wcConn && (
                <button className="swap-connector-btn" onClick={() => connect({ connector: wcConn })} disabled={isConnecting}>
                  <svg viewBox="0 0 40 25" fill="none" width="28" height="18">
                    <path d="M8.19 4.45c6.52-6.38 17.1-6.38 23.62 0l.79.77a.81.81 0 0 1 0 1.16l-2.7 2.64a.43.43 0 0 1-.59 0l-1.08-1.06C24.05 3.9 16 3.9 11.76 7.96L10.6 9.07a.43.43 0 0 1-.59 0L7.32 6.43a.81.81 0 0 1 0-1.16l.87-.82Zm29.17 5.44 2.4 2.35a.81.81 0 0 1 0 1.16L28.93 24.07a.86.86 0 0 1-1.19 0l-8.3-8.12a.21.21 0 0 0-.3 0l-8.3 8.12a.86.86 0 0 1-1.19 0L.82 13.4a.81.81 0 0 1 0-1.16l2.4-2.35a.86.86 0 0 1 1.19 0l8.3 8.12c.08.08.21.08.3 0l8.3-8.12a.86.86 0 0 1 1.19 0l8.3 8.12c.08.08.21.08.3 0l8.3-8.12a.86.86 0 0 1 1.18 0Z" fill="#3B99FC"/>
                  </svg>
                  WalletConnect
                </button>
              )}
            </div>
          </div>

        ) : (
          <div className="swap-form">
            <div className="swap-token-toggle">
              {['BNB', 'USDT'].map(t => (
                <button key={t}
                  className={`swap-toggle-btn${inputToken === t ? ' active' : ''}`}
                  onClick={() => { setInputToken(t); setAmount(t === 'BNB' ? '0.1' : '10'); setPmtOut(null) }}>
                  {t}
                </button>
              ))}
            </div>

            <div className="swap-token-box">
              <div className="swap-token-label-row">
                <span className="swap-token-label">You pay</span>
                {balance !== null && (
                  <span className="swap-balance">
                    Balance: {balance} {symbol}
                    <button className="swap-max-btn" onClick={handleMax}>MAX</button>
                  </span>
                )}
              </div>
              <div className="swap-token-row">
                <input type="number" className="swap-token-input" value={amount}
                  onChange={e => setAmount(e.target.value)} placeholder="0.0"
                  min="0" step={inputToken === 'BNB' ? '0.01' : '1'} />
                <div className="swap-token-badge">
                  <img src="https://assets.pancakeswap.finance/web/chains/56.png" alt={symbol} width={22} height={22} />
                  {symbol}
                </div>
              </div>
            </div>

            <div className="swap-arrow">↓</div>

            <div className="swap-token-box">
              <div className="swap-token-label">You receive (est.)</div>
              <div className="swap-token-row">
                <div className="swap-token-output">
                  {quoting ? <span className="swap-quoting">…</span> : pmtOut ? fmtPmt(pmtOut) : '—'}
                </div>
                <div className="swap-token-badge">
                  <img src="https://raw.githubusercontent.com/KamiFinance/PMT-Leaderboard-/main/public/PMT-logo.png" alt="PMT" width={22} height={22} style={{borderRadius:'50%'}} />
                  PMT
                </div>
              </div>
            </div>

            <div className="swap-slippage-row">
              <span className="swap-slippage-label">Slippage</span>
              <div className="swap-slippage-options">
                {SLIPPAGE_OPTIONS.map(opt => (
                  <button key={opt.value}
                    className={`swap-slippage-btn${slippage === opt.value ? ' active' : ''}`}
                    onClick={() => setSlippage(opt.value)}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="swap-info-row">
              <span>Route</span>
              <span>{inputToken === 'BNB' ? 'BNB → USDT → PMT' : 'USDT → PMT'}</span>
            </div>
            {pmtOut && !quoting && parseFloat(amount) > 0 && (
              <div className="swap-info-row">
                <span>Rate</span>
                <span>1 {symbol} ≈ {fmtPmt(pmtOut * parseUnits('1', 18) / parseUnits(amount, 18))} PMT</span>
              </div>
            )}

            {error && <div className="swap-error">{error}</div>}

            {needsApproval ? (
              <button className="lp-btn-primary swap-btn" onClick={handleApprove}
                disabled={approving} style={{width:'100%',border:'none',cursor:'pointer'}}>
                {approving ? 'Approving…' : 'Approve USDT'}
              </button>
            ) : (
              <button className="lp-btn-primary swap-btn" onClick={handleSwap}
                disabled={loading || quoting || !pmtOut || wrongChain || parseFloat(amount) <= 0}
                style={{width:'100%',border:'none',cursor:'pointer'}}>
                {loading ? 'Swapping…' : wrongChain ? 'Switch to BSC' : `Swap ${symbol} → PMT`}
              </button>
            )}

            <p className="swap-disclaimer">Powered by Public Masterpiece</p>
          </div>
        )}
      </div>
    </div>
  )
}
