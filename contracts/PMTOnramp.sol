// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * PMTOnramp — converts USDT directly to PMT via PancakeSwap V3 (BSC)
 *
 * Deploy this contract on BSC Mainnet.
 * After deploying, paste the contract address in Vercel as VITE_PMT_ONRAMP_CONTRACT.
 *
 * Flow:
 *   1. User approves USDT to this contract address
 *   2. User calls buyPMT(usdtAmount, minPMT)
 *   3. Contract swaps USDT → PMT via PancakeSwap V3 pool (0.25% fee)
 *   4. PMT lands directly in user's wallet — zero custody
 */

// ── Minimal ERC-20 interface ─────────────────────────────────────────────────
interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

// ── PancakeSwap V3 ExactInputSingle params (struct OUTSIDE interface) ─────────
struct ExactInputSingleParams {
    address tokenIn;
    address tokenOut;
    uint24  fee;
    address recipient;
    uint256 amountIn;
    uint256 amountOutMinimum;
    uint160 sqrtPriceLimitX96;
}

// ── PancakeSwap V3 Router interface ───────────────────────────────────────────
interface IPancakeV3Router {
    function exactInputSingle(ExactInputSingleParams calldata params)
        external returns (uint256 amountOut);
}

// ── Main contract ─────────────────────────────────────────────────────────────
contract PMTOnramp {

    // BSC Mainnet addresses
    address public constant USDT      = 0x55d398326f99059fF775485246999027B3197955;
    address public constant PMT       = 0x68Ae2F202799be2008c89e2100257e66F77DA1f3;
    address public constant V3_ROUTER = 0x13f4EA83D0bd40E75C8222255bc855a974568Dd4;
    uint24  public constant POOL_FEE  = 2500; // 0.25% USDT/PMT pool

    event Swapped(address indexed user, uint256 usdtIn, uint256 pmtOut);

    /**
     * @notice Swap USDT → PMT in a single transaction.
     * @param usdtAmount  Amount of USDT (18 decimals on BSC) to swap.
     * @param minPMTOut   Minimum PMT to receive (slippage guard).
     */
    function buyPMT(uint256 usdtAmount, uint256 minPMTOut) external returns (uint256 pmtOut) {
        require(usdtAmount > 0, "PMTOnramp: zero amount");

        // 1. Pull USDT from caller
        bool ok = IERC20(USDT).transferFrom(msg.sender, address(this), usdtAmount);
        require(ok, "PMTOnramp: transferFrom failed");

        // 2. Approve the V3 router to spend the USDT
        IERC20(USDT).approve(V3_ROUTER, usdtAmount);

        // 3. Swap and send PMT directly to caller
        pmtOut = IPancakeV3Router(V3_ROUTER).exactInputSingle(
            ExactInputSingleParams({
                tokenIn:           USDT,
                tokenOut:          PMT,
                fee:               POOL_FEE,
                recipient:         msg.sender,
                amountIn:          usdtAmount,
                amountOutMinimum:  minPMTOut,
                sqrtPriceLimitX96: 0
            })
        );

        emit Swapped(msg.sender, usdtAmount, pmtOut);
    }
}
