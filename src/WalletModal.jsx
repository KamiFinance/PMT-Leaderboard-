import { useState, useEffect } from 'react'

const METAMASK_ICON = <svg viewBox="0 0 318 318" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:36,height:36}}><path d="M274.1 35.5L174.6 109l18.8-44.5 80.7-29z" fill="#E2761B" stroke="#E2761B"/><path d="M44.4 35.5l98.7 74.2-17.9-45.2-80.8-29zM238.3 206.8l-26.5 40.6 56.7 15.6 16.3-55.3-46.5-.9zM33.9 207.7l16.2 55.3 56.7-15.6-26.5-40.6-46.4.9z" fill="#E4761B" stroke="#E4761B"/><path d="M103.6 138.2L87.8 162l56.2 2.5-2-60.5-38.4 34.2zM214.9 138.2l-38.9-34.9-1.3 61.2 56.2-2.5-16-23.8zM106.8 247.4l33.8-16.5-29.2-22.8-4.6 39.3zM177.9 230.9l33.9 16.5-4.7-39.3-29.2 22.8z" fill="#E4761B" stroke="#E4761B"/><path d="M211.8 247.4L177.9 230.9l2.8 22.9-.3 9.5 31.4-16zM106.8 247.4l31.4 16-.2-9.5 2.7-22.9-33.9 16.4z" fill="#D7C1B3" stroke="#D7C1B3"/><path d="M138.8 193.5l-28.2-8.3 19.9-9.1 8.3 17.4zM179.7 193.5l8.3-17.4 20 9.1-28.3 8.3z" fill="#233447" stroke="#233447"/><path d="M106.8 247.4l4.8-40.6-31.2.9 26.4 39.7zM206.9 206.8l4.8 40.6 26.5-39.7-31.3-.9zM231.3 162l-56.2 2.5 5.2 29 8.3-17.4 20 9.1 22.7-23.2zM110.6 185.2l20-9.1 8.2 17.4 5.3-29-56.2-2.5 22.7 23.2z" fill="#CD6116" stroke="#CD6116"/><path d="M87.8 162l29.7 57.9-1-34.7L87.8 162zM201.1 185.2l-1.1 34.7 29.7-57.9-28.6 23.2zM143.9 164.5l-5.3 29 6.6 34.1 1.5-44.9-2.8-18.2zM175.1 164.5l-2.7 18.1 1.4 45 6.6-34.1-5.3-29z" fill="#E4751F" stroke="#E4751F"/><path d="M179.7 193.5l-6.6 34.1 4.8 3.3 29.2-22.8 1.1-34.7-28.5 20.1zM110.6 185.2l1 34.7 29.2 22.8 4.8-3.3-6.6-34.1-28.4-20.1z" fill="#F6851B" stroke="#F6851B"/><path d="M180 263.3l.3-9.5-2.6-2.2h-38.8l-2.5 2.2.2 9.5-31.4-16 11 9 22.3 15.5h38.3l22.4-15.5 10.9-9-30.1 16z" fill="#C0AD9E" stroke="#C0AD9E"/><path d="M177.9 230.9l-4.8-3.3h-26.7l-4.8 3.3-2.7 22.9 2.5-2.2h38.8l2.6 2.2-2.9-22.9z" fill="#161616" stroke="#161616"/><path d="M278.3 114.2l8.5-40.9-12.7-37.8-96.2 71.4 37 31.3 52.3 15.3 11.6-13.5-5-3.6 8-7.3-6.2-4.8 8-6.1-5.3-4zM31.8 73.3l8.5 40.9-5.4 4 8 6.1-6.1 4.8 8 7.3-5 3.6 11.5 13.5 52.3-15.3 37-31.3-96.2-71.4-12.6 37.8z" fill="#763D16" stroke="#763D16"/><path d="M261.2 153.5l-52.3-15.3 16 23.8-29.7 57.9 39.2-.5h58.5l-31.7-65.9zM57.3 153.5l-31.8 65.9h58.4l39.2.5-29.7-57.9 16-23.8-52.1 15.3z" fill="#F6851B" stroke="#F6851B"/><path d="M103.6 138.2l-10.4 19.6 19.4 45.4 4.6-39.3-13.6-25.7zM214.9 138.2l-13.8 25.7 4.8 39.3 19.4-45.4-10.4-19.6z" fill="#E4761B" stroke="#E4761B"/><path d="M175.1 164.5l-5.2-29.5-3.4 26-5.1 0 .1 0-3.4-26-5.3 29.5-2.8 18.1 1.4 45 6.6-34.1.2-1.2h12.8l.2 1.2 6.6 34.1 1.4-45-2.8-18.1z" fill="#F6851B" stroke="#F6851B"/></svg>

const TRUST_ICON = <svg viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:36,height:36}}><circle cx="512" cy="512" r="512" fill="#3375BB"/><path d="M512 128l256 96v256c0 154.24-109.227 298.027-256 352C365.227 778.027 256 634.24 256 480V224l256-96z" fill="white"/><path d="M512 256l160 60v160c0 96.4-68.267 186.267-160 220-91.733-33.733-160-123.6-160-220V316l160-60z" fill="#3375BB"/></svg>

const COINBASE_ICON = <svg viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:36,height:36}}><circle cx="512" cy="512" r="512" fill="#0052FF"/><path d="M512 192c176.731 0 320 143.269 320 320s-143.269 320-320 320S192 688.731 192 512 335.269 192 512 192zm0 128a64 64 0 100 128 64 64 0 000-128zm0 64a192 192 0 100 384 192 192 0 000-384zm0 64a128 128 0 110 256 128 128 0 010-256z" fill="white"/></svg>

const WC_ICON = <svg viewBox="0 0 300 185" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:36,height:36}}><rect width="300" height="185" rx="40" fill="#3B99FC"/><path d="M61.4 57.1c48.9-47.9 128.3-47.9 177.3 0l5.9 5.8a6 6 0 010 8.6L225 91.1a3.2 3.2 0 01-4.4 0l-8.1-8c-34.1-33.4-89.4-33.4-123.5 0l-8.7 8.5a3.2 3.2 0 01-4.4 0L56.3 71.9a6 6 0 010-8.6l5.1-6.2zm219 40.8l19.5 19.1a6 6 0 010 8.6l-88 86.2a6.3 6.3 0 01-8.9 0l-62.4-61.1a1.6 1.6 0 00-2.2 0l-62.4 61.1a6.3 6.3 0 01-8.9 0L19.4 125.6a6 6 0 010-8.6l19.5-19.1a6.3 6.3 0 018.9 0l62.5 61.2a1.6 1.6 0 002.2 0l62.4-61.2a6.3 6.3 0 018.9 0l62.5 61.2a1.6 1.6 0 002.2 0l62.5-61.2a6.3 6.3 0 018.9 0z" fill="white"/></svg>

const WALLETS = [
  { id: 'metamask',   name: 'MetaMask',       icon: METAMASK_ICON,  desc: 'Browser extension' },
  { id: 'trust',      name: 'Trust Wallet',   icon: TRUST_ICON,     desc: 'Mobile & extension' },
  { id: 'coinbase',   name: 'Coinbase Wallet',icon: COINBASE_ICON,  desc: 'Browser extension' },
  { id: 'walletconnect', name: 'WalletConnect', icon: WC_ICON,      desc: 'Any mobile wallet' },
]

export default function WalletModal({ onSuccess, onClose }) {
  const [status, setStatus]   = useState('idle')    // idle|connecting|denied|error|noWallet
  const [addr, setAddr]       = useState('')
  const [errMsg, setErrMsg]   = useState('')

  // Close on Escape
  useEffect(() => {
    const fn = (e) => { if(e.key==='Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  const connect = async (walletId) => {
    if(walletId === 'walletconnect'){
      setStatus('error')
      setErrMsg('WalletConnect coming soon. Please use MetaMask or Trust Wallet.')
      return
    }

    if(!window.ethereum){
      // Try mobile deep links
      if(walletId === 'trust'){
        window.open(`https://link.trustwallet.com/open_url?coin_id=20000714&url=${encodeURIComponent(window.location.href)}`, '_blank')
      } else {
        window.open('https://metamask.io/download/', '_blank')
      }
      setStatus('noWallet')
      return
    }

    setStatus('connecting')
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      const connected = accounts[0].toLowerCase()
      setAddr(connected)

      // Fetch wallet list from wallets.json
      const res  = await fetch(`${import.meta.env.BASE_URL}wallets.json`)
      const list = await res.json()
      const allowed = list.map(w => w.toLowerCase())

      if(allowed.includes(connected)){
        setStatus('success')
        setTimeout(() => onSuccess(), 1200)
      } else {
        setStatus('denied')
      }
    } catch(err) {
      if(err.code === 4001){
        setStatus('error')
        setErrMsg('Connection rejected. Please try again.')
      } else {
        setStatus('error')
        setErrMsg('Connection failed. Please try again.')
      }
    }
  }

  return (
    <div className="wm-overlay" onClick={(e)=>e.target.classList.contains('wm-overlay')&&onClose()}>
      <div className="wm-modal">

        {/* Header */}
        <div className="wm-header">
          <div className="wm-title">
            {status==='idle' && 'Connect Wallet'}
            {status==='connecting' && 'Connecting…'}
            {status==='success' && '✓ Access Granted'}
            {status==='denied' && '🚫 Access Denied'}
            {status==='error' && 'Error'}
            {status==='noWallet' && 'Wallet Not Found'}
          </div>
          <button className="wm-close" onClick={onClose}>✕</button>
        </div>

        {/* Idle — choose wallet */}
        {status==='idle' && (
          <div className="wm-body">
            <p className="wm-subtitle">Choose your wallet to verify membership</p>
            <div className="wm-wallets">
              {WALLETS.map(w=>(
                <button key={w.id} className="wm-wallet-btn" onClick={()=>connect(w.id)}>
                  <span className="wm-wallet-icon">{w.icon}</span>
                  <span className="wm-wallet-info">
                    <span className="wm-wallet-name">{w.name}</span>
                    <span className="wm-wallet-desc">{w.desc}</span>
                  </span>
                  <span className="wm-wallet-arrow">→</span>
                </button>
              ))}
            </div>
            <p className="wm-note">Only PMT Millionaires Club members get access</p>
          </div>
        )}

        {/* Connecting */}
        {status==='connecting' && (
          <div className="wm-body wm-centered">
            <div className="wm-spinner"/>
            <p className="wm-subtitle">Approve the connection in your wallet…</p>
          </div>
        )}

        {/* Success */}
        {status==='success' && (
          <div className="wm-body wm-centered">
            <div className="wm-success-icon">✓</div>
            <p className="wm-subtitle" style={{color:'#4CAF50'}}>Welcome, Millionaire!</p>
            <p className="wm-addr">{addr.slice(0,6)}…{addr.slice(-4)}</p>
            <p className="wm-note">Redirecting to leaderboard…</p>
          </div>
        )}

        {/* Denied */}
        {status==='denied' && (
          <div className="wm-body wm-centered">
            <div className="wm-denied-icon">🚫</div>
            <p className="wm-subtitle">Members Only</p>
            <p className="wm-note" style={{maxWidth:280,textAlign:'center',lineHeight:1.6}}>
              The connected wallet <strong style={{color:'rgba(255,255,255,.7)'}}>{addr.slice(0,6)}…{addr.slice(-4)}</strong> is not a Millionaires Club member.
              <br/><br/>Hold at least <strong style={{color:'#FFD700'}}>1,000,000 PMT</strong> to qualify.
            </p>
            <button className="wm-btn-retry" onClick={()=>setStatus('idle')}>Try another wallet</button>
          </div>
        )}

        {/* Error */}
        {(status==='error'||status==='noWallet') && (
          <div className="wm-body wm-centered">
            <div className="wm-denied-icon">⚠</div>
            <p className="wm-subtitle">
              {status==='noWallet' ? 'No wallet detected' : 'Something went wrong'}
            </p>
            <p className="wm-note" style={{textAlign:'center',lineHeight:1.6}}>
              {status==='noWallet'
                ? 'Opening wallet app… If nothing happened, please install MetaMask or Trust Wallet.'
                : errMsg}
            </p>
            <button className="wm-btn-retry" onClick={()=>setStatus('idle')}>Try again</button>
          </div>
        )}

      </div>
    </div>
  )
}
