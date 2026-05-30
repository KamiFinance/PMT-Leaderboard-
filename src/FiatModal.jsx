import { useState, useEffect, useCallback, useRef } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { USDT, BSC_CHAIN_ID } from './wagmi.js'

const TRANSAK_API_KEY  = import.meta.env.VITE_TRANSAK_API_KEY || ''
const PMT_ONRAMP       = import.meta.env.VITE_PMT_ONRAMP_CONTRACT || ''
const BSC_RPC          = 'https://bsc-dataseed.binance.org/'

const ONRAMP_ABI = [
  { name: 'buyPMT', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'usdtAmount', type: 'uint256' }, { name: 'minPMTOut', type: 'uint256' }],
    outputs: [] }
]
const ERC20_ABI = [
  { name: 'approve', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ type: 'bool' }] }
]

const rpc = async (to, data) => {
  const r = await fetch(BSC_RPC, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to, data }, 'latest'] })
  })
  const j = await r.json()
  if (j.error) throw new Error(j.error.message)
  return j.result
}

const getUsdtBalance = async (addr) => {
  const d = '0x70a08231' + addr.toLowerCase().replace('0x','').padStart(64,'0')
  const r = await rpc(USDT, d)
  return BigInt('0x' + r.slice(2, 66))
}

const SLIPPAGE = 0.05

const buildTransakUrl = (walletAddress) => {
  const params = new URLSearchParams({
    apiKey: TRANSAK_API_KEY,
    network: 'bsc',
    cryptoCurrencyCode: 'USDT',
    defaultCryptoCurrency: 'USDT',
    walletAddress: walletAddress,
    disableWalletAddressForm: 'true',
    themeColor: 'FFD700',
    backgroundColor: '0D0D12',
    hideMenu: 'true',
    exchangeScreenTitle: 'Buy USDT for PMT',
  })
  return `https://global.transak.com/?${params.toString()}`
}

export default function FiatModal({ onClose, onSwitchToCrypto }) {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()

  const [step, setStep] = useState('intro')
  const [usdtReceived, setUsdtReceived] = useState(0n)
  const [error, setError] = useState(null)
  const [txHash, setTxHash] = useState(null)
  const pollingRef = useRef(null)

  const startPolling = useCallback(async () => {
    if (!address) return
    const baseline = await getUsdtBalance(address)
    pollingRef.current = setInterval(async () => {
      try {
        const bal = await getUsdtBalance(address)
        if (bal > baseline + parseUnits('0.5', 18)) {
          setUsdtReceived(bal - baseline)
          clearInterval(pollingRef.current)
          setStep('convert')
        }
      } catch {}
    }, 4000)
  }, [address])

  useEffect(() => () => clearInterval(pollingRef.current), [])

  const handleStartTransak = async () => {
    await startPolling()
    setStep('transak')
  }

  const handleConvert = async () => {
    if (!walletClient || !address || !PMT_ONRAMP) return
    setError(null)
    const amountIn = usdtReceived

    setStep('approving')
    try {
      await walletClient.writeContract({
        address: USDT, abi: ERC20_ABI, functionName: 'approve',
        args: [PMT_ONRAMP, amountIn]
      })
    } catch (e) {
      setError(e.shortMessage || 'Approval failed')
      setStep('convert')
      return
    }

    setStep('swapping')
    try {
      const minOut = amountIn * BigInt(Math.floor((1 - SLIPPAGE) * 10000)) / BigInt(10000)
      const hash = await walletClient.writeContract({
        address: PMT_ONRAMP, abi: ONRAMP_ABI, functionName: 'buyPMT',
        args: [amountIn, minOut]
      })
      setTxHash(hash)
      setStep('success')
    } catch (e) {
      setError(e.shortMessage || 'Swap failed')
      setStep('convert')
    }
  }

  const fmtUsdt = (v) => v ? parseFloat(formatUnits(v, 18)).toFixed(2) : '0.00'

  return (
    <div className="video-modal-overlay" onClick={onClose}>
      <div className="swap-modal-box" onClick={e => e.stopPropagation()}
        style={{maxWidth: step === 'transak' ? 500 : 420}}>
        <button className="video-modal-close" onClick={onClose}>✕</button>

        <div className="swap-modal-header">
          <div className="swap-modal-title">Buy PMT with Card</div>
          {isConnected && step !== 'transak' && (
            <button className="swap-wallet-badge">
              <span className="swap-wallet-dot" />
              {address?.slice(0,6)}...{address?.slice(-4)}
            </button>
          )}
        </div>

        {step === 'intro' && (
          <div className="fiat-intro">
            <div className="fiat-steps-row">
              <div className="fiat-step">
                <div className="fiat-step-num">1</div>
                <div className="fiat-step-label">Pay with card</div>
                <div className="fiat-step-desc">Card, bank transfer, Apple/Google Pay</div>
              </div>
              <div className="fiat-step-arrow">→</div>
              <div className="fiat-step">
                <div className="fiat-step-num">2</div>
                <div className="fiat-step-label">USDT arrives</div>
                <div className="fiat-step-desc">Sent to your BSC wallet</div>
              </div>
              <div className="fiat-step-arrow">→</div>
              <div className="fiat-step">
                <div className="fiat-step-num">3</div>
                <div className="fiat-step-label">Get PMT</div>
                <div className="fiat-step-desc">Auto-swapped via smart contract</div>
              </div>
            </div>

            {!isConnected ? (
              <div className="fiat-no-wallet">
                <p>Connect your wallet first to continue.</p>
                <button className="lp-btn-primary" onClick={onSwitchToCrypto}
                  style={{border:'none',cursor:'pointer',padding:'12px 24px'}}>
                  Connect Wallet →
                </button>
              </div>
            ) : (
              <>
                <button className="lp-btn-primary swap-btn" onClick={handleStartTransak}
                  style={{width:'100%',border:'none',cursor:'pointer'}}>
                  💳 Continue to Payment
                </button>
                <p className="swap-disclaimer">KYC + payment handled by Transak · Powered by Public Masterpiece</p>
              </>
            )}
          </div>
        )}

        {step === 'transak' && (
          <div style={{padding:'0 0 20px'}}>
            <iframe
              src={buildTransakUrl(address)}
              allow="camera;microphone;payment"
              style={{width:'100%',height:600,border:'none',borderRadius:'0 0 20px 20px'}}
              title="Transak Onramp"
            />
          </div>
        )}

        {step === 'convert' && (
          <div className="fiat-convert">
            <div className="fiat-received-badge">
              <span className="fiat-check">✓</span>
              <div>
                <div className="fiat-received-amount">${fmtUsdt(usdtReceived)} USDT received</div>
                <div className="fiat-received-sub">Ready to convert to PMT</div>
              </div>
            </div>
            {error && <div className="swap-error" style={{margin:'0 24px 8px'}}>{error}</div>}
            <div style={{padding:'0 24px 24px'}}>
              <button className="lp-btn-primary swap-btn" onClick={handleConvert}
                style={{width:'100%',border:'none',cursor:'pointer'}}>
                Convert USDT → PMT
              </button>
              <p className="swap-disclaimer" style={{marginTop:8}}>Smart contract swap · No custody · Powered by Public Masterpiece</p>
            </div>
          </div>
        )}

        {step === 'approving' && (
          <div className="swap-success" style={{padding:'32px 24px'}}>
            <div className="swap-success-icon" style={{background:'rgba(255,215,0,0.15)',color:'#FFD700'}}>⏳</div>
            <h3>Approving USDT…</h3>
            <p>Confirm the approval in your wallet.</p>
          </div>
        )}

        {step === 'swapping' && (
          <div className="swap-success" style={{padding:'32px 24px'}}>
            <div className="swap-success-icon" style={{background:'rgba(255,215,0,0.15)',color:'#FFD700'}}>⚡</div>
            <h3>Converting to PMT…</h3>
            <p>Your USDT is being swapped on-chain.</p>
          </div>
        )}

        {step === 'success' && (
          <div className="swap-success">
            <div className="swap-success-icon">✓</div>
            <h3>PMT in your wallet!</h3>
            <p>The swap completed successfully.</p>
            <a href={`https://bscscan.com/tx/${txHash}`} target="_blank" rel="noreferrer" className="swap-bscscan-link">
              View on BSCScan ↗
            </a>
            <button className="lp-btn-primary" onClick={onClose}
              style={{width:'100%',border:'none',cursor:'pointer',marginTop:8}}>Done</button>
          </div>
        )}
      </div>
    </div>
  )
}
