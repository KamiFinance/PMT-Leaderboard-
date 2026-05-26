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

const shortenAddr = (a) => `${a.slice(0,6)}···${a.slice(-4)}`
const fmt = (n) => {
  if (n >= 1e9) return `${(n/1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n/1e6).toFixed(2)}M`
  return Math.round(n).toLocaleString()
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

const TIERS = [
  {label:'ELITE',    roman:'I',   grad:'linear-gradient(135deg,#FFD700,#B8860B)',  glow:'rgba(255,215,0,0.4)',   tc:'#000'},
  {label:'PLATINUM', roman:'II',  grad:'linear-gradient(135deg,#E8E8E8,#909090)',  glow:'rgba(200,200,200,0.25)',tc:'#111'},
  {label:'GOLD',     roman:'III', grad:'linear-gradient(135deg,#CD7F32,#7B3F00)',  glow:'rgba(205,127,50,0.3)', tc:'#fff'},
]

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
  const rRef=useRef(null), cRef=useRef(null)

  const total = lb.reduce((s,r)=>s+r.balance,0)

  useEffect(()=>{ fetchWalletsFromRepo().then(setWallets) },[])
  useEffect(()=>{ fetchDecimals().then(setDecimals) },[])

  const refresh = useCallback(async()=>{
    if(!wallets.length){setLb([]);return}
    setLoading(true);setFetchErr('')
    try {
      const rows=await Promise.all(wallets.map(async a=>({address:a,balance:await fetchBalance(a,decimals)})))
      setLb(rows.filter(r=>r.balance>=MIN_TOKENS).sort((a,b)=>b.balance-a.balance))
      setCountdown(60)
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

      {/* ── HERO ── */}
      <header className="hero">
        <div className="orbital-wrap" aria-hidden="true">
          <div className="orbit o1"><div className="orb-dot d1"/></div>
          <div className="orbit o2"><div className="orb-dot d2"/></div>
          <div className="orbit o3"><div className="orb-dot d3"/></div>
        </div>
        <img src={`${import.meta.env.BASE_URL}PMT-logo.png`} alt="PMT" className="hero-logo"/>
        <div className="hero-eyebrow">
          <span className="live-pulse"/>BNB SMART CHAIN &nbsp;·&nbsp; LIVE &nbsp;·&nbsp; ↺ {countdown}s
        </div>
        <h1 className="hero-title">PMT Millionaires Club</h1>
        <p className="hero-sub">The elite holders of the PMT ecosystem</p>
      </header>

      {/* ── STATS ── */}
      <section className="stats-grid">
        {[
          {label:'Millionaire Holders',      val:leaderboard.length||lb.length,  suf:''},
          {label:'Top Balance',              val:lb[0]?fmt(lb[0].balance):'—',   suf:lb[0]?' PMT':''},
          {label:'Wallets Tracked',          val:wallets.length,                  suf:''},
          {label:'Total Tracked Balance',    val:fmt(total),                      suf:' PMT'},
        ].map(s=>(
          <div key={s.label} className="stat-card">
            <div className="stat-val">{s.val}<span className="stat-suf">{s.suf}</span></div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </section>

      {/* ── MEMBERS ── */}
      <section className="members-list">
        {fetchErr&&<div className="fetch-err">{fetchErr}</div>}
        {loading&&lb.length===0?(
          <div className="lb-empty"><span className="spinner"/>Fetching live balances…</div>
        ):lb.length===0?(
          <div className="lb-empty">{wallets.length===0?'No wallets tracked yet — open admin to add wallets':'No wallets currently hold ≥ 1,000,000 PMT'}</div>
        ):lb.map((row,i)=>{
          const tier   = TIERS[i]
          const isTop  = i<3
          const hue    = avatarHue(row.address)
          const share  = total>0?(row.balance/total*100):0
          const barCol = i===0?'linear-gradient(90deg,#B8860B,#FFD700)'
                        :i===1?'linear-gradient(90deg,#888,#E0E0E0)'
                        :i===2?'linear-gradient(90deg,#7B3F00,#CD7F32)'
                        :'rgba(255,255,255,0.12)'
          return(
            <article key={row.address}
              className={`member-row ${i===0?'m-first':i===1?'m-second':i===2?'m-third':''}`}
              style={i===0?{'--glow':TIERS[0].glow}:{}}
            >
              {i===0&&<div className="sweep"/>}

              {/* Rank */}
              <div className="m-rank">
                <div className="rank-circle"
                  style={{background:isTop?tier.grad:'rgba(255,255,255,0.06)',
                          boxShadow:isTop?`0 0 18px ${tier.glow}`:'none',
                          color:isTop?tier.tc:'rgba(255,255,255,0.4)'}}>
                  {isTop?tier.roman:i+1}
                </div>
                {isTop&&<div className="tier-tag"
                  style={{color:i===0?'#FFD700':i===1?'#C0C0C0':'#CD7F32',
                          borderColor:i===0?'rgba(255,215,0,0.25)':i===1?'rgba(200,200,200,0.2)':'rgba(205,127,50,0.25)'}}>
                  {tier.label}
                </div>}
              </div>

              {/* Avatar */}
              <div className="m-avatar"
                style={{background:`hsl(${hue},45%,14%)`,border:`1.5px solid hsl(${hue},55%,28%)`}}>
                <span style={{color:`hsl(${hue},75%,68%)`}}>{row.address.slice(2,4).toUpperCase()}</span>
              </div>

              {/* Info */}
              <div className="m-info">
                <div className="m-addr-row">
                  <span className="m-addr">{shortenAddr(row.address)}</span>
                  <button className="copy-btn" onClick={()=>copyAddr(row.address)}
                    title="Copy address">{copied===row.address?'✓':'⧉'}</button>
                </div>
                <div className="m-bar-wrap">
                  <div className="m-bar-fill" style={{width:`${Math.max(share,0.5)}%`,background:barCol}}/>
                </div>
                <div className="m-share">{share.toFixed(1)}% of total tracked</div>
              </div>

              {/* Balance */}
              <div className="m-balance">
                <div className="m-bal-val"
                  style={{color:i===0?'#FFD700':i===1?'#E0E0E0':i===2?'#CD7F32':'#fff'}}>
                  {fmt(row.balance)}
                </div>
                <div className="m-bal-cur">PMT</div>
              </div>

              {/* Status */}
              <div className="m-status">
                <span className={`act-dot ${i===0?'dot-gold':isTop?'dot-silver':''}`}/>
                {isTop&&<span className="mbr-badge"
                  style={{color:i===0?'#FFD700':i===1?'#C0C0C0':'#CD7F32',
                          borderColor:i===0?'rgba(255,215,0,0.2)':i===1?'rgba(200,200,200,0.15)':'rgba(205,127,50,0.2)'}}>
                  MEMBER
                </span>}
              </div>
            </article>
          )
        })}
      </section>

      <p className="footer-note">
        Only wallets holding ≥ 1,000,000 PMT are shown · Contract: <span className="mono">{CONTRACT.slice(0,10)}…</span>
      </p>
    </div>
  )
}
