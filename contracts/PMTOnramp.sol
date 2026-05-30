// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * PMTOnramp — swaps USDT directly to PMT via PancakeSwap V3 on BSC.
 *
 * HOW TO DEPLOY IN REMIX:
 *   1. Paste this file into Remix
 *   2. Compile with Solidity 0.8.20
 *   3. In "Deploy & Run": set Environment to "Injected Provider - MetaMask"
 *   4. Make sure MetaMask is on BSC Mainnet (chainId 56)
 *   5. Click Deploy  ← only ONE contract appears, no confusion
 *
 * After deploy: copy the contract address to Vercel as VITE_PMT_ONRAMP_CONTRACT
 */
contract PMTOnramp {

    // ── BSC Mainnet addresses ──────────────────────────────────────────
    address private constant USDT      = 0x55d398326f99059fF775485246999027B3197955;
    address private constant PMT       = 0x68Ae2F202799be2008c89e2100257e66F77DA1f3;
    address private constant V3_ROUTER = 0x13f4EA83D0bd40E75C8222255bc855a974568Dd4;
    uint24  private constant POOL_FEE  = 2500; // 0.25%

    event Swapped(address indexed user, uint256 usdtIn, uint256 pmtOut);

    /**
     * @notice One-click USDT → PMT swap.
     *
     * Pre-condition: caller must have called USDT.approve(thisAddress, usdtAmount)
     *
     * @param usdtAmount  USDT to spend (18 decimals on BSC).
     * @param minPMTOut   Minimum PMT to accept (slippage protection).
     */
    function buyPMT(uint256 usdtAmount, uint256 minPMTOut) external {
        require(usdtAmount > 0, "zero amount");

        // 1 — pull USDT from caller into this contract
        (bool t,) = USDT.call(
            abi.encodeWithSignature(
                "transferFrom(address,address,uint256)",
                msg.sender, address(this), usdtAmount
            )
        );
        require(t, "transferFrom failed");

        // 2 — approve router to spend USDT
        USDT.call(abi.encodeWithSignature("approve(address,uint256)", V3_ROUTER, usdtAmount));

        // 3 — exactInputSingle: swap USDT → PMT, tokens go straight to caller
        bytes memory params = abi.encode(
            USDT,           // tokenIn
            PMT,            // tokenOut
            POOL_FEE,       // fee (2500 = 0.25%)
            msg.sender,     // recipient
            usdtAmount,     // amountIn
            minPMTOut,      // amountOutMinimum
            uint160(0)      // sqrtPriceLimitX96 (no limit)
        );
        (bool s, bytes memory ret) = V3_ROUTER.call(
            abi.encodeWithSignature("exactInputSingle((address,address,uint24,address,uint256,uint256,uint160))", params)
        );
        require(s, "swap failed");

        uint256 pmtOut = abi.decode(ret, (uint256));
        emit Swapped(msg.sender, usdtAmount, pmtOut);
    }
}
