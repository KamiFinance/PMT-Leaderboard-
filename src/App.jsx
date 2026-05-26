import { useState, useEffect, useCallback, useRef } from 'react'

const CONTRACT        = '0x68Ae2F202799be2008c89e2100257e66F77DA1f3'
const RPC_URL         = 'https://bsc-dataseed.binance.org/'
const ADMIN_HASH      = '8d87d4f9560d31f5cc6090b758b1be34ed707bd2bd275ead3ef7797fdd6e86c1'
const MIN_TOKENS      = 1_000_000
const REFRESH_MS      = 60_000
const REPO            = 'KamiFinance/PMT-Leaderboard-'
const WALLETS_FILE    = 'public/wallets.json'
const RAW_WALLETS_URL = `https://raw.githubusercontent.com/${REPO}/main/${WALLETS_FILE}`
const GITHUB_API_URL  = `https://api.github.com/repos/${REPO}/contents/${WALLETS_FILE}`
const TOKEN_KEY       = 'pmt_gh_token'

const shortenAddr = (a) => `${a.slice(0,6)}...${a.slice(-4)}`
const fmt = (n) => {
  if (n >= 1e9) return `${(n/1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n/1e6).toFixed(2)}M`
  return Math.round(n).toLocaleString()
}
const fmtUsd = (n, price) => {
  if (!price || price <= 0) return null
  const usd = n * price
  if (usd >= 1e6) return `$${(usd/1e6).toFixed(2)}M USD`
  return `$${Math.round(usd).toLocaleString()} USD`
}
const avatarHue = (addr) => parseInt(addr.slice(2,6),16) % 360

async function verifyPassword(input) {
  const enc = new TextEncoder().encode(input)
  const buf = await crypto.subtle.digest('SHA-256', enc)
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('') === ADMIN_HASH
}

async function ethCall(data) {
  const r = await fetch(RPC_URL,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({jsonrpc:'2.0',id:1,method:'eth_call',params:[{to:CONTRACT,data},'latest']})})
  return (await r.json()).result
}
async function fetchDecimals() { try { return parseInt(await ethCall('0x313ce567'),16)||18 } catch { return 18 } }
async function fetchBalance(addr,dec) {
  try {
    const p=addr.toLowerCase().replace('0x','').padStart(64,'0')
    const raw=BigInt(await ethCall('0x70a08231'+p)||'0x0')
    const d=BigInt(10)**BigInt(dec)
    return Number(raw/d)+Number(raw%d)/Number(d)
  } catch { return 0 }
}
async function fetchBlockNumber() {
  try {
    const r = await fetch(RPC_URL,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({jsonrpc:'2.0',id:1,method:'eth_blockNumber',params:[]})})
    return parseInt((await r.json()).result, 16)
  } catch { return 0 }
}
async function fetchPmtPrice() {
  try {
    const r = await fetch(`https://api.pancakeswap.info/api/v2/tokens/${CONTRACT}`)
    if (!r.ok) return 0
    const d = await r.json()
    return parseFloat(d.data?.price) || 0
  } catch { return 0 }
}
async function fetchWalletsFromRepo() {
  try { const r=await fetch(`${RAW_WALLETS_URL}?t=${Date.now()}`); return r.ok?await r.json():[] } catch { return [] }
}
async function commitWalletsToRepo(wallets,token) {
  const r1=await fetch(GITHUB_API_URL,{headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json'}})
  if(!r1.ok) throw new Error(`GitHub API error ${r1.status}`)
  const {sha}=await r1.json()
  const r2=await fetch(GITHUB_API_URL,{method:'PUT',
    headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','Content-Type':'application/json'},
    body:JSON.stringify({message:'Update wallet list via admin panel',content:btoa(JSON.stringify(wallets,null,2)),sha})})
  if(!r2.ok){const e=await r2.json().catch(()=>({}));throw new Error(e.message||`Error ${r2.status}`)}
}

// ── Icons ──────────────────────────────────────────────────────────────────
const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)
const WalletIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
  </svg>
)
const ChartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
  </svg>
)
const CoinsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/>
    <path d="M7 6h1v4"/><line x1="16.71" y1="13.88" x2="17" y2="14"/>
  </svg>
)

export default function App() {
  const [view,setView]           = useState('leaderboard')
  const [wallets,setWallets]     = useState([])
  const [lb,setLb]               = useState([])
  const [decimals,setDecimals]   = useState(18)
  const [loading,setLoading]     = useState(false)
  const [countdown,setCountdown] = useState(60)
  const [fetchErr,setFetchErr]   = useState('')
  const [pwd,setPwd]             = useState('')
  const [showPwd,setShowPwd]     = useState(false)
  const [loginErr,setLoginErr]   = useState('')
  const [newAddr,setNewAddr]     = useState('')
  const [addrErr,setAddrErr]     = useState('')
  const [token,setToken]         = useState(()=>localStorage.getItem(TOKEN_KEY)||'')
  const [showToken,setShowToken] = useState(false)
  const [saving,setSaving]       = useState(false)
  const [saveMsg,setSaveMsg]     = useState('')
  const [copied,setCopied]       = useState(null)
  const [pmtPrice,setPmtPrice]   = useState(0)
  const [blockNum,setBlockNum]   = useState(0)
  const [showAll,setShowAll]     = useState(false)
  const rRef=useRef(null), cRef=useRef(null)

  const total      = lb.reduce((s,r)=>s+r.balance,0)
  const topBalance = lb[0]?.balance || 0
  const displayLb  = showAll ? lb : lb.slice(0,10)

  useEffect(()=>{ fetchWalletsFromRepo().then(setWallets) },[])
  useEffect(()=>{ fetchDecimals().then(setDecimals) },[])
  useEffect(()=>{ fetchPmtPrice().then(setPmtPrice) },[])
  useEffect(()=>{ fetchBlockNumber().then(setBlockNum) },[])

  const refresh = useCallback(async()=>{
    if(!wallets.length){setLb([]);return}
    setLoading(true);setFetchErr('')
    try {
      const rows=await Promise.all(wallets.map(async a=>({address:a,balance:await fetchBalance(a,decimals)})))
      setLb(rows.filter(r=>r.balance>=MIN_TOKENS).sort((a,b)=>b.balance-a.balance))
      setCountdown(60)
      fetchBlockNumber().then(setBlockNum)
      fetchPmtPrice().then(setPmtPrice)
    } catch { setFetchErr('Failed to fetch balances — retrying…') }
    finally { setLoading(false) }
  },[wallets,decimals])

  useEffect(()=>{
    refresh()
    clearInterval(rRef.current)
    rRef.current=setInterval(refresh,REFRESH_MS)
    return()=>clearInterval(rRef.current)
  },[refresh])

  useEffect(()=>{
    clearInterval(cRef.current)
    cRef.current=setInterval(()=>setCountdown(c=>c<=1?60:c-1),1000)
    return()=>clearInterval(cRef.current)
  },[])

  useEffect(()=>{
    const k=e=>{if(e.ctrlKey&&e.shiftKey&&e.key==='A'){e.preventDefault();setView(v=>v==='leaderboard'?'login':v)}}
    window.addEventListener('keydown',k)
    return()=>window.removeEventListener('keydown',k)
  },[])

  const handleLogin=async()=>{
    if(await verifyPassword(pwd)){setView('admin');setLoginErr('');setPwd('')}
    else setLoginErr('Incorrect password')
  }
  const addWallet=()=>{
    const a=newAddr.trim()
    if(!/^0x[0-9a-fA-F]{40}$/.test(a)){setAddrErr('Invalid address');return}
    if(wallets.map(w=>w.toLowerCase()).includes(a.toLowerCase())){setAddrErr('Already tracked');return}
    setAddrErr('');setWallets(p=>[...p,a.toLowerCase()]);setNewAddr('');setSaveMsg('')
  }
  const removeWallet=a=>{setWallets(p=>p.filter(w=>w!==a));setSaveMsg('')}
  const saveToRepo=async()=>{
    if(!token){setSaveMsg('error:Enter a GitHub token first');return}
    setSaving(true);setSaveMsg('')
    try{await commitWalletsToRepo(wallets,token);localStorage.setItem(TOKEN_KEY,token);setSaveMsg('success:Saved! Deploying in ~1 min.')}
    catch(e){setSaveMsg(`error:${e.message}`)}
    finally{setSaving(false)}
  }
  const copyAddr=a=>{navigator.clipboard.writeText(a);setCopied(a);setTimeout(()=>setCopied(null),1500)}

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  if(view==='login') return(
    <div className="page-center">
      <div className="login-card">
        <div className="login-glyph">🔐</div>
        <h2 className="login-title">Admin Access</h2>
        <p className="login-sub">Authorised personnel only</p>
        <div className="input-row">
          <input className="text-input" type={showPwd?'text':'password'} placeholder="Password"
            value={pwd} onChange={e=>setPwd(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleLogin()} autoFocus/>
          <button className="icon-btn" onClick={()=>setShowPwd(s=>!s)}>{showPwd?'🙈':'👁'}</button>
        </div>
        {loginErr&&<p className="error-msg">{loginErr}</p>}
        <button className="btn-gold" onClick={handleLogin}>Sign In</button>
        <button className="btn-ghost" onClick={()=>setView('leaderboard')}>← Back</button>
      </div>
    </div>
  )

  // ── ADMIN ──────────────────────────────────────────────────────────────────
  if(view==='admin') return(
    <div className="page">
      <header className="admin-header">
        <span className="admin-header-title">PMT Millionaires Club</span>
        <div className="admin-header-actions">
          <button className="btn-ghost sm" onClick={()=>setView('leaderboard')}>← Leaderboard</button>
          <button className="btn-ghost sm danger" onClick={()=>setView('leaderboard')}>Log out</button>
        </div>
      </header>
      <main className="admin-main">
        <div className="section-label">GitHub Token <span className="label-hint">(required to save)</span></div>
        <div className="add-row" style={{marginBottom:16}}>
          <input className="text-input mono" type={showToken?'text':'password'} placeholder="ghp_…"
            value={token} onChange={e=>setToken(e.target.value)}/>
          <button className="icon-btn" onClick={()=>setShowToken(s=>!s)}>{showToken?'🙈':'👁'}</button>
        </div>
        <div className="section-label">Add Wallet Address</div>
        <div className="add-row">
          <input className="text-input mono" placeholder="0x…" value={newAddr}
            onChange={e=>{setNewAddr(e.target.value);setAddrErr('')}}
            onKeyDown={e=>e.key==='Enter'&&addWallet()}/>
          <button className="btn-gold sm" onClick={addWallet}>+ Add</button>
        </div>
        {addrErr&&<p className="error-msg">{addrErr}</p>}
        <div className="section-label" style={{marginTop:20}}>
          Tracked Wallets <span className="count-badge">{wallets.length}</span>
        </div>
        <div className="admin-card">
          {wallets.length===0?<div className="empty">No wallets added yet</div>
            :wallets.map((a,i)=>(
              <div className="wallet-row" key={a}>
                <span className="wallet-num">{i+1}</span>
                <span className="wallet-addr mono">{a}</span>
                <button className="del-btn" onClick={()=>removeWallet(a)}>Remove</button>
              </div>
            ))}
        </div>
        <button className="btn-gold" onClick={saveToRepo} disabled={saving}>{saving?'Saving…':'💾 Save to GitHub'}</button>
        {saveMsg&&<p className={saveMsg.startsWith('success:')?'save-ok':'error-msg'} style={{marginTop:10}}>{saveMsg.replace(/^(success|error):/,'')}</p>}
        <p className="footer-note" style={{marginTop:20}}>Wallets stored in GitHub repo — never lost on cache clear.</p>
      </main>
    </div>
  )

  // ── LEADERBOARD ────────────────────────────────────────────────────────────
  return(
    <div className="page">

      {/* ── TOP BAR ── */}
      <div className="topbar">
        <div/>
        <div className="topbar-right">
          <span className="tb-badge tb-live"><span className="live-dot"/>LIVE</span>
          <span className="tb-badge">Min {MIN_TOKENS.toLocaleString()} PMT</span>
          <span className="tb-badge tb-refresh">↺ {countdown}s</span>
        </div>
      </div>

      {/* ── HERO ── */}
      <header className="hero">
        <div className="hero-left">
          <h1 className="hero-title">
            <span className="hero-gold">PMT</span> Millionaires Club
          </h1>
          <p className="hero-sub">The elite holders of the PMT ecosystem.</p>
          <div className="hero-meta">
            <span className="meta-pill meta-green"><span className="live-dot-sm"/>LIVE ON BNB SMART CHAIN</span>
            {blockNum>0&&<span className="meta-pill">BLOCK #{blockNum.toLocaleString()}</span>}
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="orb-wrap">
            <div className="orb-ring r1">
              <div className="orb-dot od1"/>
            </div>
            <div className="orb-ring r2">
              <div className="orb-dot od2"/>
            </div>
            <div className="orb-ring r3">
              <div className="orb-dot od3"/>
            </div>
            <div className="orb-center">
              <img src={`${import.meta.env.BASE_URL}PMT-logo.png`} alt="PMT" className="orb-logo"/>
            </div>
          </div>
        </div>
      </header>

      {/* ── STATS ── */}
      <section className="stats-grid">
        {[
          {Icon:UsersIcon,  val:lb.length,                       label:'Millionaire Holders',   sub:null},
          {Icon:WalletIcon, val:lb[0]?fmt(lb[0].balance):'—',   label:'Top Balance',           sub:lb[0]&&pmtPrice?fmtUsd(lb[0].balance,pmtPrice):null},
          {Icon:ChartIcon,  val:wallets.length,                  label:'Wallets Tracked',       sub:null},
          {Icon:CoinsIcon,  val:fmt(total),                      label:'Total Tracked Balance', sub:pmtPrice&&total>0?fmtUsd(total,pmtPrice):null},
        ].map(({Icon,val,label,sub})=>(
          <div key={label} className="stat-card">
            <div className="stat-icon"><Icon/></div>
            <div className="stat-body">
              <div className="stat-val">{val}</div>
              <div className="stat-label">{label.toUpperCase()}</div>
              {sub&&<div className="stat-sub">{sub}</div>}
            </div>
          </div>
        ))}
      </section>

      {/* ── LEADERBOARD ── */}
      <section className="lb-section">
        <div className="lb-header-row">
          <span className="lb-head-title">Top Millionaire Holders</span>
          <span className="lb-head-bal">PMT Balance</span>
        </div>

        {fetchErr&&<div className="fetch-err">{fetchErr}</div>}

        {loading&&lb.length===0?(
          <div className="lb-empty"><span className="spinner"/>Fetching live balances…</div>
        ):lb.length===0?(
          <div className="lb-empty">
            {wallets.length===0?'No wallets tracked yet — open admin panel to add wallets':'No wallets currently hold ≥ 1,000,000 PMT'}
          </div>
        ):(
          <div className="lb-list">
            {displayLb.map((row,i)=>{
              const isFirst = i===0
              const isTop3  = i<3
              const hue     = avatarHue(row.address)
              const share   = total>0?(row.balance/total*100):0
              const relW    = topBalance>0?Math.max((row.balance/topBalance)*100,2):2
              const barCol  = i===0?'linear-gradient(90deg,#9A6700,#FFD700)'
                            : i===1?'linear-gradient(90deg,#555,#C0C0C0)'
                            : i===2?'linear-gradient(90deg,#6B3800,#CD7F32)'
                            : 'rgba(255,255,255,0.18)'
              const rankCol = i===0?'#FFD700':i===1?'#C0C0C0':i===2?'#CD7F32':'rgba(255,255,255,0.35)'
              const balCol  = i===0?'#FFD700':i===1?'#E0E0E0':i===2?'#CD7F32':'#FFFFFF'

              return(
                <article key={row.address} className={`lb-row${isFirst?' row-first':isTop3?' row-top3':''}`}>
                  {isFirst&&<div className="row-sweep"/>}

                  {/* Rank */}
                  <div className="row-rank">
                    {isFirst&&<span className="crown-icon">♛</span>}
                    <div className="rank-num" style={{color:rankCol,borderColor:isTop3?rankCol:'rgba(255,255,255,0.1)'}}>
                      {i+1}
                    </div>
                  </div>

                  {/* Avatar */}
                  <div className="row-avatar" style={{
                    background:`radial-gradient(circle at 38% 32%, hsl(${hue},25%,38%), hsl(${hue},35%,14%) 55%, hsl(${hue},40%,8%))`,
                    border:`1.5px solid hsl(${hue},35%,26%)`,
                    boxShadow:`0 0 14px hsl(${hue},50%,15%)`
                  }}>
                    <span style={{color:`hsl(${hue},65%,72%)`}}>{row.address.slice(2,4).toUpperCase()}</span>
                  </div>

                  {/* Info */}
                  <div className="row-info">
                    <div className="row-addr-line">
                      <span className="row-addr">{shortenAddr(row.address)}</span>
                      <button className="copy-btn" onClick={()=>copyAddr(row.address)} title="Copy address">
                        {copied===row.address?'✓':'⧉'}
                      </button>
                    </div>
                    <div className="row-badges">
                      <span className="holder-badge" style={{
                        color:isFirst?'#FFD700':isTop3?'rgba(255,255,255,0.6)':'rgba(255,255,255,0.4)',
                        borderColor:isFirst?'rgba(255,215,0,0.35)':isTop3?'rgba(255,255,255,0.14)':'rgba(255,255,255,0.08)'
                      }}>
                        {isFirst?'Crown Holder':'Elite Holder'}
                      </span>
                      {isTop3&&(
                        <span className="act-status">
                          <span className="act-dot"/>
                          <span>Active now</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Holding share bar */}
                  <div className="row-share">
                    <div className="share-lbl">Holding Share</div>
                    <div className="share-track">
                      <div className="share-fill" style={{width:`${relW}%`,background:barCol}}/>
                    </div>
                    <div className="share-pct">{share.toFixed(2)}%</div>
                  </div>

                  {/* Balance */}
                  <div className="row-balance">
                    <div className="bal-main" style={{color:balCol}}>
                      {fmt(row.balance)}<span className="bal-pmt"> PMT</span>
                    </div>
                    {pmtPrice>0&&<div className="bal-usd">{fmtUsd(row.balance,pmtPrice)}</div>}
                  </div>

                  {/* Chevron */}
                  <div className="row-chevron">›</div>
                </article>
              )
            })}
          </div>
        )}

        {lb.length>10&&(
          <button className="view-all-btn" onClick={()=>setShowAll(s=>!s)}>
            {showAll?'Show Less  ∧':'View Full Leaderboard  ∨'}
          </button>
        )}
      </section>

      <p className="footer-note">
        Only wallets holding ≥ {MIN_TOKENS.toLocaleString()} PMT are shown&nbsp;·&nbsp;
        Contract: <span className="mono">{CONTRACT.slice(0,10)}…</span>
        {loading&&<span className="refreshing-note"> · Refreshing…</span>}
      </p>
    </div>
  )
}
