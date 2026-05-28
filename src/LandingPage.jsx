import { useState, useEffect } from 'react'
import WalletModal from './WalletModal.jsx'

const BASE = import.meta.env.BASE_URL

const BENEFITS = [
  { icon: '◈', title: 'Network Access', desc: 'Use the international network through the Millionaires Club — personalities from business, politics, film, sport, art, media, fashion, real estate and blockchain.' },
  { icon: '⬡', title: 'Millionaires Node', desc: 'As a Millionaires Club member you operate a node on the PMT Chain — validating transactions, securing the network and earning node rewards.' },
  { icon: '◇', title: 'Pre-Sale Advantage', desc: 'Acquire Real World Assets (RWAs) before they are available to the public — exclusive early access.' },
  { icon: '★', title: 'VIP Events', desc: 'VIP invitation to all PMT Art Show events and international business & networking events worldwide.' },
  { icon: '◉', title: 'Your Vote Counts', desc: 'Become part of the creative process with the founders — your voice shapes the future of PMT.' },
  { icon: '⬟', title: 'Creator Connection', desc: 'Connect directly with the artist behind the Masterpieces — exclusive access to the creative mind.' },
]

const NETWORK_PHOTOS = Array.from({length:8},(_,i)=>`${BASE}network_${i+1}.jpg`)

export default function LandingPage({ onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [memberCount, setMemberCount] = useState(null)
  const [showBuyTip, setShowBuyTip] = useState(false)
  const [showWallet, setShowWallet] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    fetch(`${BASE}wallets.json`)
      .then(r=>r.json())
      .then(list=>setMemberCount(list.length))
      .catch(()=>{})
  }, [])

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  // TODO: replace with internal swap function when PMT Chain is live
  const handleBuyPmt = () => {
    setShowBuyTip(true)
    setTimeout(() => setShowBuyTip(false), 2500)
  }

  const scrollTo = (id) => {
    setMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="lp">

      {showWallet&&<WalletModal onSuccess={()=>{setShowWallet(false);onNavigate('leaderboard')}} onClose={()=>setShowWallet(false)}/>}

      {/* ── HEADER ── */}
      <header className={`lp-header${scrolled?' lp-header--scrolled':''}`}>
        <div className="lp-header-inner">
          <div className="lp-logo" onClick={() => scrollTo('hero')}>
            <img src={`${BASE}PMT-logo.png`} alt="PMT" className="lp-logo-img"/>
            <span className="lp-logo-text"><span className="lp-logo-pmt">PMT</span> Millionaires Club</span>
          </div>

          <nav className={`lp-nav${menuOpen?' lp-nav--open':''}`}>
            {[['hero','Home'],['club','Club'],['benefits','Benefits'],['rewards','Rewards'],['join','How to Join'],['network','Network']].map(([id,label])=>(
              <button key={id} className="lp-nav-link" onClick={()=>scrollTo(id)}>{label}</button>
            ))}
          </nav>

          <div className="lp-header-right">
            <div style={{position:'relative'}}>
              <button className="lp-btn-buy" onClick={handleBuyPmt}>Buy PMT</button>
              {showBuyTip&&<div style={{position:'fixed',top:70,right:24,background:'rgba(18,16,10,.98)',border:'1px solid rgba(255,215,0,.3)',borderRadius:8,padding:'10px 16px',whiteSpace:'nowrap',fontSize:12,color:'rgba(255,255,255,.8)',zIndex:9999,boxShadow:'0 4px 20px rgba(0,0,0,.5)'}}>
                🔒 Swap coming soon
              </div>}
            </div>
            <button className="lp-hamburger" onClick={()=>setMenuOpen(s=>!s)} aria-label="Menu">
              <span/><span/><span/>
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="lp-hero" id="hero">
        <img src={`${BASE}david.png`} alt="" className="lp-hero-david" aria-hidden="true"/>
        <div className="lp-hero-content">
          <p className="lp-hero-eyebrow">Public Masterpiece</p>
          <h1 className="lp-hero-h1"><span className="gold">PMT</span> Millionaires Club</h1>
          <p className="lp-hero-tag">The elite holders of the PMT ecosystem.</p>
          <div className="lp-hero-btns">
            <button className="lp-btn-primary" onClick={()=>setShowWallet(true)}>View Leaderboard</button>
            <button className="lp-btn-ghost" onClick={()=>scrollTo('club')}>Discover the Club</button>
          </div>
          <div className="lp-hero-stats">
            {[['100','Max Members'],['1M+','PMT Required'],['PMT','Chain']].map(([n,l])=>(
              <div key={l} className="lp-hero-stat">
                <div className="lp-hero-stat-n">{n}</div>
                <div className="lp-hero-stat-l">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT IS THE CLUB ── */}
      <section className="lp-section" id="club">
        <div className="lp-section-inner">
          <span className="lp-badge">The Club</span>
          <h2 className="lp-section-title">What is the <span className="gold">PMT Millionaires Club?</span></h2>
          <p className="lp-section-desc">An exclusively limited club of visionary personalities who position themselves innovatively and future-oriented — to secure the benefits of a strong international network and access to unique privileges.</p>
          <div className="lp-three-cols">
            {[['100','Max Members','Only the first 100 wallets qualify'],['1,000,000','PMT Required','Minimum holding to enter'],['PMT Chain','Blockchain','Fully on-chain & verifiable']].map(([n,l,d])=>(
              <div key={l} className="lp-info-card">
                <div className="lp-info-n">{n}</div>
                <div className="lp-info-l">{l}</div>
                <div className="lp-info-d">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BENEFITS ── */}
      <section className="lp-section lp-section--alt" id="benefits">
        <div className="lp-section-inner">
          <span className="lp-badge">Member Benefits</span>
          <h2 className="lp-section-title">What you <span className="gold">get</span></h2>
          <p className="lp-section-desc">Every member enjoys exclusive privileges across the entire PMT ecosystem and beyond.</p>
          <div className="lp-benefits-grid">
            {BENEFITS.map(b=>(
              <div key={b.title} className="lp-benefit-card">
                <div className="lp-benefit-icon">{b.icon}</div>
                <div className="lp-benefit-title">{b.title}</div>
                <div className="lp-benefit-desc">{b.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PHYSICAL REWARDS ── */}
      <section className="lp-section" id="rewards">
        <div className="lp-section-inner">
          <span className="lp-badge">Physical Rewards</span>
          <h2 className="lp-section-title">Your <span className="gold">Membership Package</span></h2>
          <p className="lp-section-desc">Each of the 100 members receives two exclusive physical collectibles — numbered and strictly limited.</p>
          <div className="lp-rewards-row">
            <div className="lp-reward-card">
              <div className="lp-reward-img-wrap">
                <img src={`${BASE}certificate.png`} alt="Millionaires Club Certificate" className="lp-reward-img"/>
              </div>
              <div className="lp-reward-info">
                <div className="lp-reward-label">Certificate</div>
                <div className="lp-reward-name">Millionaires Club Certificate</div>
                <div className="lp-reward-spec">Numbered & gold-plated · 42cm × 32cm · Premium frame · Authorised by founder</div>
                <span className="lp-reward-badge">Limited to 100</span>
              </div>
            </div>
            <div className="lp-reward-card">
              <div className="lp-reward-img-wrap">
                <img src={`${BASE}coin.png`} alt="PMT Silver Coin" className="lp-reward-img lp-reward-img--coin"/>
              </div>
              <div className="lp-reward-info">
                <div className="lp-reward-label">Silver Coin</div>
                <div className="lp-reward-name">PMT Silver Coin</div>
                <div className="lp-reward-spec">925 silver · 90g · 5cm diameter · Public Masterpiece Token design</div>
                <span className="lp-reward-badge">Limited to 100</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW TO JOIN ── */}
      <section className="lp-section lp-section--alt" id="join">
        <div className="lp-section-inner">
          <span className="lp-badge">How to Join</span>
          <h2 className="lp-section-title">Secure your <span className="gold">spot</span></h2>
          <p className="lp-section-desc">Only 3 steps to become a PMT Millionaire. Only 100 spots available — worldwide.</p>
          <div className="lp-steps">
            {[
              ['01','Buy PMT','Purchase PMT tokens on PancakeSwap. The token is live on PMT Chain.'],
              ['02','Hold 1M+','Accumulate at least 1,000,000 PMT tokens in your wallet and hold them.'],
              ['03','Request a Spot','Send an email to info@publicmasterpiece.com with your wallet address, your Telegram @username, and a short introduction about yourself.'],
            ].map(([n,t,d],i)=>(
              <div key={n} className="lp-step">
                <div className="lp-step-num">{n}</div>
                <div className="lp-step-title">{t}</div>
                <div className="lp-step-desc">{d}</div>
                {i<2&&<div className="lp-step-arrow">→</div>}
              </div>
            ))}
          </div>
          <div style={{textAlign:'center',marginTop:32}}>
            <a
              href="mailto:info@publicmasterpiece.com?subject=PMT%20Millionaires%20Club%20%E2%80%94%20Spot%20Request&body=Hi%20PMT%20Team%2C%0A%0AI%20would%20like%20to%20request%20a%20spot%20in%20the%20Millionaires%20Club.%0A%0AWallet%20Address%3A%20%0ATelegram%20%40%3A%20%0A%0AAbout%20me%3A%20"
              className="lp-btn-primary lp-btn-lg"
              style={{display:'inline-block',textDecoration:'none'}}
            >
              ✉ Request a Spot
            </a>
          </div>
        </div>
      </section>

      {/* ── NETWORK ── */}
      <section className="lp-section" id="network">
        <div className="lp-section-inner">
          <span className="lp-badge">Our Network</span>
          <h2 className="lp-section-title">Global <span className="gold">connections</span></h2>
          <p className="lp-section-desc">The global Public Masterpiece network includes outstanding personalities from business, politics, film & TV, sport, art, media, fashion, real estate and blockchain.</p>
          <div className="lp-network-grid">
            {NETWORK_PHOTOS.map((src,i)=>(
              <div key={i} className="lp-network-photo">
                <img src={src} alt={`Partner ${i+1}`} loading="lazy"/>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── EVENTS PLACEHOLDER ── */}
      <section className="lp-section lp-section--alt" id="events">
        <div className="lp-section-inner" style={{textAlign:'center'}}>
          <span className="lp-badge">Events</span>
          <h2 className="lp-section-title">PMT <span className="gold">Events</span></h2>
          <p className="lp-section-desc" style={{margin:'0 auto 32px'}}>PMT Millionaires Club members are invited as VIP guests to every event.</p>
          <div className="lp-events-placeholder">
            <div className="lp-event-card">
              <div className="lp-event-thumb">▶</div>
              <div className="lp-event-label">Dubai AI & Web3 Festival</div>
            </div>
            <div className="lp-event-card">
              <div className="lp-event-thumb">▶</div>
              <div className="lp-event-label">PMT Art Show Event</div>
            </div>
          </div>
          <p style={{fontSize:11,color:'rgba(255,255,255,.3)',marginTop:16}}>Video content coming soon</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-top">
            <div className="lp-footer-brand">
              <div className="lp-footer-logo">
                <img src={`${BASE}PMT-logo.png`} alt="PMT" className="lp-logo-img"/>
                <span className="lp-logo-text"><span className="lp-logo-pmt">PMT</span> Millionaires Club</span>
              </div>
              <p className="lp-footer-tagline">An exclusively limited club of 100 visionary PMT holders on PMT Chain.</p>
              <div className="lp-socials">
                {[
                {href:'https://t.me/', label:'Telegram', svg:<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>},
                {href:'https://twitter.com/', label:'Twitter/X', svg:<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>},
                {href:'https://instagram.com/', label:'Instagram', svg:<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>},
                {href:'https://youtube.com/', label:'YouTube', svg:<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>},
                {href:'https://linkedin.com/', label:'LinkedIn', svg:<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>},
              ].map(({href,label,svg})=>(
                <a key={label} href={href} className="lp-social" aria-label={label} target="_blank" rel="noreferrer">{svg}</a>
              ))}
              </div>
            </div>
            <div>
              <p className="lp-footer-col-title">Quick Links</p>
              <div className="lp-footer-links">
                {[['hero','Home'],['club','The Club'],['benefits','Benefits'],['rewards','Rewards'],['join','How to Join'],['network','Network']].map(([id,label])=>(
                  <button key={id} onClick={()=>scrollTo(id)}>{label}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="lp-footer-col-title">Contact</p>
              <div className="lp-footer-links">
                <a href="mailto:info@publicmasterpiece.com">info@publicmasterpiece.com</a>
                <a href="https://www.publicmasterpiece.com" target="_blank" rel="noreferrer">www.publicmasterpiece.com</a>
                <span>Digital Park · Dubai Silicon Oasis · UAE</span>
              </div>
            </div>
          </div>
          <div className="lp-footer-bottom">
            <span>© 2025 PMT Millionaires Club · Public Masterpiece · All rights reserved</span>
            <span className="lp-footer-contract">Contract: 0x68Ae2F202799be2008c89e2100257e66F77DA1f3</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
