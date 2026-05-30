export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { walletAddress } = req.body || {}

  const apiKey         = process.env.VITE_TRANSAK_API_KEY
  const accessToken    = process.env.TRANSAK_ACCESS_TOKEN  // Partner access token
  const isStaging      = process.env.TRANSAK_ENV !== 'production'
  const apiBase        = isStaging
    ? 'https://api-gateway-stg.transak.com'
    : 'https://api-gateway.transak.com'
  const referrerDomain = isStaging ? 'global-stg.transak.com' : 'pmtmillionaires.com'

  const widgetParams = {
    apiKey,
    referrerDomain,
    network: 'bsc',
    cryptoCurrencyCode: 'USDT',
    defaultCryptoCurrency: 'USDT',
    themeColor: 'FFD700',
    hideMenu: 'true',
    exchangeScreenTitle: 'Buy USDT for PMT',
    ...(walletAddress && {
      walletAddress,
      disableWalletAddressForm: 'true',
    }),
  }

  try {
    const response = await fetch(`${apiBase}/api/v2/auth/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { 'access-token': accessToken }),
      },
      body: JSON.stringify({ widgetParams }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Transak session error:', data)
      return res.status(response.status).json({ error: data.message || 'Session creation failed', raw: data })
    }

    return res.status(200).json({ widgetUrl: data.data.widgetUrl })
  } catch (err) {
    console.error('Transak session fetch error:', err)
    return res.status(500).json({ error: err.message })
  }
}
