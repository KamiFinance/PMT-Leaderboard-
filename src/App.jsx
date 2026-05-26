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
  if (usd >= 1e6) return `$${(usd/1e6).toFixed(3)}M USD`
  return `$${Math.round(usd).toLocaleString()} USD`
}

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
    const r=await fetch(RPC_URL,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({jsonrpc:'2.0',id:1,method:'eth_blockNumber',params:[]})})
    return parseInt((await r.json()).result,16)
  } catch { return 0 }
}
async function fetchPmtPrice() {
  try {
    const r=await fetch(`https://api.pancakeswap.info/api/v2/tokens/${CONTRACT}`)
    if(!r.ok) return 0
    const d=await r.json()
    return parseFloat(d.data?.price)||0
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

// ── Stat Icons (inline SVG) ────────────────────────────────────────────────
function IconPeople() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
function IconWallet() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 12a2 2 0 0 0 0 4h4v-4Z"/><path d="M2 10h20"/></svg>
}
function IconTrend() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
}
function IconCoins() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="9" cy="9" r="7"/><path d="M15.7 15.7a7 7 0 1 0-9.9-9.9"/></svg>
}

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
  const topBalance = lb[0]?.balance||0
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
        <div className="login-icon">🔐</div>
        <h2 className="login-title">Admin Access</h2>
        <p className="login-sub">Authorised personnel only</p>
        <div className="field-row">
          <input className="field" type={showPwd?'text':'password'} placeholder="Password"
            value={pwd} onChange={e=>setPwd(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleLogin()} autoFocus/>
          <button className="field-toggle" onClick={()=>setShowPwd(s=>!s)}>{showPwd?'🙈':'👁'}</button>
        </div>
        {loginErr&&<p className="err-msg">{loginErr}</p>}
        <button className="btn-primary" onClick={handleLogin}>Sign In</button>
        <button className="btn-ghost" onClick={()=>setView('leaderboard')}>← Back</button>
      </div>
    </div>
  )

  // ── ADMIN ──────────────────────────────────────────────────────────────────
  if(view==='admin') return(
    <div className="page">
      <header className="admin-bar">
        <span className="admin-bar-title">PMT Millionaires Club — Admin</span>
        <div style={{display:'flex',gap:8}}>
          <button className="btn-ghost sm" onClick={()=>setView('leaderboard')}>← Leaderboard</button>
          <button className="btn-ghost sm danger" onClick={()=>setView('leaderboard')}>Log out</button>
        </div>
      </header>
      <main style={{maxWidth:580}}>
        <p className="field-label">GitHub Token <span className="field-hint">(required to save)</span></p>
        <div className="field-row" style={{marginBottom:16}}>
          <input className="field mono" type={showToken?'text':'password'} placeholder="ghp_…"
            value={token} onChange={e=>setToken(e.target.value)}/>
          <button className="field-toggle" onClick={()=>setShowToken(s=>!s)}>{showToken?'🙈':'👁'}</button>
        </div>
        <p className="field-label">Add Wallet Address</p>
        <div className="field-row">
          <input className="field mono" placeholder="0x…" value={newAddr}
            onChange={e=>{setNewAddr(e.target.value);setAddrErr('')}}
            onKeyDown={e=>e.key==='Enter'&&addWallet()}/>
          <button className="btn-primary sm" onClick={addWallet}>+ Add</button>
        </div>
        {addrErr&&<p className="err-msg">{addrErr}</p>}
        <p className="field-label" style={{marginTop:20}}>
          Tracked Wallets <span className="badge-count">{wallets.length}</span>
        </p>
        <div className="wallet-list">
          {wallets.length===0?<div className="empty-state">No wallets added yet</div>
            :wallets.map((a,i)=>(
              <div className="wallet-item" key={a}>
                <span className="wallet-n">{i+1}</span>
                <span className="wallet-a mono">{a}</span>
                <button className="del-btn" onClick={()=>removeWallet(a)}>Remove</button>
              </div>
            ))}
        </div>
        <button className="btn-primary" onClick={saveToRepo} disabled={saving}>{saving?'Saving…':'💾 Save to GitHub'}</button>
        {saveMsg&&<p className={saveMsg.startsWith('success:')?'ok-msg':'err-msg'} style={{marginTop:10}}>
          {saveMsg.replace(/^(success|error):/,'')}
        </p>}
        <p className="footer-note" style={{marginTop:20}}>Wallets stored in GitHub — never lost on cache clear.</p>
      </main>
    </div>
  )

  // ── LEADERBOARD ────────────────────────────────────────────────────────────
  return(
    <div className="page">

      {/* ── TOP SECTION: status bar + hero with David background ── */}
      <div className="page-top">
        {/* David image — full background layer */}
        <img
          src={`${import.meta.env.BASE_URL}david.png`}
          alt=""
          aria-hidden="true"
          className="david-bg"
        />

        {/* STATUS BAR — floats on top */}
        <div className="status-bar">
          <div className="status-left"/>
          <div className="status-right">
            <span className="status-chip live-chip">
              <span className="pulse-dot"/>LIVE
            </span>
            <span className="status-chip">Min {MIN_TOKENS.toLocaleString()} PMT</span>
            <span className="status-chip refresh-chip">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
              {countdown}s
            </span>
          </div>
        </div>

        {/* HERO TEXT — floats on top */}
        <header className="hero">
          <div className="hero-text">
            <h1 className="hero-h1">
              <span className="gold-word">PMT</span> Millionaires Club
            </h1>
            <p className="hero-tagline">The elite holders of the PMT ecosystem.</p>
            <div className="hero-chips">
              <span className="chain-chip">
                <span className="pulse-dot"/>LIVE ON BNB SMART CHAIN
              </span>
              {blockNum>0&&<span className="chain-chip block-chip">BLOCK #{blockNum.toLocaleString()}</span>}
            </div>
          </div>
        </header>
      </div>

      {/* ── STAT CARDS ── */}
      <section className="stats-row">
        {[
          { Icon:IconPeople, n: lb.length,                       label:'Millionaire Holders',   sub:null },
          { Icon:IconWallet, n: lb[0]?fmt(lb[0].balance):'—',   label:'Top Balance',           sub:lb[0]&&pmtPrice?fmtUsd(lb[0].balance,pmtPrice):null },
          { Icon:IconTrend,  n: wallets.length,                  label:'Wallets Tracked',       sub:null },
          { Icon:IconCoins,  n: fmt(total),                      label:'Total Tracked Balance', sub:pmtPrice&&total>0?fmtUsd(total,pmtPrice):null },
        ].map(({Icon,n,label,sub},i)=>(
          <div className="stat-card" key={label}>
            <div className="stat-icon-wrap"><Icon/></div>
            <div className="stat-text">
              <div className="stat-n">{n}</div>
              <div className="stat-lbl">{label.toUpperCase()}</div>
              {sub&&<div className="stat-sub">{sub}</div>}
            </div>
          </div>
        ))}
      </section>

      {/* ── LEADERBOARD ── */}
      <section className="lb-wrap">
        {/* header bar */}
        <div className="lb-head">
          <span className="lb-head-l">TOP MILLIONAIRE HOLDERS</span>
          <span className="lb-head-r">PMT BALANCE</span>
        </div>

        {fetchErr&&<div className="lb-err">{fetchErr}</div>}

        {loading&&lb.length===0?(
          <div className="lb-empty"><span className="spinner"/>Fetching live balances…</div>
        ):lb.length===0?(
          <div className="lb-empty">
            {wallets.length===0
              ?'No wallets tracked yet — open admin panel to add wallets'
              :'No wallets currently hold ≥ 1,000,000 PMT'}
          </div>
        ):(
          <>
            {displayLb.map((row,i)=>{
              const share     = total>0?(row.balance/total*100):0
              const relW      = topBalance>0?Math.max((row.balance/topBalance)*100,3):3
              const isFirst   = i===0
              const isTop3    = i<3

              const accentCol = i===0?'#FFD700': i===1?'#C8C8C8': i===2?'#CD7F32': 'rgba(255,255,255,0.22)'
              const balCol    = i===0?'#FFD700': '#FFFFFF'
              const barGrad   = i===0?'linear-gradient(90deg,#9A6500,#FFD700,#FFF0A0)'
                              : i===1?'linear-gradient(90deg,#555,#C0C0C0)'
                              : i===2?'linear-gradient(90deg,#6B3500,#CD7F32)'
                              : 'rgba(255,255,255,0.15)'

              return(
                <div key={row.address} className={`lb-row${isFirst?' lb-row--first':isTop3?' lb-row--top':''}`}>
                  {isFirst&&<div className="row-shimmer"/>}

                  {/* rank */}
                  <div className="col-rank">
                    {isFirst
                      ? <img src={`${import.meta.env.BASE_URL}1st_place.svg`} alt="1st" className="rank-svg-first"/>
                      : i===1
                      ? <img src={`${import.meta.env.BASE_URL}2nd_place.svg`} alt="2nd" className="rank-svg-second"/>
                      : i===2
                      ? <img src={`${import.meta.env.BASE_URL}3rd_place.svg`} alt="3rd" className="rank-svg-third"/>
                      : <div className="rank-badge" style={{color:'#FFFFFF',borderColor:'#FFFFFF',opacity:0.85}}>
                          {i+1}
                        </div>
                    }
                  </div>

                  {/* address + badge */}
                  <div className="col-info">
                    <div className="addr-row">
                      <span className="addr-text">{shortenAddr(row.address)}</span>
                      <button className="copy-btn" onClick={()=>copyAddr(row.address)} title="Copy">
                        {copied===row.address?'✓':'⧉'}
                      </button>
                    </div>
                    <div className="badges-row">
                      <span className="holder-tag" style={{
                        color: isFirst?'#FFD700':'rgba(255,255,255,0.45)',
                        borderColor: isFirst?'rgba(255,215,0,0.4)':'rgba(255,255,255,0.1)',
                        background: isFirst?'rgba(255,215,0,0.07)':'transparent',
                      }}>
                        {isFirst?'CROWN HOLDER':'ELITE HOLDER'}
                      </span>
                      {isTop3&&(
                        <span className="active-tag">
                          <span className="green-dot"/>Active now
                        </span>
                      )}
                    </div>
                  </div>

                  {/* holding share */}
                  <div className="col-share">
                    <div className="share-label">HOLDING SHARE</div>
                    <div className="share-bar">
                      <div className="share-fill" style={{width:`${relW}%`,background:barGrad}}/>
                    </div>
                    <div className="share-pct">{share.toFixed(2)}%</div>
                  </div>

                  {/* balance */}
                  <div className="col-balance">
                    <div className="bal-num" style={{color:balCol}}>
                      {fmt(row.balance)}<span className="bal-unit"> PMT</span>
                    </div>
                    {pmtPrice>0&&<div className="bal-usd">{fmtUsd(row.balance,pmtPrice)}</div>}
                  </div>

                  {/* arrow */}
                  <div className="col-arrow">›</div>
                </div>
              )
            })}

            {lb.length>10&&(
              <button className="view-more-btn" onClick={()=>setShowAll(s=>!s)}>
                {showAll
                  ?<>SHOW LESS <span style={{fontSize:14}}>∧</span></>
                  :<>VIEW FULL LEADERBOARD <span style={{fontSize:14}}>∨</span></>}
              </button>
            )}
          </>
        )}
      </section>

      <p className="page-footer">
        Only wallets holding ≥ {MIN_TOKENS.toLocaleString()} PMT are shown&nbsp;·&nbsp;
        Contract:&nbsp;<code>{CONTRACT.slice(0,10)}…</code>
        {loading&&<>&nbsp;·&nbsp;<span style={{color:'rgba(255,255,255,0.25)'}}>Refreshing…</span></>}
      </p>
    </div>
  )
}
