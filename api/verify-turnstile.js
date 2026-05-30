export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { token, name, wallet, telegram, email, about } = req.body
  if (!token || !wallet || !telegram) return res.status(400).json({ error: 'Missing fields' })

  // Verify Turnstile token with Cloudflare
  const cf = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: process.env.TURNSTILE_SECRET_KEY,
      response: token,
      remoteip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress
    })
  })
  const cfData = await cf.json()
  if (!cfData.success) return res.status(403).json({ error: 'Bot detected', details: cfData['error-codes'] })

  // Insert into Supabase
  const sb = await fetch(`${process.env.SUPABASE_URL}/rest/v1/spot_requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ name, wallet, telegram, email, about })
  })

  if (!sb.ok && sb.status !== 201) {
    const err = await sb.text()
    return res.status(500).json({ error: 'DB insert failed', details: err })
  }

  res.status(200).json({ success: true })
}
