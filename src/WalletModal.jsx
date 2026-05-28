import { useState, useEffect, useRef } from 'react'
import MetaMaskSDK from '@metamask/sdk'

const PROJECT_ID = 'c2dba76201be08a0906f59f4d416129b'

const WalletIcon = ({color, children, radius=10}) => (
  <div style={{width:36,height:36,borderRadius:radius,background:color,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
    {children}
  </div>
)

const METAMASK_ICON = (
  <WalletIcon color="#F6851B">
    <svg viewBox="0 0 35 33" style={{width:22,height:22}} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M32.9 1L19.4 10.7l2.4-5.7L32.9 1z" fill="#E2761B" stroke="#E2761B" strokeWidth=".5"/>
      <path d="M2.1 1l13.4 9.8-2.3-5.8L2.1 1zm23.9 22.5l-3.6 5.5 7.7 2.1 2.2-7.5-6.3-.1zm-24.1.1L4.1 31.1l7.7-2.1-3.6-5.5-6.3.1z" fill="#E4761B" stroke="#E4761B" strokeWidth=".5"/>
      <path d="M11.4 14.5L9.4 17.5l7.5.4-.3-8.1-5.2 4.7zm12.2 0l-5.3-5-2.7 8.4 7.5-.4-2.4-3h2.9zm-8.8 13.3l4.5-2.2-3.9-3-0.6 5.2zm5.4-2.2l4.5 2.2-.6-5.2-3.9 3z" fill="#E4761B" stroke="#E4761B" strokeWidth=".5"/>
      <path d="M24.4 29.8l-4.5-2.2.4 3 0 1.3 4.1-2.1zm-13.9 0l4.1 2.1 0-1.3.4-3-4.5 2.2z" fill="#D7C1B3" stroke="#D7C1B3" strokeWidth=".5"/>
      <path d="M14.7 22.1l-3.8-1.1 2.7-1.2 1.1 2.3zm5.6 0l1.1-2.3 2.7 1.2-3.8 1.1z" fill="#233447" stroke="#233447" strokeWidth=".5"/>
    </svg>
  </WalletIcon>
)

const TRUST_ICON = (
  <WalletIcon color="#3375BB" radius={18}>
    <svg viewBox="0 0 24 24" style={{width:22,height:22}} fill="none">
      <path d="M12 2L4 5v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V5L12 2z" fill="white" opacity=".9"/>
      <path d="M12 5L7 7v4c0 3.9 2.7 7.5 5 8.7 2.3-.9 5-4.8 5-8.7V7L12 5z" fill="#3375BB"/>
    </svg>
  </WalletIcon>
)

const COINBASE_ICON = (
  <WalletIcon color="#0052FF" radius={18}>
    <svg viewBox="0 0 24 24" style={{width:22,height:22}} fill="none">
      <circle cx="12" cy="12" r="10" fill="white" opacity=".9"/>
      <circle cx="12" cy="12" r="6" fill="#0052FF"/>
      <circle cx="12" cy="12" r="3" fill="white"/>
    </svg>
  </WalletIcon>
)

const WC_ICON = (
  <WalletIcon color="#3B99FC" radius={10}>
    <svg viewBox="0 0 24 15" style={{width:22,height:14}} fill="none">
      <path d="M4.9 3.4c3.9-3.8 10.2-3.8 14.2 0l.5.5c.2.2.2.5 0 .7l-1.6 1.6c-.1.1-.3.1-.4 0l-.7-.6c-2.7-2.7-7.1-2.7-9.8 0l-.7.7c-.1.1-.3.1-.4 0L4.4 4.7c-.2-.2-.2-.5 0-.7l.5-.6zm17.5 3.2l1.6 1.5c.2.2.2.5 0 .7l-7 6.9c-.2.2-.5.2-.7 0l-5-4.9c0-.1-.1-.1-.2 0l-5 4.9c-.2.2-.5.2-.7 0L.4 8.8c-.2-.2-.2-.5 0-.7l1.6-1.5c.2-.2.5-.2.7 0l5 4.9c0 .1.1.1.2 0l5-4.9c.2-.2.5-.2.7 0l5 4.9c.1.1.2.1.2 0l5-4.9c.2-.2.5-.2.7 0z" fill="white"/>
    </svg>
  </WalletIcon>
)

const WALLETS = [
  { id:'metamask',      name:'MetaMask',        icon:METAMASK_ICON,  desc:'Browser & mobile' },
  { id:'trust',         name:'Trust Wallet',    icon:TRUST_ICON,     desc:'Mobile & extension' },
  { id:'coinbase',      name:'Coinbase Wallet', icon:COINBASE_ICON,  desc:'Browser extension' },
  { id:'walletconnect', name:'WalletConnect',   icon:WC_ICON,        desc:'Any mobile wallet — scan QR' },
]

const DOWNLOAD = { metamask:'https://metamask.io/download/', trust:'https://trustwallet.com/download', coinbase:'https://www.coinbase.com/wallet/downloads' }

const checkAccess = async (address) => {
  const res = await fetch(`${import.meta.env.BASE_URL}wallets.json`)
  const list = await res.json()
  return list.map(w=>w.toLowerCase()).includes(address.toLowerCase())
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

  // Pre-initialize MetaMask SDK as soon as modal opens
  // so provider is ready by the time user clicks
  useEffect(() => {
    try {
      const sdk = new MetaMaskSDK({
        dappMetadata: { name:'PMT Millionaires Club', url:window.location.href },
        logging: { developerMode:false },
        checkInstallationImmediately: false,
        useDeeplink: false,
      })

      // Poll until provider is available (SDK init is async)
      let attempts = 0
      const poll = setInterval(() => {
        const p = sdk.getProvider()
        if(p) {
          mmProviderRef.current = p
          setMmReady(true)
          clearInterval(poll)
        } else if(++attempts > 30) {
          // After 3s fallback to window.ethereum
          clearInterval(poll)
          if(window.ethereum) {
            mmProviderRef.current = window.ethereum
            setMmReady(true)
          }
        }
      }, 100)

      return () => clearInterval(poll)
    } catch(e) {
      // Fallback to window.ethereum if SDK throws
      if(window.ethereum) {
        mmProviderRef.current = window.ethereum
        setMmReady(true)
      }
    }
  }, [])

  const handleResult = async (address) => {
    const allowed = await checkAccess(address)
    setAddr(address)
    if(allowed){ setStatus('success'); setTimeout(onSuccess,1200) }
    else setStatus('denied')
  }

  const handleError = (err) => {
    if(err.code===4001||err.message?.includes('reject')||err.message?.includes('denied')){
      setStatus('idle')
    } else if(err.message?.toLowerCase().includes('clos')||err.message?.toLowerCase().includes('cancel')){
      setStatus('idle')
    } else {
      setErrMsg(err.message||'Connection failed. Please try again.')
      setStatus('error')
    }
  }

  const connect = (walletId) => {
    setIsWC(walletId==='walletconnect')

    if(walletId==='walletconnect'){
      setStatus('wcLoading')
      import('https://esm.sh/@walletconnect/ethereum-provider@2.17.0')
        .then(({EthereumProvider})=>EthereumProvider.init({
          projectId: PROJECT_ID,
          chains: [56],
          showQrModal: true,
          qrModalOptions: {
            themeMode: 'dark',
            themeVariables: {
              '--wcm-accent-color': '#FFD700',
              '--wcm-background-color': '#0e0d09',
              '--wcm-z-index': '99999',
            },
            mobileWallets: [
              { id:'metamask',   name:'MetaMask',    links:{ native:'metamask://',   universal:'https://metamask.app.link' }},
              { id:'trust',      name:'Trust Wallet', links:{ native:'trust://',      universal:'https://link.trustwallet.com' }},
              { id:'rainbow',    name:'Rainbow',      links:{ native:'rainbow://',    universal:'https://rnbwapp.com' }},
            ],
            walletImages: {
              metamask: 'https://raw.githubusercontent.com/WalletConnect/walletconnect-assets/master/Icon/Gradient/Icon.png',
            }
          },
          metadata:{
            name:'PMT Millionaires Club',
            description:'The elite holders of the PMT ecosystem.',
            url: window.location.origin,
            icons:[window.location.origin+'/PMT-logo.png']
          }
        }))
        .then(p => {
          setIsWC(true)
          setStatus('connecting')
          return p.connect().then(()=>p.request({method:'eth_accounts'}))
        })
        .then(async accounts=>{ if(!accounts?.[0]) throw new Error('No account'); await handleResult(accounts[0]) })
        .catch(err => {
          if(err.message?.toLowerCase().includes('clos')||err.message?.toLowerCase().includes('cancel')){
            setStatus('idle')
          } else {
            handleError(err)
          }
        })
      return
    }

    // Browser wallets — use pre-initialized MetaMask SDK provider
    const provider = walletId==='metamask' ? mmProviderRef.current : window.ethereum
    if(!provider){
      window.open(DOWNLOAD[walletId]||DOWNLOAD.metamask,'_blank')
      setStatus('noWallet')
      return
    }

    setStatus('connecting')
    provider.request({method:'eth_requestAccounts'})
      .then(accounts=>{ if(!accounts?.[0]) throw new Error('No account'); return handleResult(accounts[0]) })
      .catch(handleError)
  }

  const hideOverlay = isWC && (status==='connecting')

  return (
    <div className="wm-overlay"
      style={{background:hideOverlay?'transparent':'rgba(0,0,0,.75)',backdropFilter:hideOverlay?'none':'blur(6px)',WebkitBackdropFilter:hideOverlay?'none':'blur(6px)',pointerEvents:hideOverlay?'none':'auto'}}
      onClick={e=>e.target.classList.contains('wm-overlay')&&!hideOverlay&&onClose()}>
      <div className="wm-modal" style={{display:hideOverlay?'none':'block'}}>

        <div className="wm-header">
          <div className="wm-title">
            {status==='idle'&&'Connect Wallet'}
            {status==='connecting'&&'Connecting…'}
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
                <button key={w.id} className="wm-wallet-btn"
                  onClick={()=>connect(w.id)}
                  style={{opacity:w.id==='metamask'&&!mmReady?.9:1,cursor:w.id==='metamask'&&!mmReady?'wait':'pointer'}}
                  title={w.id==='metamask'&&!mmReady?'Initializing…':undefined}>
                  <span className="wm-wallet-icon">{w.icon}</span>
                  <span className="wm-wallet-info">
                    <span className="wm-wallet-name">{w.name}{w.id==='metamask'&&!mmReady&&<span style={{fontSize:9,color:'rgba(255,215,0,.5)',marginLeft:6}}>initializing…</span>}</span>
                    <span className="wm-wallet-desc">{w.desc}</span>
                  </span>
                  <span className="wm-wallet-arrow">→</span>
                </button>
              ))}
            </div>
            <p className="wm-note">Only PMT Millionaires Club members get access</p>
          </div>
        )}

        {(status==='wcLoading')&&(
          <div className="wm-body wm-centered">
            <div className="wm-spinner"/>
            <p className="wm-subtitle">Loading WalletConnect…</p>
            <p className="wm-note">This may take a few seconds</p>
          </div>
        )}
        {status==='connecting'&&!isWC&&(
          <div className="wm-body wm-centered">
            <div className="wm-spinner"/>
            <p className="wm-subtitle">Approve in your wallet…</p>
          </div>
        )}
        {status==='connecting'&&isWC&&(
          <div className="wm-body wm-centered">
            <div className="wm-spinner"/>
            <p className="wm-subtitle">Scan QR or select wallet…</p>
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
