import { useState, useEffect, useCallback, useRef } from 'react'

// ── Config ───────────────────────────────────────────────────────────────────
const CONTRACT      = '0x68Ae2F202799be2008c89e2100257e66F77DA1f3'
const RPC_URL       = 'https://bsc-dataseed.binance.org/'
// Password is stored as a SHA-256 hash — never in plain text
const ADMIN_PASSWORD_HASH = '8d87d4f9560d31f5cc6090b758b1be34ed707bd2bd275ead3ef7797fdd6e86c1'

async function verifyPassword(input) {
  const encoded = new TextEncoder().encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
  const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex === ADMIN_PASSWORD_HASH
}

const MIN_TOKENS    = 1_000_000
const REFRESH_MS    = 60_000
const STORAGE_KEY   = 'pmt_wallets'

// ── Helpers ──────────────────────────────────────────────────────────────────
const shortenAddr = (a) => `${a.slice(0, 6)}...${a.slice(-4)}`

const formatBalance = (n) => {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  return Math.round(n).toLocaleString()
}

// ── BNB Smart Chain RPC ───────────────────────────────────────────────────────
async function ethCall(data) {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: CONTRACT, data }, 'latest'] }),
  })
  return (await res.json()).result
}

async function fetchDecimals() {
  try { return parseInt(await ethCall('0x313ce567'), 16) || 18 }
  catch { return 18 }
}

async function fetchTokenBalance(address, decimals) {
  try {
    const padded = address.toLowerCase().replace('0x', '').padStart(64, '0')
    const raw = BigInt(await ethCall('0x70a08231' + padded) || '0x0')
    const div = BigInt(10) ** BigInt(decimals)
    return Number(raw / div) + Number(raw % div) / Number(div)
  } catch { return 0 }
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView]             = useState('leaderboard')
  const [wallets, setWallets]       = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] }
    catch { return [] }
  })
  const [leaderboard, setLeaderboard] = useState([])
  const [decimals, setDecimals]       = useState(18)
  const [loading, setLoading]         = useState(false)
  const [countdown, setCountdown]     = useState(60)
  const [password, setPassword]       = useState('')
  const [showPwd, setShowPwd]         = useState(false)
  const [loginError, setLoginError]   = useState('')
  const [newAddr, setNewAddr]         = useState('')
  const [addError, setAddError]       = useState('')
  const [copied, setCopied]           = useState(null)
  const [fetchError, setFetchError]   = useState('')

  const refreshRef   = useRef(null)
  const countdownRef = useRef(null)

  useEffect(() => { fetchDecimals().then(setDecimals) }, [])

  const refresh = useCallback(async () => {
    if (!wallets.length) { setLeaderboard([]); return }
    setLoading(true)
    setFetchError('')
    try {
      const rows = await Promise.all(
        wallets.map(async (addr) => ({ address: addr, balance: await fetchTokenBalance(addr, decimals) }))
      )
      setLeaderboard(rows.filter((r) => r.balance >= MIN_TOKENS).sort((a, b) => b.balance - a.balance))
      setCountdown(60)
    } catch {
      setFetchError('Failed to fetch balances. Retrying in 60s…')
    } finally {
      setLoading(false)
    }
  }, [wallets, decimals])

  useEffect(() => {
    refresh()
    clearInterval(refreshRef.current)
    refreshRef.current = setInterval(refresh, REFRESH_MS)
    return () => clearInterval(refreshRef.current)
  }, [refresh])

  useEffect(() => {
    clearInterval(countdownRef.current)
    countdownRef.current = setInterval(() => setCountdown((c) => (c <= 1 ? 60 : c - 1)), 1000)
    return () => clearInterval(countdownRef.current)
  }, [])

  // Secret keyboard shortcut: Ctrl+Shift+A opens admin login
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault()
        setView((v) => v === 'leaderboard' ? 'login' : v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const saveWallets = (updated) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setWallets(updated)
  }

  const addWallet = () => {
    const addr = newAddr.trim()
    if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) { setAddError('Invalid address — must be a 42-char hex string starting with 0x'); return }
    if (wallets.includes(addr.toLowerCase())) { setAddError('This address is already being tracked'); return }
    setAddError('')
    saveWallets([...wallets, addr.toLowerCase()])
    setNewAddr('')
  }

  const removeWallet = (addr) => saveWallets(wallets.filter((w) => w !== addr))

  const handleLogin = async () => {
    const ok = await verifyPassword(password)
    if (ok) { setView('admin'); setLoginError(''); setPassword('') }
    else { setLoginError('Incorrect password — try again') }
  }

  const copyAddress = (addr) => {
    navigator.clipboard.writeText(addr)
    setCopied(addr)
    setTimeout(() => setCopied(null), 1500)
  }

  const CrownIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13" style={{marginRight:'3px',verticalAlign:'middle'}}>
      <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm2 3a1 1 0 0 0 1 1h8a1 1 0 0 0 0-2H8a1 1 0 0 0-1 1z"/>
    </svg>
  )

  // ── Login view ───────────────────────────────────────────────────────────────
  if (view === 'login') {
    return (
      <div className="page center">
        <div className="login-card">
          <div className="login-icon">🔐</div>
          <h2 className="login-title">Admin Access</h2>
          <p className="login-sub">Enter your password to manage wallets</p>
          <div className="input-row">
            <input className="text-input" type={showPwd ? 'text' : 'password'} placeholder="Password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()} autoFocus />
            <button className="icon-btn" onClick={() => setShowPwd(!showPwd)} title="Toggle visibility">
              {showPwd ? '🙈' : '👁'}
            </button>
          </div>
          {loginError && <p className="error-msg">{loginError}</p>}
          <button className="btn-gold" onClick={handleLogin}>Sign In</button>
          <button className="btn-ghost" onClick={() => setView('leaderboard')}>← Back to leaderboard</button>
        </div>
      </div>
    )
  }

  // ── Admin view ───────────────────────────────────────────────────────────────
  if (view === 'admin') {
    return (
      <div className="page">
        <header className="header">
          <div className="header-left">
            <img src="./PMT-logo.png" alt="PMT" className="coin-logo" />
            <div>
              <h1 className="site-title">PMT Millionaires Leaderboard</h1>
              <p className="site-sub">Admin — Wallet Manager</p>
            </div>
          </div>
          <div className="header-right">
            <button className="btn-ghost sm" onClick={() => setView('leaderboard')}>← Leaderboard</button>
            <button className="btn-ghost sm danger" onClick={() => setView('leaderboard')}>Log out</button>
          </div>
        </header>
        <main className="main">
          <div className="section-label">Add wallet address</div>
          <div className="add-row">
            <input className="text-input mono" placeholder="0x... wallet address" value={newAddr}
              onChange={(e) => { setNewAddr(e.target.value); setAddError('') }}
              onKeyDown={(e) => e.key === 'Enter' && addWallet()} />
            <button className="btn-gold sm" onClick={addWallet}>+ Add</button>
          </div>
          {addError && <p className="error-msg">{addError}</p>}
          <div className="section-label" style={{ marginTop: '20px' }}>
            Tracked wallets <span className="count-badge">{wallets.length}</span>
          </div>
          <div className="card">
            {wallets.length === 0 ? (
              <div className="empty">No wallets added yet — add one above</div>
            ) : (
              wallets.map((addr, i) => (
                <div className="wallet-row" key={addr}>
                  <span className="wallet-num">{i + 1}</span>
                  <span className="wallet-addr mono">{addr}</span>
                  <button className="del-btn" onClick={() => removeWallet(addr)}>Remove</button>
                </div>
              ))
            )}
          </div>
          <p className="footer-note">Wallets with &lt; 1,000,000 PMT will not appear on the leaderboard</p>
        </main>
      </div>
    )
  }

  // ── Leaderboard view ─────────────────────────────────────────────────────────
  return (
    <div className="page">
      <header className="header">
        <div className="header-left">
          <img src="./PMT-logo.png" alt="PMT" className="coin-logo" />
          <div>
            <h1 className="site-title">PMT Millionaires Leaderboard</h1>
            <p className="site-sub">BNB Smart Chain · Live balances</p>
          </div>
        </div>
        <div className="header-right">
          <div className="badge live">● Live</div>
          <div className="badge">Min 1,000,000 PMT</div>
          <div className="badge muted">↺ {countdown}s</div>
          {/* Admin accessible via Ctrl+Shift+A */}
        </div>
      </header>
      <main className="main">
        <div className="stats-row">
          <div className="stat-card"><div className="stat-val">{leaderboard.length}</div><div className="stat-label">Millionaire holders</div></div>
          <div className="stat-card"><div className="stat-val">{leaderboard.length > 0 ? formatBalance(leaderboard[0].balance) : '—'}</div><div className="stat-label">Top balance</div></div>
          <div className="stat-card"><div className="stat-val">{wallets.length}</div><div className="stat-label">Wallets tracked</div></div>
        </div>
        <div className="card">
          <div className="table-head">
            <span>Rank</span><span>Wallet</span><span className="right">PMT Balance</span>
          </div>
          {fetchError && <div className="error-row">{fetchError}</div>}
          {loading && leaderboard.length === 0 ? (
            <div className="loading"><span className="spinner" /> Fetching live balances…</div>
          ) : leaderboard.length === 0 ? (
            <div className="empty">
              {wallets.length === 0 ? 'No wallets tracked yet — go to Admin to add wallets' : 'No wallets currently hold 1,000,000+ PMT'}
            </div>
          ) : (
            leaderboard.map((row, i) => (
              <div key={row.address} className={`lb-row ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}`}>
                <span className={`rank-badge ${i === 0 ? 'rank-gold' : i === 1 ? 'rank-silver' : i === 2 ? 'rank-bronze' : 'rank-default'}`}>
                  {i < 3 && <CrownIcon />}{i + 1}
                </span>
                <span className="addr-cell">
                  <span className="mono addr">{shortenAddr(row.address)}</span>
                  <button className="copy-btn" onClick={() => copyAddress(row.address)} title="Copy full address">
                    {copied === row.address ? '✓' : '⧉'}
                  </button>
                </span>
                <span className="balance">{formatBalance(row.balance)} <small>PMT</small></span>
              </div>
            ))
          )}
        </div>
        <p className="footer-note">
          Only wallets holding ≥ 1,000,000 PMT are displayed · Contract: <span className="mono">{CONTRACT.slice(0, 10)}…</span>
        </p>
      </main>
    </div>
  )
}
