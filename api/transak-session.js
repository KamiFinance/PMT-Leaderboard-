export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { walletAddress } = req.body || {}

  const apiKey      = process.env.VITE_TRANSAK_API_KEY
  const accessToken = process.env.TRANSAK_ACCESS_TOKEN
  const isStaging   = process.env.TRANSAK_ENV !== 'production'
  const widgetBase  = isStaging ? 'https://global-stg.transak.com' : 'https://global.transak.com'
  const apiBase     = isStaging
    ? 'https://api-gateway-stg.transak.com'
    : 'https://api-gateway.transak.com'

  const widgetParams = {
    apiKey,
    network: 'bsc',
    cryptoCurrencyCode: 'USDT',
    defaultCryptoCurrency: 'USDT',
    themeColor: 'FFD700',
    backgroundColor: '0D0D12',
    hideMenu: 'true',
    exchangeScreenTitle: 'Buy USDT for PMT',
    ...(walletAddress && {
      walletAddress,
      disableWalletAddressForm: 'true',
    }),
  }

  // If no access token — use direct URL (works when domain is whitelisted in Transak dashboard)
  if (!accessToken) {
    const params = new URLSearchParams(widgetParams)
    return res.status(200).json({ widgetUrl: `${widgetBase}/?${params.toString()}` })
  }

  // With access token — use secure session API
  try {
    const response = await fetch(`${apiBase}/api/v2/auth/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access-token': accessToken,
      },
      body: JSON.stringify({
        widgetParams: {
          ...widgetParams,
          referrerDomain: isStaging ? 'global-stg.transak.com' : 'pmtmillionaires.com',
        }
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      console.error('Transak session error:', JSON.stringify(data))
      return res.status(response.status).json({ error: data.message || 'Session creation failed', raw: data })
    }
    return res.status(200).json({ widgetUrl: data.data.widgetUrl })
  } catch (err) {
    console.error('Transak fetch error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
