import { createConfig, http } from 'wagmi'
import { bsc } from 'viem/chains'
import { walletConnect, metaMask, injected } from 'wagmi/connectors'

export const WC_PROJECT_ID = '68140be0602e8677013cb0cf750294bc'

export const PMT_TOKEN   = '0x68Ae2F202799be2008c89e2100257e66F77DA1f3'
export const WBNB        = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'
export const USDT        = '0x55d398326f99059fF775485246999027B3197955'
export const PANCAKE_V2  = '0x10ED43C718714eb63d5aA57B78B54704E256024E'
export const BSC_CHAIN_ID = 56
// PMT-USDT pair on PancakeSwap V2 (no direct WBNB pair)
export const SWAP_PATH   = [WBNB, USDT, PMT_TOKEN]

export const wagmiConfig = createConfig({
  chains: [bsc],
  connectors: [
    metaMask(),
    walletConnect({ projectId: WC_PROJECT_ID, showQrModal: true }),
    injected(),
  ],
  transports: {
    [bsc.id]: http('https://bsc-dataseed.binance.org/'),
  },
})
