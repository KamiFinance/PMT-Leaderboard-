import { useState, useEffect, useCallback } from 'react'
import { createPublicClient, http, parseEther, parseUnits, formatEther, formatUnits, encodeFunctionData } from 'viem'
import { bsc } from 'viem/chains'
import { useAccount, useConnect, useDisconnect, useSwitchChain, useWalletClient } from 'wagmi'
import { PMT_TOKEN, WBNB, USDT, PANCAKE_V2, BSC_CHAIN_ID } from './wagmi.js'

// Standalone BSC client — quotes work regardless of wallet state
const bscClient = createPublicClient({
  chain: bsc,
  transport: http('https://bsc-dataseed.binance.org/')
})

const ROUTER_ABI = [
  { name: 'getAmountsOut', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'amountIn', type: 'uint256' }, { name: 'path', type: 'address[]' }],
    outputs: [{ name: 'amounts', type: 'uint256[]' }]
  },
  { name: 'swapExactETHForTokensSupportingFeeOnTransferTokens', type: 'function', stateMutability: 'payable',
    inputs: [{ name: 'amountOutMin', type: 'uint256' }, { name: 'path', type: 'address[]' }, { name: 'to', type: 'address' }, { name: 'deadline', type: 'uint256' }],
    outputs: []
  },
  { name: 'swapExactTokensForTokensSupportingFeeOnTransferTokens', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'amountIn', type: 'uint256' }, { name: 'amountOutMin', type: 'uint256' }, { name: 'path', type: 'address[]' }, { name: 'to', type: 'address' }, { name: 'deadline', type: 'uint256' }],
    outputs: []
  }
]

const ERC20_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }]
  },
  { name: 'allowance', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  { name: 'approve', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }]
  }
]

const SLIPPAGE_OPTIONS = [
  { label: '0.1%', value: 0.001 },
  { label: '0.5%', value: 0.005 },
  { label: '1%',   value: 0.01 },
]

const shortenAddr = a => `${a.slice(0,6)}...${a.slice(-4)}`

const fmtPmt = (val) => {
  if (!val) return null
  const n = parseFloat(val)
  if (n >= 1e6) return `${(n/1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n/1e3).toFixed(1)}K`
  return n.toFixed(2)
}

export default function SwapModal({ onClose }) {
  const { address, isConnected, chain } = useAccount()
  const { connect, connectors, isPending: isConnecting } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()
  const { data: walletClient } = useWalletClient()

  const [inputToken, setInputToken] = useState('BNB') // 'BNB' | 'USDT'
  const [amount, setAmount] = useState('10')
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
  const [slippage, setSlippage] = useState(0.005) // default 0.5%

  const wrongChain = isConnected && chain?.id !== BSC_CHAIN_ID

  // Fetch balances when connected
  useEffect(() => {
    if (!address) return
    const fetchBalances = async () => {
      try {
        const [bnb, usdt] = await Promise.all([
          bscClient.getBalance({ address }),
          bscClient.readContract({ address: USDT, abi: ERC20_ABI, functionName: 'balanceOf', args: [address] })
        ])
        setBnbBalance(formatEther(bnb))
        setUsdtBalance(formatUnits(usdt, 18))
      } catch {}
    }
    fetchBalances()
    const interval = setInterval(fetchBalances, 30000)
    return () => clearInterval(interval)
  }, [address])

  // Check USDT approval
  useEffect(() => {
    if (!address || inputToken !== 'USDT' || !amount) { setNeedsApproval(false); return }
    const checkAllowance = async () => {
      try {
        const amountIn = parseUnits(amount || '0', 18)
        const allowance = await bscClient.readContract({
          address: USDT, abi: ERC20_ABI, functionName: 'allowance', args: [address, PANCAKE_V2]
        })
        setNeedsApproval(allowance < amountIn)
      } catch {}
    }
    checkAllowance()
  }, [address, inputToken, amount])

  // Get quote
  const getQuote = useCallback(async (val, token) => {
    const num = parseFloat(val)
    if (!num || num <= 0) { setPmtOut(null); return }
    setQuoting(true)
    try {
      const path = token === 'BNB' ? [WBNB, USDT, PMT_TOKEN] : [USDT, PMT_TOKEN]
      const amountIn = token === 'BNB' ? parseEther(val) : parseUnits(val, 18)
      const result = await bscClient.readContract({
        address: PANCAKE_V2, abi: ROUTER_ABI, functionName: 'getAmountsOut',
        args: [amountIn, path]
      })
      setPmtOut(formatUnits(result[result.length - 1], 18))
    } catch (e) {
      setPmtOut(null)
    }
    setQuoting(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => getQuote(amount, inputToken), 500)
    return () => clearTimeout(t)
  }, [amount, inputToken, getQuote])

  const handleMax = () => {
    if (inputToken === 'BNB' && bnbBalance) {
      setAmount(Math.max(0, parseFloat(bnbBalance) - 0.005).toFixed(4))
    } else if (inputToken === 'USDT' && usdtBalance) {
      setAmount(parseFloat(usdtBalance).toFixed(2))
    }
  }

  const handleApprove = async () => {
    if (!walletClient) return
    setApproving(true)
    setError(null)
    try {
      const amountIn = parseUnits(amount, 18)
      const hash = await walletClient.writeContract({
        address: USDT, abi: ERC20_ABI, functionName: 'approve',
        args: [PANCAKE_V2, amountIn]
      })
      await bscClient.waitForTransactionReceipt({ hash })
      setNeedsApproval(false)
    } catch (e) {
      setError(e.shortMessage || 'Approval failed')
    }
    setApproving(false)
  }

  const handleSwap = async () => {
    if (!walletClient || !address || !pmtOut) return
    setError(null)
    setLoading(true)
    try {
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200)
      const rawOut = parseUnits(pmtOut, 18)
      const amountOutMin = rawOut - (rawOut * BigInt(Math.floor(slippage * 10000)) / BigInt(10000))

      let hash
      if (inputToken === 'BNB') {
        const amountIn = parseEther(amount)
        hash = await walletClient.writeContract({
          address: PANCAKE_V2, abi: ROUTER_ABI,
          functionName: 'swapExactETHForTokensSupportingFeeOnTransferTokens',
          args: [amountOutMin, [WBNB, USDT, PMT_TOKEN], address, deadline],
          value: amountIn,
        })
      } else {
        const amountIn = parseUnits(amount, 18)
        hash = await walletClient.writeContract({
          address: PANCAKE_V2, abi: ROUTER_ABI,
          functionName: 'swapExactTokensForTokensSupportingFeeOnTransferTokens',
          args: [amountIn, amountOutMin, [USDT, PMT_TOKEN], address, deadline],
        })
      }
      setTxHash(hash)
      setSuccess(true)
    } catch (e) {
      setError(e.shortMessage || e.message?.slice(0, 120) || 'Transaction failed')
    }
    setLoading(false)
  }

  const metaMaskConn = connectors.find(c => c.id === 'metaMask' || c.name === 'MetaMask')
  const wcConn       = connectors.find(c => c.id === 'walletConnect')
  const balance      = inputToken === 'BNB'
    ? (bnbBalance ? parseFloat(bnbBalance).toFixed(4) : null)
    : (usdtBalance ? parseFloat(usdtBalance).toFixed(2) : null)
  const symbol       = inputToken === 'BNB' ? 'BNB' : 'USDT'

  return (
    <div className="video-modal-overlay" onClick={onClose}>
      <div className="swap-modal-box" onClick={e => e.stopPropagation()}>
        <button className="video-modal-close" onClick={onClose}>✕</button>

        {/* Header */}
        <div className="swap-modal-header">
          <div className="swap-modal-title">Buy PMT</div>
          {isConnected && (
            <button className="swap-wallet-badge" onClick={() => disconnect()}>
              <span className="swap-wallet-dot" />
              {shortenAddr(address)}
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
            <a href={`https://bscscan.com/tx/${txHash}`} target="_blank" rel="noreferrer" className="swap-bscscan-link">
              View on BSCScan ↗
            </a>
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

            {/* Input token toggle */}
            <div className="swap-token-toggle">
              {['BNB','USDT'].map(t => (
                <button
                  key={t}
                  className={`swap-toggle-btn${inputToken === t ? ' active' : ''}`}
                  onClick={() => { setInputToken(t); setAmount(t === 'BNB' ? '0.1' : '10'); setPmtOut(null) }}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* You pay */}
            <div className="swap-token-box">
              <div className="swap-token-label-row">
                <span className="swap-token-label">You pay</span>
                {balance && (
                  <span className="swap-balance">
                    Balance: {balance} {symbol}
                    <button className="swap-max-btn" onClick={handleMax}>MAX</button>
                  </span>
                )}
              </div>
              <div className="swap-token-row">
                <input
                  type="number"
                  className="swap-token-input"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.0"
                  min="0" step={inputToken === 'BNB' ? '0.01' : '1'}
                />
                <div className="swap-token-badge">
                  {inputToken === 'BNB'
                    ? <img src="https://assets.pancakeswap.finance/web/chains/56.png" alt="BNB" width={22} height={22} />
                    : <img src="https://assets.pancakeswap.finance/web/native/56.png" onError={e => e.target.style.display='none'} alt="USDT" width={22} height={22} />
                  }
                  {symbol}
                </div>
              </div>
            </div>

            <div className="swap-arrow">↓</div>

            {/* You receive */}
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

            {/* Slippage */}
            <div className="swap-slippage-row">
              <span className="swap-slippage-label">Slippage</span>
              <div className="swap-slippage-options">
                {SLIPPAGE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    className={`swap-slippage-btn${slippage === opt.value ? ' active' : ''}`}
                    onClick={() => setSlippage(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Route */}
            <div className="swap-info-row">
              <span>Route</span>
              <span>{inputToken === 'BNB' ? 'BNB → USDT → PMT' : 'USDT → PMT'}</span>
            </div>
            {pmtOut && !quoting && parseFloat(amount) > 0 && (
              <div className="swap-info-row">
                <span>Rate</span>
                <span>1 {symbol} ≈ {fmtPmt(String(parseFloat(pmtOut) / parseFloat(amount)))} PMT</span>
              </div>
            )}

            {error && <div className="swap-error">{error}</div>}

            {/* Action button */}
            {needsApproval ? (
              <button
                className="lp-btn-primary swap-btn"
                onClick={handleApprove}
                disabled={approving}
                style={{width:'100%',border:'none',cursor:'pointer'}}
              >
                {approving ? 'Approving…' : `Approve USDT`}
              </button>
            ) : (
              <button
                className="lp-btn-primary swap-btn"
                onClick={handleSwap}
                disabled={loading || quoting || !pmtOut || wrongChain || parseFloat(amount) <= 0}
                style={{width:'100%',border:'none',cursor:'pointer'}}
              >
                {loading ? 'Swapping…' : wrongChain ? 'Switch to BSC' : `Swap ${symbol} → PMT`}
              </button>
            )}

            <p className="swap-disclaimer">Powered by PancakeSwap V2 · BSC</p>
          </div>
        )}
      </div>
    </div>
  )
}
