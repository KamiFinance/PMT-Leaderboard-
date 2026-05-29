import { useState, useEffect, useCallback } from 'react'
import {
  useAccount, useConnect, useDisconnect,
  useSwitchChain, usePublicClient, useWalletClient
} from 'wagmi'
import { parseEther, formatEther, formatUnits, encodeFunctionData } from 'viem'
import { PMT_TOKEN, WBNB, PANCAKE_V2, BSC_CHAIN_ID } from './wagmi.js'

const ROUTER_ABI = [
  { name: 'getAmountsOut', type: 'function', stateMutability: 'view',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'path', type: 'address[]' }
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }]
  },
  { name: 'swapExactETHForTokensSupportingFeeOnTransferTokens', type: 'function', stateMutability: 'payable',
    inputs: [
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' }
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }]
  }
]

const shortenAddr = a => `${a.slice(0,6)}...${a.slice(-4)}`
const SLIPPAGE = 0.12 // 12% default for PMT (high slippage token)

export default function SwapModal({ onClose }) {
  const { address, isConnected, chain } = useAccount()
  const { connect, connectors, isPending: isConnecting } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()
  const publicClient = usePublicClient({ chainId: BSC_CHAIN_ID })
  const { data: walletClient } = useWalletClient()

  const [bnbAmount, setBnbAmount] = useState('0.1')
  const [pmtOut, setPmtOut] = useState(null)
  const [loading, setLoading] = useState(false)
  const [quoting, setQuoting] = useState(false)
  const [txHash, setTxHash] = useState(null)
  const [error, setError] = useState(null)
  const [step, setStep] = useState('swap') // 'connect' | 'swap' | 'confirm' | 'success'

  const wrongChain = isConnected && chain?.id !== BSC_CHAIN_ID

  // Quote price
  const getQuote = useCallback(async (val) => {
    const num = parseFloat(val)
    if (!num || num <= 0 || !publicClient) { setPmtOut(null); return }
    setQuoting(true)
    try {
      const amountIn = parseEther(val)
      const result = await publicClient.readContract({
        address: PANCAKE_V2,
        abi: ROUTER_ABI,
        functionName: 'getAmountsOut',
        args: [amountIn, [WBNB, PMT_TOKEN]]
      })
      const rawOut = result[1]
      setPmtOut(formatUnits(rawOut, 18))
    } catch {
      setPmtOut(null)
    }
    setQuoting(false)
  }, [publicClient])

  useEffect(() => {
    const t = setTimeout(() => getQuote(bnbAmount), 400)
    return () => clearTimeout(t)
  }, [bnbAmount, getQuote])

  const handleSwap = async () => {
    if (!walletClient || !address || !pmtOut) return
    setError(null)
    setLoading(true)
    try {
      const amountIn = parseEther(bnbAmount)
      const rawOut = parseEther(pmtOut)
      const amountOutMin = rawOut * BigInt(Math.floor((1 - SLIPPAGE) * 10000)) / BigInt(10000)
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200)

      const hash = await walletClient.writeContract({
        address: PANCAKE_V2,
        abi: ROUTER_ABI,
        functionName: 'swapExactETHForTokensSupportingFeeOnTransferTokens',
        args: [amountOutMin, [WBNB, PMT_TOKEN], address, deadline],
        value: amountIn,
        chain: { id: BSC_CHAIN_ID }
      })
      setTxHash(hash)
      setStep('success')
    } catch (e) {
      setError(e.shortMessage || e.message || 'Transaction failed')
    }
    setLoading(false)
  }

  const pmtFormatted = pmtOut
    ? parseFloat(pmtOut) >= 1e6
      ? `${(parseFloat(pmtOut)/1e6).toFixed(2)}M`
      : parseFloat(pmtOut) >= 1e3
        ? `${(parseFloat(pmtOut)/1e3).toFixed(2)}K`
        : parseFloat(pmtOut).toFixed(2)
    : null

  const metaMaskConn = connectors.find(c => c.name === 'MetaMask' || c.id === 'metaMask')
  const wcConn       = connectors.find(c => c.id === 'walletConnect')

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

        {/* Wrong chain banner */}
        {wrongChain && (
          <div className="swap-wrong-chain">
            <span>⚠ Switch to BSC to swap</span>
            <button onClick={() => switchChain({ chainId: BSC_CHAIN_ID })}>Switch</button>
          </div>
        )}

        {step === 'success' ? (
          <div className="swap-success">
            <div className="swap-success-icon">✓</div>
            <h3>Swap Submitted!</h3>
            <p>Your transaction has been sent to the BSC network.</p>
            <a
              href={`https://bscscan.com/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="swap-bscscan-link"
            >
              View on BSCScan ↗
            </a>
            <button className="lp-btn-primary" onClick={onClose} style={{width:'100%',border:'none',cursor:'pointer',marginTop:8}}>
              Close
            </button>
          </div>
        ) : !isConnected ? (
          <div className="swap-connect-section">
            <p className="swap-connect-hint">Connect your wallet to swap BNB → PMT</p>
            <div className="swap-connectors">
              {metaMaskConn && (
                <button
                  className="swap-connector-btn"
                  onClick={() => connect({ connector: metaMaskConn })}
                  disabled={isConnecting}
                >
                  <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask" />
                  MetaMask
                </button>
              )}
              {wcConn && (
                <button
                  className="swap-connector-btn"
                  onClick={() => connect({ connector: wcConn })}
                  disabled={isConnecting}
                >
                  <svg viewBox="0 0 40 25" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="18">
                    <path d="M8.19 4.45c6.52-6.38 17.1-6.38 23.62 0l.79.77a.81.81 0 0 1 0 1.16l-2.7 2.64a.43.43 0 0 1-.59 0l-1.08-1.06C24.05 3.9 16 3.9 11.76 7.96L10.6 9.07a.43.43 0 0 1-.59 0L7.32 6.43a.81.81 0 0 1 0-1.16l.87-.82Zm29.17 5.44 2.4 2.35a.81.81 0 0 1 0 1.16L28.93 24.07a.86.86 0 0 1-1.19 0l-8.3-8.12a.21.21 0 0 0-.3 0l-8.3 8.12a.86.86 0 0 1-1.19 0L.82 13.4a.81.81 0 0 1 0-1.16l2.4-2.35a.86.86 0 0 1 1.19 0l8.3 8.12c.08.08.21.08.3 0l8.3-8.12a.86.86 0 0 1 1.19 0l8.3 8.12c.08.08.21.08.3 0l8.3-8.12a.86.86 0 0 1 1.18 0Z" fill="#3B99FC"/>
                  </svg>
                  WalletConnect
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="swap-form">
            {/* From */}
            <div className="swap-token-box">
              <div className="swap-token-label">You pay</div>
              <div className="swap-token-row">
                <input
                  type="number"
                  className="swap-token-input"
                  value={bnbAmount}
                  onChange={e => setBnbAmount(e.target.value)}
                  placeholder="0.0"
                  min="0"
                  step="0.01"
                />
                <div className="swap-token-badge">
                  <img src="https://assets.pancakeswap.finance/web/chains/56.png" alt="BNB" width={22} height={22} />
                  BNB
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="swap-arrow">↓</div>

            {/* To */}
            <div className="swap-token-box">
              <div className="swap-token-label">You receive (est.)</div>
              <div className="swap-token-row">
                <div className="swap-token-output">
                  {quoting ? <span className="swap-quoting">…</span> : pmtFormatted || '—'}
                </div>
                <div className="swap-token-badge">
                  <img src="https://raw.githubusercontent.com/KamiFinance/PMT-Leaderboard-/main/public/PMT-logo.png" alt="PMT" width={22} height={22} style={{borderRadius:'50%'}} />
                  PMT
                </div>
              </div>
            </div>

            {/* Info row */}
            <div className="swap-info-row">
              <span>Slippage</span>
              <span>{(SLIPPAGE * 100).toFixed(0)}%</span>
            </div>
            {pmtFormatted && (
              <div className="swap-info-row">
                <span>Rate</span>
                <span>1 BNB ≈ {quoting ? '…' : pmtFormatted && bnbAmount ? ((parseFloat(pmtOut)/parseFloat(bnbAmount)/1e6).toFixed(2) + 'M PMT') : '—'}</span>
              </div>
            )}

            {error && <div className="swap-error">{error}</div>}

            <button
              className="lp-btn-primary swap-btn"
              onClick={handleSwap}
              disabled={loading || quoting || !pmtOut || wrongChain || parseFloat(bnbAmount) <= 0}
              style={{width:'100%',border:'none',cursor:'pointer'}}
            >
              {loading ? 'Swapping…' : wrongChain ? 'Switch to BSC' : 'Swap BNB → PMT'}
            </button>

            <p className="swap-disclaimer">
              Powered by PancakeSwap V2 · BSC
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
