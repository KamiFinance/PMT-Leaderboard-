import { useState, useEffect } from 'react'

const BASE = import.meta.env.BASE_URL

const BENEFITS = [
  { icon: '◈', title: 'Network Access', desc: 'Use the international network through the Millionaires Club — personalities from business, politics, film, sport, art, media, fashion, real estate and blockchain.' },
  { icon: '⬡', title: 'Staking Rewards', desc: 'Stake your PMT tokens to generate additional returns and grow your holdings within the ecosystem.' },
  { icon: '◇', title: 'Pre-Sale Advantage', desc: 'Acquire Real World Assets (RWAs) before they are available to the public — exclusive early access.' },
  { icon: '★', title: 'VIP Events', desc: 'VIP invitation to all PMT Art Show events and international business & networking events worldwide.' },
  { icon: '◉', title: 'Your Vote Counts', desc: 'Become part of the creative process with the founders — your voice shapes the future of PMT.' },
  { icon: '⬟', title: 'Creator Connection', desc: 'Connect directly with the artist behind the Masterpieces — exclusive access to the creative mind.' },
]

const NETWORK_PHOTOS = Array.from({length:8},(_,i)=>`${BASE}network_${i+1}.jpg`)

export default function LandingPage({ onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const scrollTo = (id) => {
    setMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="lp">

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
            <button className="lp-btn-buy" onClick={()=>scrollTo('join')}>Buy PMT</button>
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
            <button className="lp-btn-primary" onClick={()=>onNavigate('leaderboard')}>View Leaderboard</button>
            <button className="lp-btn-ghost" onClick={()=>scrollTo('club')}>Discover the Club</button>
          </div>
          <div className="lp-hero-stats">
            {[['100','Max Members'],['1M+','PMT Required'],['BNB','Smart Chain']].map(([n,l])=>(
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
            {[['100','Max Members','Only the first 100 wallets qualify'],['1,000,000','PMT Required','Minimum holding to enter'],['BNB Chain','Blockchain','Fully on-chain & verifiable']].map(([n,l,d])=>(
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
              <img src={`${BASE}certificate.png`} alt="Millionaires Club Certificate" className="lp-reward-img"/>
              <div className="lp-reward-info">
                <div className="lp-reward-label">Certificate</div>
                <div className="lp-reward-name">Millionaires Club Certificate</div>
                <div className="lp-reward-spec">Numbered & gold-plated · 42cm × 32cm · Premium frame · Authorised by founder</div>
                <span className="lp-reward-badge">Limited to 100</span>
              </div>
            </div>
            <div className="lp-reward-card">
              <img src={`${BASE}coin.png`} alt="PMT Silver Coin" className="lp-reward-img lp-reward-img--coin"/>
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
              ['01','Buy PMT','Purchase PMT tokens on PancakeSwap. The token is live on BNB Smart Chain.'],
              ['02','Hold 1M+','Accumulate at least 1,000,000 PMT tokens in your wallet and hold them.'],
              ['03','Claim your spot','You automatically appear on the live leaderboard. First 100 wallets qualify.'],
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
            <button className="lp-btn-primary lp-btn-lg" onClick={()=>scrollTo('join')}>
              Buy PMT — Coming Soon
            </button>
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
              <p className="lp-footer-tagline">An exclusively limited club of 100 visionary PMT holders on BNB Smart Chain.</p>
              <div className="lp-socials">
                {[
                  ['https://t.me/','T','Telegram'],
                  ['https://twitter.com/','𝕏','Twitter/X'],
                  ['https://instagram.com/','ig','Instagram'],
                  ['https://youtube.com/','▶','YouTube'],
                  ['https://linkedin.com/','in','LinkedIn'],
                ].map(([href,icon,label])=>(
                  <a key={label} href={href} className="lp-social" aria-label={label} target="_blank" rel="noreferrer">{icon}</a>
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
