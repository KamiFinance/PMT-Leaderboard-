import { useState, useEffect, useRef } from 'react'
import MetaMaskSDK from '@metamask/sdk'

const PROJECT_ID = '68140be0602e8677013cb0cf750294bc'
const WC_FLAG    = 'pmt_wc_pending'

const WALLETS = [
  { id:'metamask',      name:'MetaMask',        desc:'Browser & mobile',  color:'#F6851B' },
  { id:'trust',         name:'Trust Wallet',    desc:'Mobile & extension', color:'#3375BB' },
  { id:'coinbase',      name:'Coinbase Wallet', desc:'Browser extension',  color:'#0052FF' },
  { id:'walletconnect', name:'WalletConnect',   desc:'Any mobile wallet',  color:'#3B99FC' },
]

const WalletIcon = ({ color, letter }) => (
  <div style={{width:36,height:36,borderRadius:10,background:color,display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:700,fontSize:15,flexShrink:0}}>
    {letter}
  </div>
)
const ICONS = { metamask:'M', trust:'T', coinbase:'C', walletconnect:'W' }
const COLORS = { metamask:'#F6851B', trust:'#3375BB', coinbase:'#0052FF', walletconnect:'#3B99FC' }

const checkAccess = async (address) => {
  const res  = await fetch(`${import.meta.env.BASE_URL}wallets.json`)
  const list = await res.json()
  return list.map(w=>w.toLowerCase()).includes(address.toLowerCase())
}

const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

export default function WalletModal({ onSuccess, onClose }) {
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
        projectId:PROJECT_ID, chains:[56], showQrModal:true,
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
                  <WalletIcon color={COLORS[w.id]} letter={ICONS[w.id]}/>
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
            <p className="wm-subtitle">{status==='wcLoading'?'Loading…':'Approve in your wallet…'}</p>
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
