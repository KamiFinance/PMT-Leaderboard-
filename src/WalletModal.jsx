import { useState, useEffect, useRef } from 'react'
import MetaMaskSDK from '@metamask/sdk'

const PROJECT_ID = 'c2dba76201be08a0906f59f4d416129b'
const WC_FLAG_KEY = 'pmt_wc_pending'

const METAMASK_ICON = <svg viewBox="0 0 35 33" fill="none" style={{width:36,height:36}}><path d="M32.9 1L19.4 10.7l2.4-5.7L32.9 1z" fill="#E2761B"/><path d="M2.1 1l13.4 9.8-2.3-5.8L2.1 1zm23.9 22.5l-3.6 5.5 7.7 2.1 2.2-7.5-6.3-.1zm-24.1.1L4.1 31.1l7.7-2.1-3.6-5.5-6.3.1z" fill="#E4761B"/></svg>
const TRUST_ICON = <svg viewBox="0 0 24 24" fill="none" style={{width:36,height:36}}><circle cx="12" cy="12" r="12" fill="#3375BB"/><path d="M12 3l7 2.6v7c0 4.3-3.1 8.3-7 9.7C8.1 21 5 17 5 12.6V5.6L12 3z" fill="white" opacity=".9"/></svg>
const COINBASE_ICON = <svg viewBox="0 0 24 24" fill="none" style={{width:36,height:36}}><circle cx="12" cy="12" r="12" fill="#0052FF"/><circle cx="12" cy="12" r="7" fill="white" opacity=".9"/><circle cx="12" cy="12" r="4" fill="#0052FF"/><circle cx="12" cy="12" r="2" fill="white"/></svg>
const WC_ICON = <svg viewBox="0 0 24 24" fill="none" style={{width:36,height:36}}><rect width="24" height="24" rx="6" fill="#3B99FC"/><path d="M5.2 9.3c3.7-3.6 9.6-3.6 13.3 0l.4.4a.4.4 0 010 .6l-1.5 1.5a.2.2 0 01-.3 0l-.6-.6c-2.6-2.5-6.7-2.5-9.3 0l-.6.6a.2.2 0 01-.3 0L4.8 10.3a.4.4 0 010-.6l.4-.4zm16.4 3l1.2 1.2a.4.4 0 010 .6l-5.5 5.4a.5.5 0 01-.7 0L12.9 16c0-.1-.1-.1-.2 0L9.3 19.5a.5.5 0 01-.7 0L3.1 14.1a.4.4 0 010-.6l1.2-1.2a.5.5 0 01.7 0l3.4 3.3c.1.1.2.1.2 0l3.4-3.3a.5.5 0 01.7 0l3.4 3.3c.1.1.2.1.2 0l3.4-3.3a.5.5 0 01.7 0z" fill="white"/></svg>

const WALLETS = [
  { id:'metamask',      name:'MetaMask',        icon:METAMASK_ICON,  desc:'Browser & mobile', color:'#F6851B' },
  { id:'trust',         name:'Trust Wallet',    icon:TRUST_ICON,     desc:'Mobile & extension', color:'#3375BB' },
  { id:'coinbase',      name:'Coinbase Wallet', icon:COINBASE_ICON,  desc:'Browser extension', color:'#0052FF' },
  { id:'walletconnect', name:'WalletConnect',   icon:WC_ICON,        desc:'Any mobile wallet', color:'#3B99FC' },
]

const DOWNLOAD = {
  metamask: 'https://metamask.io/download/',
  trust:    'https://trustwallet.com/download',
  coinbase: 'https://www.coinbase.com/wallet/downloads',
}

const checkAccess = async (address) => {
  const res  = await fetch(`${import.meta.env.BASE_URL}wallets.json`)
  const list = await res.json()
  return list.map(w=>w.toLowerCase()).includes(address.toLowerCase())
}

const isMobileDevice = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

// Initialise WalletConnect provider and return it
const initWC = async (preferredWalletId) => {
  const { EthereumProvider } = await import('https://esm.sh/@walletconnect/ethereum-provider@2.17.0')
  const WC_WALLET_IDS = {
    metamask: 'c57ca95b47569778a828d19178114f4db188b89b547b43be7fae921f2b6a6aa0',
    trust:    '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0',
    coinbase: 'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa',
  }
  return EthereumProvider.init({
    projectId: PROJECT_ID,
    chains: [56],
    showQrModal: true,
    qrModalOptions: {
      themeMode: 'dark',
      themeVariables: { '--wcm-accent-color':'#FFD700', '--wcm-background-color':'#0e0d09', '--wcm-z-index':'99999' },
      explorerRecommendedWalletIds: WC_WALLET_IDS[preferredWalletId] ? [WC_WALLET_IDS[preferredWalletId]] : undefined,
      enableExplorer: true,
    },
    metadata: { name:'PMT Millionaires Club', description:'The elite holders of the PMT ecosystem.', url:window.location.origin, icons:[window.location.origin+'/PMT-logo.png'] }
  })
}

export default function WalletModal({ onSuccess, onClose }) {
  const [status, setStatus]   = useState('idle')
  const [addr, setAddr]       = useState('')
  const [errMsg, setErrMsg]   = useState('')
  const [isWC, setIsWC]       = useState(false)
  const [mmReady, setMmReady] = useState(false)
  const mmProviderRef         = useRef(null)

  useEffect(() => {
    const fn = e => { if(e.key==='Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  // Pre-init MetaMask SDK
  useEffect(() => {
    try {
      const sdk = new MetaMaskSDK({ dappMetadata:{name:'PMT Millionaires Club',url:window.location.href}, logging:{developerMode:false}, checkInstallationImmediately:false, useDeeplink:false })
      let attempts = 0
      const poll = setInterval(() => {
        const p = sdk.getProvider()
        if(p) { mmProviderRef.current = p; setMmReady(true); clearInterval(poll) }
        else if(++attempts > 30) { clearInterval(poll); if(window.ethereum){mmProviderRef.current=window.ethereum;setMmReady(true)} }
      }, 100)
      return () => clearInterval(poll)
    } catch(e) { if(window.ethereum){mmProviderRef.current=window.ethereum;setMmReady(true)} }
  }, [])

  // On mount — check if returning from WalletConnect approval
  useEffect(() => {
    const pending = sessionStorage.getItem(WC_FLAG_KEY)
    if(!pending) return
    const { walletId, ts } = JSON.parse(pending)
    // Only resume if less than 5 minutes old
    if(Date.now() - ts > 300000) { sessionStorage.removeItem(WC_FLAG_KEY); return }
    sessionStorage.removeItem(WC_FLAG_KEY)
    setIsWC(true)
    setStatus('wcLoading')
    initWC(walletId)
      .then(async p => {
        setStatus('connecting')
        // Session should already be established — just get accounts
        for(let i=0; i<10; i++){
          await new Promise(r=>setTimeout(r,800))
          try {
            const accounts = await p.request({method:'eth_accounts'})
            if(accounts?.[0]) { await handleResult(accounts[0]); return }
          } catch(e){}
        }
        // If still nothing, try full connect
        await p.connect()
        const accounts = await p.request({method:'eth_accounts'})
        if(accounts?.[0]) await handleResult(accounts[0])
      })
      .catch(() => setStatus('idle'))
  }, [])

  const handleResult = async (address) => {
    const allowed = await checkAccess(address)
    setAddr(address)
    if(allowed){ setStatus('success'); setTimeout(onSuccess,1200) }
    else setStatus('denied')
  }

  const handleError = (err) => {
    if(err.code===4001||err.message?.includes('reject')||err.message?.includes('denied')){ setStatus('idle'); return }
    if(err.message?.toLowerCase().includes('clos')||err.message?.toLowerCase().includes('cancel')){ setStatus('idle'); return }
    setErrMsg(err.message||'Connection failed.')
    setStatus('error')
  }

  const connectWC = async (walletId) => {
    setIsWC(true)
    setStatus('wcLoading')
    try {
      const p = await initWC(walletId)
      setStatus('connecting')

      // Save flag BEFORE opening modal — so if page reloads, we can resume
      sessionStorage.setItem(WC_FLAG_KEY, JSON.stringify({ walletId, ts: Date.now() }))

      // Listen for connection events
      const done = { current: false }
      const finish = async () => {
        if(done.current) return; done.current = true
        sessionStorage.removeItem(WC_FLAG_KEY)
        try {
          const accounts = await p.request({method:'eth_accounts'})
          if(accounts?.[0]) await handleResult(accounts[0])
        } catch(e) { handleError(e) }
      }

      p.on('connect', finish)
      p.on('accountsChanged', async accounts => { if(accounts?.[0]&&!done.current) await finish() })

      // visibilitychange: poll accounts when user returns from wallet app
      const onVisible = async () => {
        if(document.visibilityState!=='visible') return
        for(let i=0; i<8; i++){
          await new Promise(r=>setTimeout(r,600))
          try {
            const accounts = await p.request({method:'eth_accounts'})
            if(accounts?.[0]) { document.removeEventListener('visibilitychange',onVisible); await finish(); return }
          } catch(e){}
        }
      }
      document.addEventListener('visibilitychange', onVisible)

      p.connect().catch(err => {
        sessionStorage.removeItem(WC_FLAG_KEY)
        document.removeEventListener('visibilitychange', onVisible)
        if(err.message?.toLowerCase().includes('clos')||err.message?.toLowerCase().includes('cancel')){ setStatus('idle') }
        else handleError(err)
      })
    } catch(e) { handleError(e) }
  }

  const connect = (walletId) => {
    if(walletId==='walletconnect'){ connectWC(walletId); return }

    const isMobile = isMobileDevice()

    // Mobile without window.ethereum: use WalletConnect with that wallet pre-selected
    if(isMobile && !window.ethereum){ connectWC(walletId); return }

    // Desktop / inside wallet browser
    const provider = walletId==='metamask' ? (mmProviderRef.current||window.ethereum) : window.ethereum
    if(!provider){ window.open(DOWNLOAD[walletId]||DOWNLOAD.metamask,'_blank'); setStatus('noWallet'); return }
    setStatus('connecting')
    provider.request({method:'eth_requestAccounts'})
      .then(accounts=>{ if(!accounts?.[0]) throw new Error('No account'); return handleResult(accounts[0]) })
      .catch(handleError)
  }

  const hideOverlay = isWC && status==='connecting'

  return (
    <div className="wm-overlay"
      style={{background:hideOverlay?'transparent':'rgba(0,0,0,.75)',backdropFilter:hideOverlay?'none':'blur(6px)',WebkitBackdropFilter:hideOverlay?'none':'blur(6px)',pointerEvents:hideOverlay?'none':'auto'}}
      onClick={e=>e.target.classList.contains('wm-overlay')&&!hideOverlay&&onClose()}>
      <div className="wm-modal" style={{display:hideOverlay?'none':'block'}}>

        <div className="wm-header">
          <div className="wm-title">
            {status==='idle'&&'Connect Wallet'}
            {(status==='connecting'||status==='wcLoading')&&'Connecting…'}
            {status==='success'&&'✓ Access Granted'}
            {status==='denied'&&'🚫 Members Only'}
            {(status==='error'||status==='noWallet')&&'Error'}
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
                    <span className="wm-wallet-name">{w.name}{w.id==='metamask'&&!mmReady&&<span style={{fontSize:9,color:'rgba(255,215,0,.4)',marginLeft:6}}>loading…</span>}</span>
                    <span className="wm-wallet-desc">{w.desc}</span>
                  </span>
                  <span className="wm-wallet-arrow">→</span>
                </button>
              ))}
            </div>
            <p className="wm-note">Only PMT Millionaires Club members get access</p>
          </div>
        )}

        {(status==='connecting'||status==='wcLoading')&&(
          <div className="wm-body wm-centered">
            <div className="wm-spinner"/>
            <p className="wm-subtitle">{status==='wcLoading'?'Loading WalletConnect…':'Waiting for wallet…'}</p>
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
              Wallet <strong style={{color:'rgba(255,255,255,.7)'}}>{addr.slice(0,6)}…{addr.slice(-4)}</strong> is not a Millionaires Club member.<br/><br/>
              Hold at least <strong style={{color:'#FFD700'}}>1,000,000 PMT</strong> to qualify.
            </p>
            <button className="wm-btn-retry" onClick={()=>setStatus('idle')}>Try another wallet</button>
          </div>
        )}

        {(status==='error'||status==='noWallet')&&(
          <div className="wm-body wm-centered">
            <div className="wm-denied-icon">⚠</div>
            <p className="wm-subtitle">{status==='noWallet'?'Wallet not installed':'Error'}</p>
            <p className="wm-note" style={{textAlign:'center',lineHeight:1.6,maxWidth:280}}>
              {status==='noWallet'?'Opening download page…':errMsg}
            </p>
            <button className="wm-btn-retry" onClick={()=>setStatus('idle')}>Try again</button>
          </div>
        )}

      </div>
    </div>
  )
}
