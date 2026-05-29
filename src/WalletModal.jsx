import { useState, useEffect, useRef } from 'react'
import MetaMaskSDK from '@metamask/sdk'

const PROJECT_ID = '68140be0602e8677013cb0cf750294bc'
const WC_FLAG    = 'pmt_wc_pending'

// Official wallet icons
const MM_ICON = (
  <div style={{width:36,height:36,borderRadius:10,overflow:'hidden',flexShrink:0,background:'#fff'}}>
    <svg viewBox="0 0 318.6 318.6" xmlns="http://www.w3.org/2000/svg" style={{width:36,height:36}}>
      <polygon points="274.1,35.5 174.6,109.4 193.1,65" fill="#E2761B" stroke="#E2761B" strokeLinecap="round" strokeLinejoin="round"/>
      <polygon points="44.4,35.5 143.1,110.1 125.6,65" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
      <polygon points="238.3,206.8 211.8,247.4 268.5,263 284.8,207.7" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
      <polygon points="33.9,207.7 50.1,263 106.8,247.4 80.3,206.8" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
      <polygon points="103.6,138.2 87.8,162 144.1,164.5 142.1,104" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
      <polygon points="214.9,138.2 176.1,103.3 174.6,164.5 230.8,162" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
      <polygon points="106.8,247.4 140.6,230.9 111.4,208.1" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
      <polygon points="177.9,230.9 211.8,247.4 207.1,208.1" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
      <polygon points="211.8,247.4 177.9,230.9 180.7,253.8 180.4,263" fill="#D7C1B3" stroke="#D7C1B3" strokeLinecap="round" strokeLinejoin="round"/>
      <polygon points="106.8,247.4 138.2,263 138.1,253.8 140.6,230.9" fill="#D7C1B3" stroke="#D7C1B3" strokeLinecap="round" strokeLinejoin="round"/>
      <polygon points="138.8,193.5 110.6,185.2 130.5,176.1" fill="#233447" stroke="#233447" strokeLinecap="round" strokeLinejoin="round"/>
      <polygon points="179.7,193.5 188,176.1 207.9,185.2" fill="#233447" stroke="#233447" strokeLinecap="round" strokeLinejoin="round"/>
      <polygon points="106.8,247.4 111.6,206.8 80.3,207.7" fill="#CC6228" stroke="#CC6228" strokeLinecap="round" strokeLinejoin="round"/>
      <polygon points="207,206.8 211.8,247.4 238.3,207.7" fill="#CC6228" stroke="#CC6228" strokeLinecap="round" strokeLinejoin="round"/>
      <polygon points="230.8,162 174.6,164.5 179.7,193.5 188,176.1 207.9,185.2" fill="#CC6228" stroke="#CC6228" strokeLinecap="round" strokeLinejoin="round"/>
      <polygon points="110.6,185.2 130.5,176.1 138.8,193.5 144.1,164.5 87.8,162" fill="#CC6228" stroke="#CC6228" strokeLinecap="round" strokeLinejoin="round"/>
      <polygon points="87.8,162 138.8,193.5 111.4,208.1" fill="#E27525" stroke="#E27525" strokeLinecap="round" strokeLinejoin="round"/>
      <polygon points="207.1,208.1 179.7,193.5 230.8,162" fill="#E27525" stroke="#E27525" strokeLinecap="round" strokeLinejoin="round"/>
      <polygon points="144.1,164.5 138.8,193.5 145.9,230.2 147.5,183" fill="#E27525" stroke="#E27525" strokeLinecap="round" strokeLinejoin="round"/>
      <polygon points="174.6,164.5 171.2,182.9 172.5,230.2 179.7,193.5" fill="#E27525" stroke="#E27525" strokeLinecap="round" strokeLinejoin="round"/>
      <polygon points="179.7,193.5 172.5,230.2 177.9,233.8 207.1,208.1 230.8,162" fill="#F5841F" stroke="#F5841F" strokeLinecap="round" strokeLinejoin="round"/>
      <polygon points="110.6,185.2 111.4,208.1 140.6,233.8 145.9,230.2 138.8,193.5" fill="#F5841F" stroke="#F5841F" strokeLinecap="round" strokeLinejoin="round"/>
      <polygon points="180.4,263 180.7,253.8 178,251.4 140.5,251.4 138.1,253.8 138.2,263 106.8,247.4 117.8,256.4 140.2,271.9 178.3,271.9 200.8,256.4 211.8,247.4" fill="#C0AD9E" stroke="#C0AD9E" strokeLinecap="round" strokeLinejoin="round"/>
      <polygon points="177.9,233.8 172.5,230.2 145.9,230.2 140.6,233.8 138.1,253.8 140.5,251.4 178,251.4 180.7,253.8" fill="#161616" stroke="#161616" strokeLinecap="round" strokeLinejoin="round"/>
      <polygon points="278.3,114.2 286.8,73.4 274.1,35.5 177.9,105.9 214.9,138.2 267.2,154.6 278.8,141.1 273.8,137.5 281.8,130.2 275.6,125.5 283.6,119.5" fill="#763D16" stroke="#763D16" strokeLinecap="round" strokeLinejoin="round"/>
      <polygon points="31.8,73.4 40.3,114.2 34.9,119.5 42.9,125.5 36.8,130.2 44.8,137.5 39.8,141.1 51.3,154.6 103.6,138.2 140.6,105.9 44.4,35.5" fill="#763D16" stroke="#763D16" strokeLinecap="round" strokeLinejoin="round"/>
      <polygon points="267.2,154.6 214.9,138.2 230.8,162 207.1,208.1 238.3,207.7 284.8,207.7" fill="#F5841F" stroke="#F5841F" strokeLinecap="round" strokeLinejoin="round"/>
      <polygon points="103.6,138.2 51.3,154.6 33.9,207.7 80.3,207.7 111.4,208.1 87.8,162" fill="#F5841F" stroke="#F5841F" strokeLinecap="round" strokeLinejoin="round"/>
      <polygon points="174.6,164.5 177.9,105.9 193.6,65 125.1,65 140.6,105.9 144.1,164.5 145.7,183.2 145.9,230.2 172.5,230.2 172.7,183.2" fill="#F5841F" stroke="#F5841F" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
)

const TRUST_ICON = (
  <div style={{width:36,height:36,borderRadius:10,overflow:'hidden',flexShrink:0,background:'#3375BB',display:'flex',alignItems:'center',justifyContent:'center'}}>
    <svg viewBox="0 0 126 148" style={{width:22,height:26}} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M63 0L0 28.4v46.3C0 111 27.1 140.9 63 148c35.9-7.1 63-37 63-73.3V28.4L63 0z" fill="white"/>
      <path d="M63 18L16 40.7v33.6C16 100.5 36.5 123 63 129c26.5-6 47-28.5 47-54.7V40.7L63 18z" fill="#3375BB"/>
      <path d="M63 37L32 52.7v21.6C32 90 44.9 104 63 108c18.1-4 31-18 31-33.7V52.7L63 37z" fill="white"/>
    </svg>
  </div>
)

const COINBASE_ICON = (
  <div style={{width:36,height:36,borderRadius:'50%',overflow:'hidden',flexShrink:0,background:'#0052FF',display:'flex',alignItems:'center',justifyContent:'center'}}>
    <svg viewBox="0 0 1000 1000" style={{width:36,height:36}}>
      <circle cx="500" cy="500" r="500" fill="#0052FF"/>
      <path d="M500 150C306.7 150 150 306.7 150 500s156.7 350 350 350 350-156.7 350-350S693.3 150 500 150zm0 560c-116.2 0-210-93.8-210-210s93.8-210 210-210 210 93.8 210 210-93.8 210-210 210z" fill="white"/>
      <rect x="380" y="380" width="240" height="240" rx="40" fill="white"/>
    </svg>
  </div>
)

const WC_ICON = (
  <div style={{width:36,height:36,borderRadius:10,overflow:'hidden',flexShrink:0}}>
    <img src={`${import.meta.env.BASE_URL}wallet-wc.png`} style={{width:36,height:36,objectFit:'cover'}} alt="WalletConnect"/>
  </div>
)

const WALLET_ICONS = { metamask:MM_ICON, trust:TRUST_ICON, coinbase:COINBASE_ICON, walletconnect:WC_ICON }

const WALLETS = [
  { id:'metamask',      name:'MetaMask',        desc:'Browser & mobile' },
  { id:'trust',         name:'Trust Wallet',    desc:'Mobile & extension' },
  { id:'coinbase',      name:'Coinbase Wallet', desc:'Browser extension' },
  { id:'walletconnect', name:'WalletConnect',   desc:'Any mobile wallet' },
]

const checkAccess = async (address) => {
  const res  = await fetch(`${import.meta.env.BASE_URL}wallets.json`)
  const list = await res.json()
  return list.map(w=>w.toLowerCase()).includes(address.toLowerCase())
}

const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

export default function WalletModal({ onSuccess, onClose, t: tProp }) {
  const t = tProp || {
    title:t.title, subtitle:t.subtitle,
    note:t.note,
    connecting:t.connecting, loading:t.loading, approve:t.approve,
    success:t.success, welcome:t.welcome, redirecting:t.redirecting,
    denied:t.denied, membersOnly:t.membersOnly, notMember:t.notMember,
    holdRequirement:t.holdRequirement, toQualify:t.toQualify, tryAnother:t.tryAnother,
    error:t.error, notInstalled:t.notInstalled, openingDownload:t.openingDownload, tryAgain:t.tryAgain,
  }
  const [status, setStatus]   = useState('idle')
  const [addr, setAddr]       = useState('')
  const [errMsg, setErrMsg]   = useState('')
  const [isWC, setIsWC]       = useState(false)
  const [mmReady, setMmReady] = useState(false)
  const mmRef                 = useRef(null)  // MetaMask SDK instance
  const provRef               = useRef(null)  // MM provider

  // Escape key
  useEffect(() => {
    const fn = e => { if(e.key==='Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  // Pre-init MetaMask SDK
  useEffect(() => {
    try {
      const sdk = new MetaMaskSDK({
        dappMetadata:{ name:'PMT Millionaires Club', url:window.location.href },
        logging:{ developerMode:false },
        checkInstallationImmediately:false,
        useDeeplink:true,
      })
      mmRef.current = sdk
      let n = 0
      const t = setInterval(() => {
        const p = sdk.getProvider()
        if(p){ provRef.current = p; setMmReady(true); clearInterval(t) }
        else if(++n>40){ clearInterval(t); if(window.ethereum){ provRef.current=window.ethereum; setMmReady(true) } }
      }, 100)
      return () => clearInterval(t)
    } catch(e){ if(window.ethereum){ provRef.current=window.ethereum; setMmReady(true) } }
  }, [])

  // Resume WalletConnect session if page was reloaded (iOS)
  useEffect(() => {
    const flag = sessionStorage.getItem(WC_FLAG)
    if(!flag) return
    const { walletId, ts } = JSON.parse(flag)
    if(Date.now()-ts > 300000){ sessionStorage.removeItem(WC_FLAG); return }
    // Page reloaded while WC pending — resume
    setIsWC(true); setStatus('wcLoading')
    resumeWC(walletId)
  }, [])

  const finish = async (address) => {
    sessionStorage.removeItem(WC_FLAG)
    const allowed = await checkAccess(address)
    setAddr(address)
    if(allowed){ setStatus('success'); setTimeout(onSuccess,1200) } else setStatus('denied')
  }

  const handleError = (err) => {
    sessionStorage.removeItem(WC_FLAG)
    const msg = err?.message||''
    if(err?.code===4001||msg.includes('reject')||msg.includes('denied')||msg.includes('cancel')||msg.toLowerCase().includes('clos')){ setStatus('idle'); return }
    setErrMsg(msg||'Connection failed. Please try again.')
    setStatus('error')
  }

  // Read WalletConnect address directly from localStorage
  // WC writes the session here even while JS is backgrounded on mobile
  const getWCAddressFromStorage = () => {
    try {
      for(const key of Object.keys(localStorage)){
        if(!key.includes('wc@2') || !key.toLowerCase().includes('session')) continue
        const data = JSON.parse(localStorage.getItem(key) || '{}')
        for(const session of Object.values(data)){
          const accounts = session?.namespaces?.eip155?.accounts || []
          if(accounts.length > 0) return accounts[0].split(':').pop()
        }
      }
    } catch(e){}
    return null
  }

  // WalletConnect — used for WC button AND for mobile wallet buttons
  const connectWC = async (walletId) => {
    setIsWC(true); setStatus('wcLoading')
    try {
      const { EthereumProvider } = await import('https://esm.sh/@walletconnect/ethereum-provider@2.17.0')
      const WC_IDS = {
        metamask:'c57ca95b47569778a828d19178114f4db188b89b547b43be7fae921f2b6a6aa0',
        trust:'4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0',
        coinbase:'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa',
      }
      const p = await EthereumProvider.init({
        projectId:PROJECT_ID, chains:[1], optionalChains:[56,137,42161], showQrModal:true,
        qrModalOptions:{
          themeMode:'dark',
          themeVariables:{'--wcm-accent-color':'#FFD700','--wcm-background-color':'#0e0d09','--wcm-z-index':'99999'},
          explorerRecommendedWalletIds:WC_IDS[walletId]?[WC_IDS[walletId]]:undefined,
          enableExplorer:true,
        },
        metadata:{name:'PMT Millionaires Club',description:'The elite holders of the PMT ecosystem.',url:window.location.origin,icons:[window.location.origin+'/PMT-logo.png']}
      })

      sessionStorage.setItem(WC_FLAG, JSON.stringify({walletId, ts:Date.now()}))
      setStatus('connecting')

      let done = false
      const handleAddress = async (address) => {
        if(done) return; done = true
        clearInterval(poll)
        document.removeEventListener('visibilitychange', onVisible)
        sessionStorage.removeItem(WC_FLAG)
        await finish(address)
      }

      // Poll localStorage — WC writes session here even while JS is backgrounded
      const poll = setInterval(() => {
        const addr = getWCAddressFromStorage()
        if(addr) handleAddress(addr)
      }, 800)

      // When user returns from wallet app — poll localStorage with retries
      const onVisible = () => {
        if(document.visibilityState !== 'visible') return
        let tries = 0
        const retry = setInterval(() => {
          const addr = getWCAddressFromStorage()
          if(addr){ clearInterval(retry); handleAddress(addr); return }
          if(++tries >= 10) clearInterval(retry)
        }, 600)
      }
      document.addEventListener('visibilitychange', onVisible)

      // p.connect() shows the modal — may or may not resolve on mobile
      p.connect()
        .then(async () => {
          if(done) return
          const addr = getWCAddressFromStorage()
          if(addr){ await handleAddress(addr); return }
          const accs = await p.request({method:'eth_accounts'})
          if(accs?.[0]) await handleAddress(accs[0])
        })
        .catch(err => {
          if(done) return
          clearInterval(poll)
          document.removeEventListener('visibilitychange', onVisible)
          handleError(err)
        })

    } catch(err){ handleError(err) }
  }

  // Resume after page reload — read session from localStorage
  const resumeWC = async (walletId) => {
    setStatus('connecting')
    // Try localStorage first (fast path)
    for(let i=0; i<15; i++){
      await new Promise(r=>setTimeout(r,700))
      const addr = getWCAddressFromStorage()
      if(addr){ await finish(addr); return }
    }
    // No session found — restart full WC flow
    connectWC(walletId)
  }

  const connect = (walletId) => {
    if(walletId==='walletconnect'){ connectWC(walletId); return }

    // On mobile: use MetaMask SDK for MetaMask (it handles deep link + WC URI natively)
    // For other wallets on mobile without window.ethereum: use WalletConnect
    if(isMobile()){
      if(walletId==='metamask' && mmRef.current){
        setStatus('connecting')
        mmRef.current.connect()
          .then(accounts => {
            const addr = Array.isArray(accounts) ? accounts[0] : accounts
            if(addr) return finish(addr)
            throw new Error('No account')
          })
          .catch(handleError)
        return
      }
      // Other mobile wallets: use WalletConnect pre-selecting that wallet
      if(!window.ethereum){ connectWC(walletId); return }
    }

    // Desktop / inside wallet browser
    const provider = walletId==='metamask' ? (provRef.current||window.ethereum) : window.ethereum
    if(!provider){
      const DOWNLOAD={metamask:'https://metamask.io/download/',trust:'https://trustwallet.com/download',coinbase:'https://www.coinbase.com/wallet/downloads'}
      window.open(DOWNLOAD[walletId]||DOWNLOAD.metamask,'_blank')
      setStatus('noWallet'); return
    }
    setStatus('connecting')
    provider.request({method:'eth_requestAccounts'})
      .then(accounts=>{ if(!accounts?.[0]) throw new Error('No account'); return finish(accounts[0]) })
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
            {status==='idle'&&t.title}
            {(status==='connecting'||status==='wcLoading')&&t.connecting}
            {status==='success'&&t.success}
            {status==='denied'&&t.denied}
            {(status==='error'||status==='noWallet')&&t.error}
          </div>
          <button className="wm-close" onClick={onClose}>✕</button>
        </div>

        {status==='idle'&&(
          <div className="wm-body">
            <p className="wm-subtitle">Choose your wallet to verify membership</p>
            <div className="wm-wallets">
              {WALLETS.map(w=>(
                <button key={w.id} className="wm-wallet-btn" onClick={()=>connect(w.id)}>
                  {WALLET_ICONS[w.id]}
                  <span className="wm-wallet-info">
                    <span className="wm-wallet-name">{w.name}{w.id==='metamask'&&!mmReady&&<span style={{fontSize:9,color:'rgba(255,255,255,.3)',marginLeft:6}}>loading…</span>}</span>
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
            <p className="wm-subtitle">{status==='wcLoading'?t.loading:t.approve}</p>
            {status==='connecting'&&<p className="wm-note">After approving, return to this page</p>}
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
            <p className="wm-subtitle">{status==='noWallet'?t.notInstalled:t.error}</p>
            <p className="wm-note" style={{textAlign:'center',lineHeight:1.6,maxWidth:280}}>
              {status==='noWallet'?t.openingDownload:errMsg}
            </p>
            <button className="wm-btn-retry" onClick={()=>setStatus('idle')}>Try again</button>
          </div>
        )}

      </div>
    </div>
  )
}
