import { useState, useEffect, useCallback, useRef } from 'react'

// ── Config ────────────────────────────────────────────────────────────────────
const CONTRACT           = '0x68Ae2F202799be2008c89e2100257e66F77DA1f3'
const RPC_URL            = 'https://bsc-dataseed.binance.org/'
const ADMIN_HASH         = '8d87d4f9560d31f5cc6090b758b1be34ed707bd2bd275ead3ef7797fdd6e86c1'
const MIN_TOKENS         = 1_000_000
const REFRESH_MS         = 60_000
const REPO               = 'KamiFinance/PMT-Leaderboard-'
const WALLETS_FILE       = 'public/wallets.json'
const RAW_WALLETS_URL    = `https://raw.githubusercontent.com/${REPO}/main/${WALLETS_FILE}`
const GITHUB_API_URL     = `https://api.github.com/repos/${REPO}/contents/${WALLETS_FILE}`
const TOKEN_KEY          = 'pmt_gh_token'

const shortenAddr  = (a)  => `${a.slice(0, 6)}...${a.slice(-4)}`
const formatBalance = (n) => {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  return Math.round(n).toLocaleString()
}

async function verifyPassword(input) {
  const encoded   = new TextEncoder().encode(input)
  const hashBuf   = await crypto.subtle.digest('SHA-256', encoded)
  const hashHex   = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex === ADMIN_HASH
}

async function ethCall(data) {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: CONTRACT, data }, 'latest'] }),
  })
  return (await res.json()).result
}
async function fetchDecimals() {
  try { return parseInt(await ethCall('0x313ce567'), 16) || 18 } catch { return 18 }
}
async function fetchTokenBalance(address, decimals) {
  try {
    const padded = address.toLowerCase().replace('0x', '').padStart(64, '0')
    const raw    = BigInt(await ethCall('0x70a08231' + padded) || '0x0')
    const div    = BigInt(10) ** BigInt(decimals)
    return Number(raw / div) + Number(raw % div) / Number(div)
  } catch { return 0 }
}

async function fetchWalletsFromRepo() {
  try {
    const res = await fetch(`${RAW_WALLETS_URL}?t=${Date.now()}`)
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

async function getFileSha(token) {
  const res = await fetch(GITHUB_API_URL, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
  })
  if (!res.ok) throw new Error(`GitHub API error ${res.status}`)
  return (await res.json()).sha
}

async function commitWalletsToRepo(wallets, token) {
  const sha     = await getFileSha(token)
  const content = btoa(JSON.stringify(wallets, null, 2))
  const res = await fetch(GITHUB_API_URL, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: 'Update wallet list via admin panel', content, sha }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `GitHub API error ${res.status}`)
  }
}

const CrownIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10" style={{ verticalAlign: 'middle' }}>
    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm2 3a1 1 0 0 0 1 1h8a1 1 0 0 0 0-2H8a1 1 0 0 0-1 1z" />
  </svg>
)

export default function App() {
  const [view, setView]           = useState('leaderboard')
  const [wallets, setWallets]     = useState([])
  const [leaderboard, setLB]      = useState([])
  const [decimals, setDecimals]   = useState(18)
  const [loading, setLoading]     = useState(false)
  const [countdown, setCountdown] = useState(60)
  const [fetchError, setFetchError] = useState('')
  const [password, setPassword]   = useState('')
  const [showPwd, setShowPwd]     = useState(false)
  const [loginError, setLoginError] = useState('')
  const [newAddr, setNewAddr]     = useState('')
  const [addrError, setAddrError] = useState('')
  const [token, setToken]         = useState(() => localStorage.getItem(TOKEN_KEY) || '')
  const [showToken, setShowToken] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [saveMsg, setSaveMsg]     = useState('')
  const [copied, setCopied]       = useState(null)
  const refreshRef   = useRef(null)
  const countdownRef = useRef(null)

  // background handled by CSS body rule

  useEffect(() => { fetchWalletsFromRepo().then(setWallets) }, [])
  useEffect(() => { fetchDecimals().then(setDecimals) }, [])

  const refresh = useCallback(async () => {
    if (!wallets.length) { setLB([]); return }
    setLoading(true); setFetchError('')
    try {
      const rows = await Promise.all(
        wallets.map(async addr => ({ address: addr, balance: await fetchTokenBalance(addr, decimals) }))
      )
      setLB(rows.filter(r => r.balance >= MIN_TOKENS).sort((a, b) => b.balance - a.balance))
      setCountdown(60)
    } catch { setFetchError('Failed to fetch balances — retrying in 60s') }
    finally { setLoading(false) }
  }, [wallets, decimals])

  useEffect(() => {
    refresh()
    clearInterval(refreshRef.current)
    refreshRef.current = setInterval(refresh, REFRESH_MS)
    return () => clearInterval(refreshRef.current)
  }, [refresh])

  useEffect(() => {
    clearInterval(countdownRef.current)
    countdownRef.current = setInterval(() => setCountdown(c => c <= 1 ? 60 : c - 1), 1000)
    return () => clearInterval(countdownRef.current)
  }, [])

  useEffect(() => {
    const onKey = e => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') { e.preventDefault(); setView(v => v === 'leaderboard' ? 'login' : v) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleLogin = async () => {
    if (await verifyPassword(password)) { setView('admin'); setLoginError(''); setPassword('') }
    else setLoginError('Incorrect password')
  }

  const addWallet = () => {
    const addr = newAddr.trim()
    if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) { setAddrError('Invalid address format'); return }
    if (wallets.map(w => w.toLowerCase()).includes(addr.toLowerCase())) { setAddrError('Address already tracked'); return }
    setAddrError(''); setWallets(prev => [...prev, addr.toLowerCase()]); setNewAddr(''); setSaveMsg('')
  }

  const removeWallet = addr => { setWallets(prev => prev.filter(w => w !== addr)); setSaveMsg('') }

  const saveToRepo = async () => {
    if (!token) { setSaveMsg('error:Enter a GitHub token first'); return }
    setSaving(true); setSaveMsg('')
    try {
      await commitWalletsToRepo(wallets, token)
      localStorage.setItem(TOKEN_KEY, token)
      setSaveMsg('success:Saved! Site will redeploy in ~1 minute.')
    } catch (e) { setSaveMsg(`error:${e.message}`) }
    finally { setSaving(false) }
  }

  const copyAddress = addr => {
    navigator.clipboard.writeText(addr)
    setCopied(addr)
    setTimeout(() => setCopied(null), 1500)
  }

  const Header = ({ subtitle, actions }) => (
    <header className="header">
      <div className="header-left">
        <img src={`${import.meta.env.BASE_URL}PMT-logo.png`} alt="PMT" className="coin-logo" />
        <div>
          <h1 className="site-title">PMT Millionaires Leaderboard</h1>
          <p className="site-sub">{subtitle}</p>
        </div>
      </div>
      <div className="header-right">{actions}</div>
    </header>
  )

  if (view === 'login') return (
    <div className="page center">
      <div className="login-card">
        <div className="login-icon">🔐</div>
        <h2 className="login-title">Admin Access</h2>
        <p className="login-sub">Enter your password to manage wallets</p>
        <div className="input-row">
          <input className="text-input" type={showPwd ? 'text' : 'password'} placeholder="Password"
            value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()} autoFocus />
          <button className="icon-btn" onClick={() => setShowPwd(s => !s)}>{showPwd ? '🙈' : '👁'}</button>
        </div>
        {loginError && <p className="error-msg">{loginError}</p>}
        <button className="btn-gold" onClick={handleLogin}>Sign In</button>
        <button className="btn-ghost" onClick={() => setView('leaderboard')}>← Back</button>
      </div>
    </div>
  )

  if (view === 'admin') return (
    <div className="page">
      <Header subtitle="Admin — Wallet Manager" actions={<>
        <button className="btn-ghost sm" onClick={() => setView('leaderboard')}>← Leaderboard</button>
        <button className="btn-ghost sm danger" onClick={() => setView('leaderboard')}>Log out</button>
      </>} />
      <main className="main">
        <div className="section-label">GitHub token <span className="label-hint">(needed to save changes)</span></div>
        <div className="add-row" style={{ marginBottom: 16 }}>
          <input className="text-input mono" type={showToken ? 'text' : 'password'}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            value={token} onChange={e => setToken(e.target.value)} />
          <button className="icon-btn" onClick={() => setShowToken(s => !s)}>{showToken ? '🙈' : '👁'}</button>
        </div>
        <div className="section-label">Add wallet address</div>
        <div className="add-row">
          <input className="text-input mono" placeholder="0x..." value={newAddr}
            onChange={e => { setNewAddr(e.target.value); setAddrError('') }}
            onKeyDown={e => e.key === 'Enter' && addWallet()} />
          <button className="btn-gold sm" onClick={addWallet}>+ Add</button>
        </div>
        {addrError && <p className="error-msg" style={{ marginBottom: 12 }}>{addrError}</p>}
        <div className="section-label" style={{ marginTop: 20 }}>
          Tracked wallets <span className="count-badge">{wallets.length}</span>
        </div>
        <div className="card" style={{ marginBottom: 16 }}>
          {wallets.length === 0
            ? <div className="empty">No wallets yet — add one above</div>
            : wallets.map((addr, i) => (
              <div className="wallet-row" key={addr}>
                <span className="wallet-num">{i + 1}</span>
                <span className="wallet-addr mono">{addr}</span>
                <button className="del-btn" onClick={() => removeWallet(addr)}>Remove</button>
              </div>
            ))}
        </div>
        <button className="btn-gold" onClick={saveToRepo} disabled={saving}>
          {saving ? 'Saving…' : '💾 Save to GitHub'}
        </button>
        {saveMsg && (
          <p className={saveMsg.startsWith('success:') ? 'save-ok' : 'error-msg'} style={{ marginTop: 10 }}>
            {saveMsg.replace(/^(success|error):/, '')}
          </p>
        )}
        <p className="footer-note" style={{ marginTop: 16 }}>
          Wallets are stored in the GitHub repo — never lost when clearing browser cache.
          A GitHub token with <code>public_repo</code> scope is required to save.
        </p>
      </main>
    </div>
  )

  return (
    <div className="page">
      <Header subtitle="BNB Smart Chain · Live balances" actions={<>
        <div className="badge live">● Live</div>
        <div className="badge">Min 1,000,000 PMT</div>
        <div className="badge muted">↺ {countdown}s</div>
      </>} />
      <main className="main">
        <div className="stats-row">
          <div className="stat-card"><div className="stat-val">{leaderboard.length}</div><div className="stat-label">Millionaire holders</div></div>
          <div className="stat-card"><div className="stat-val">{leaderboard.length > 0 ? formatBalance(leaderboard[0].balance) : '—'}</div><div className="stat-label">Top balance</div></div>
          <div className="stat-card"><div className="stat-val">{wallets.length}</div><div className="stat-label">Wallets tracked</div></div>
        </div>
        <div className="card">
          <div className="table-head"><span>Rank</span><span>Wallet</span><span className="right">PMT Balance</span></div>
          {fetchError && <div className="error-row">{fetchError}</div>}
          {loading && leaderboard.length === 0
            ? <div className="loading"><span className="spinner" /> Fetching live balances…</div>
            : leaderboard.length === 0
              ? <div className="empty">{wallets.length === 0 ? 'No wallets tracked yet' : 'No wallets currently hold 1,000,000+ PMT'}</div>
              : leaderboard.map((row, i) => (
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
          }
        </div>
        <p className="footer-note">
          Only wallets holding ≥ 1,000,000 PMT are shown · Contract: <span className="mono">{CONTRACT.slice(0, 10)}…</span>
        </p>
      </main>
    </div>
  )
}
