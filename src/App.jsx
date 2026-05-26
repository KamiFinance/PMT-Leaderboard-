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
  if (usd >= 1e9) return `$${(usd/1e9).toFixed(2)}B`
  if (usd >= 1e6) return `$${(usd/1e6).toFixed(2)}M`
  if (usd >= 1e3) return `$${(usd/1e3).toFixed(1)}K`
  return `$${usd.toFixed(2)}`
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
    // DexScreener — CORS-enabled, returns live USD price for any token
    const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${CONTRACT}`)
    if(!r.ok) return 0
    const d = await r.json()
    const pairs = (d.pairs||[]).filter(p=>p.chainId==='bsc'&&parseFloat(p.priceUsd||0)>0)
    if(!pairs.length) return 0
    // Pick pair with most liquidity
    pairs.sort((a,b)=>(b.liquidity?.usd||0)-(a.liquidity?.usd||0))
    return parseFloat(pairs[0].priceUsd)||0
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
  return <img src={`${import.meta.env.BASE_URL}trophy.png`} alt="Top Balance" style={{width:28,height:28,objectFit:'contain'}}/>
}
function IconTrend() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
}
function IconCoins() {
  return <img src={`${import.meta.env.BASE_URL}token.png`} alt="Total Balance" style={{width:28,height:28,objectFit:'contain'}}/>
}
