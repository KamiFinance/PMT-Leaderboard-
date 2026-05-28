import { useState, useEffect, useRef } from 'react'

const PROJECT_ID = 'c2dba76201be08a0906f59f4d416129b'

const METAMASK_ICON = <svg viewBox="0 0 318 318" fill="none" style={{width:36,height:36}}><path d="M274.1 35.5L174.6 109l18.8-44.5 80.7-29z" fill="#E2761B"/><path d="M44.4 35.5l98.7 74.2-17.9-45.2-80.8-29zM238.3 206.8l-26.5 40.6 56.7 15.6 16.3-55.3-46.5-.9zM33.9 207.7l16.2 55.3 56.7-15.6-26.5-40.6-46.4.9z" fill="#E4761B"/><path d="M179.7 193.5l8.3-17.4 20 9.1-28.3 8.3zM138.8 193.5l-28.2-8.3 19.9-9.1 8.3 17.4z" fill="#233447"/><path d="M106.8 247.4l4.8-40.6-31.2.9 26.4 39.7zM206.9 206.8l4.8 40.6 26.5-39.7-31.3-.9z" fill="#CD6116"/><path d="M211.8 247.4L177.9 230.9l2.8 22.9-.3 9.5 31.4-16zM106.8 247.4l31.4 16-.2-9.5 2.7-22.9-33.9 16.4z" fill="#D7C1B3"/></svg>

const TRUST_ICON = <svg viewBox="0 0 1024 1024" fill="none" style={{width:36,height:36}}><circle cx="512" cy="512" r="512" fill="#3375BB"/><path d="M512 128l256 96v256c0 154.24-109.227 298.027-256 352C365.227 778.027 256 634.24 256 480V224l256-96z" fill="white"/><path d="M512 256l160 60v160c0 96.4-68.267 186.267-160 220-91.733-33.733-160-123.6-160-220V316l160-60z" fill="#3375BB"/></svg>

const COINBASE_ICON = <svg viewBox="0 0 1024 1024" fill="none" style={{width:36,height:36}}><circle cx="512" cy="512" r="512" fill="#0052FF"/><path d="M512 192c176.731 0 320 143.269 320 320s-143.269 320-320 320S192 688.731 192 512 335.269 192 512 192zm0 192a128 128 0 100 256 128 128 0 000-256z" fill="white"/></svg>

const WC_ICON = <svg viewBox="0 0 300 185" fill="none" style={{width:36,height:36}}><rect width="300" height="185" rx="40" fill="#3B99FC"/><path d="M61.4 57.1c48.9-47.9 128.3-47.9 177.3 0l5.9 5.8a6 6 0 010 8.6L225 91.1a3.2 3.2 0 01-4.4 0l-8.1-8c-34.1-33.4-89.4-33.4-123.5 0l-8.7 8.5a3.2 3.2 0 01-4.4 0L56.3 71.9a6 6 0 010-8.6l5.1-6.2zm219 40.8l19.5 19.1a6 6 0 010 8.6l-88 86.2a6.3 6.3 0 01-8.9 0l-62.4-61.1a1.6 1.6 0 00-2.2 0l-62.4 61.1a6.3 6.3 0 01-8.9 0L19.4 125.6a6 6 0 010-8.6l19.5-19.1a6.3 6.3 0 018.9 0l62.5 61.2a1.6 1.6 0 002.2 0l62.4-61.2a6.3 6.3 0 018.9 0l62.5 61.2a1.6 1.6 0 002.2 0l62.5-61.2a6.3 6.3 0 018.9 0z" fill="white"/></svg>

const WALLETS = [
  { id:'metamask',      name:'MetaMask',        icon:METAMASK_ICON,  desc:'Browser extension' },
  { id:'trust',         name:'Trust Wallet',    icon:TRUST_ICON,     desc:'Mobile & extension' },
  { id:'coinbase',      name:'Coinbase Wallet', icon:COINBASE_ICON,  desc:'Browser extension' },
  { id:'walletconnect', name:'WalletConnect',   icon:WC_ICON,        desc:'Any mobile wallet — scan QR' },
]

const checkAccess = async (address) => {
  const res  = await fetch(`${import.meta.env.BASE_URL}wallets.json`)
  const list = await res.json()
  return list.map(w => w.toLowerCase()).includes(address.toLowerCase())
}

export default function WalletModal({ onSuccess, onClose }) {
  const [status, setStatus]     = useState('idle')
  const [addr, setAddr]         = useState('')
  const [errMsg, setErrMsg]     = useState('')
  const [walletId, setWalletId] = useState('')
  const wcRef                   = useRef(null)

  useEffect(() => {
    const fn = (e) => { if(e.key==='Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => { window.removeEventListener('keydown', fn) }
  }, [onClose])

  const finish = async (address) => {
    const allowed = await checkAccess(address)
    setAddr(address)
    if(allowed){ setStatus('success'); setTimeout(()=>onSuccess(), 1200) }
    else setStatus('denied')
  }

  const connect = async (walletId) => {
    setWalletId(walletId)

    // ── Browser extension wallets (MetaMask, Trust, Coinbase) ──────────────
    if(walletId !== 'walletconnect') {
      if(!window.ethereum) {
        const links = {
          metamask: 'https://metamask.io/download/',
          trust:    `https://link.trustwallet.com/open_url?coin_id=20000714&url=${encodeURIComponent(window.location.href)}`,
          coinbase: 'https://www.coinbase.com/wallet/downloads',
        }
        window.open(links[walletId]||links.metamask, '_blank')
        setStatus('noWallet')
        return
      }

      // IMPORTANT: call eth_requestAccounts FIRST — before any state updates
      // so MetaMask receives it within the user-gesture context and opens its popup
      let accountsPromise
      try {
        accountsPromise = window.ethereum.request({ method: 'eth_requestAccounts' })
      } catch(e) {
        setErrMsg('Could not reach wallet. Please try again.')
        setStatus('error')
        return
      }

      setStatus('connecting')

      try {
        const accounts = await accountsPromise
        if(!accounts?.[0]) throw new Error('No account returned')
        await finish(accounts[0])
      } catch(err) {
        if(err.code===4001||err.message?.includes('rejected')||err.message?.includes('denied')){
          setErrMsg('Connection rejected. Please try again.')
        } else {
          setErrMsg('Connection failed: ' + (err.message||'Unknown error'))
        }
        setStatus('error')
      }
      return
    }

    // ── WalletConnect ───────────────────────────────────────────────────────
    setStatus('connecting')
    try {
      const { EthereumProvider } = await import('https://esm.sh/@walletconnect/ethereum-provider@2.17.0')
      const provider = await EthereumProvider.init({
        projectId: PROJECT_ID,
        chains: [56],
        showQrModal: true,
        qrModalOptions: {
          themeMode: 'dark',
          themeVariables: { '--wcm-accent-color': '#FFD700', '--wcm-background-color': '#0e0d09' }
        },
        metadata: {
          name: 'PMT Millionaires Club',
          description: 'The elite holders of the PMT ecosystem.',
          url: window.location.origin,
          icons: [`${window.location.origin}/PMT-logo.png`]
        }
      })
      wcRef.current = provider
      await provider.connect()
      const accounts = await provider.request({ method: 'eth_accounts' })
      if(!accounts?.[0]) throw new Error('No account')
      await finish(accounts[0])
    } catch(err) {
      if(err.message?.includes('Modal closed')||err.message?.includes('User closed')||err.message?.includes('close')){
        setStatus('idle'); return
      }
      setErrMsg('WalletConnect failed: ' + (err.message||'Unknown error'))
      setStatus('error')
    }
  }

  const isWCConnecting = walletId==='walletconnect' && status==='connecting'

  return (
    <div className="wm-overlay" style={{background:isWCConnecting?'transparent':'rgba(0,0,0,.75)',backdropFilter:isWCConnecting?'none':'blur(6px)',WebkitBackdropFilter:isWCConnecting?'none':'blur(6px)',pointerEvents:isWCConnecting?'none':'auto'}} onClick={(e)=>e.target.classList.contains('wm-overlay')&&!isWCConnecting&&onClose()}>
      <div className="wm-modal" style={{display:isWCConnecting?'none':'block'}}>

        <div className="wm-header">
          <div className="wm-title">
            {status==='idle'&&'Connect Wallet'}
            {status==='connecting'&&'Connecting…'}
            {status==='success'&&'✓ Access Granted'}
            {status==='denied'&&'🚫 Members Only'}
            {(status==='error'||status==='noWallet')&&'Connection Error'}
          </div>
          <button className="wm-close" onClick={onClose}>✕</button>
        </div>

        {status==='idle'&&(
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

        {status==='connecting'&&(
          <div className="wm-body wm-centered">
            <div className="wm-spinner"/>
            <p className="wm-subtitle">Approve the connection in your wallet…</p>
          </div>
        )}

        {status==='success'&&(
          <div className="wm-body wm-centered">
            <div className="wm-success-icon">✓</div>
            <p className="wm-subtitle" style={{color:'#4CAF50'}}>Welcome, Millionaire!</p>
            <p className="wm-addr">{addr.slice(0,6)}…{addr.slice(-4)}</p>
            <p className="wm-note">Redirecting to leaderboard…</p>
          </div>
        )}

        {status==='denied'&&(
          <div className="wm-body wm-centered">
            <div className="wm-denied-icon">🚫</div>
            <p className="wm-subtitle">Members Only</p>
            <p className="wm-note" style={{maxWidth:280,textAlign:'center',lineHeight:1.7}}>
              Wallet <strong style={{color:'rgba(255,255,255,.7)'}}>{addr.slice(0,6)}…{addr.slice(-4)}</strong> is not a Millionaires Club member.
              <br/><br/>Hold at least <strong style={{color:'#FFD700'}}>1,000,000 PMT</strong> to qualify.
            </p>
            <button className="wm-btn-retry" onClick={()=>setStatus('idle')}>Try another wallet</button>
          </div>
        )}

        {(status==='error'||status==='noWallet')&&(
          <div className="wm-body wm-centered">
            <div className="wm-denied-icon">⚠</div>
            <p className="wm-subtitle">{status==='noWallet'?'No wallet detected':'Something went wrong'}</p>
            <p className="wm-note" style={{textAlign:'center',lineHeight:1.6,maxWidth:280}}>
              {status==='noWallet'?'Opening wallet app… Install MetaMask or Trust Wallet if nothing happened.':errMsg}
            </p>
            <button className="wm-btn-retry" onClick={()=>setStatus('idle')}>Try again</button>
          </div>
        )}

      </div>
    </div>
  )
}
