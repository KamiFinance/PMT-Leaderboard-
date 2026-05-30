// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * PMTOnramp — converts USDT directly to PMT via PancakeSwap V3
 * Deployed on BSC (BNB Smart Chain)
 *
 * Flow:
 *   1. User approves USDT to this contract address
 *   2. User calls buyPMT(usdtAmount, minPMT)
 *   3. Contract swaps USDT → PMT via PancakeSwap V3 (fee 0.25%)
 *   4. PMT lands directly in user's wallet — no custody
 */

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IPancakeV3Router {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24  fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    function exactInputSingle(ExactInputSingleParams calldata params)
        external returns (uint256 amountOut);
}

contract PMTOnramp {
    // ── Constants (BSC mainnet) ─────────────────────────────────────
    address public constant USDT       = 0x55d398326f99059fF775485246999027B3197955;
    address public constant PMT        = 0x68Ae2F202799be2008c89e2100257e66F77DA1f3;
    address public constant V3_ROUTER  = 0x13f4EA83D0bd40E75C8222255bc855a974568Dd4;
    uint24  public constant POOL_FEE   = 2500; // 0.25% — the USDT/PMT pool fee

    // ── Events ──────────────────────────────────────────────────────
    event Swapped(address indexed user, uint256 usdtIn, uint256 pmtOut);

    /**
     * @notice Swap USDT → PMT in one transaction.
     * @param usdtAmount   Amount of USDT (18 decimals) to swap.
     * @param minPMTOut    Minimum PMT to receive (slippage protection).
     */
    function buyPMT(uint256 usdtAmount, uint256 minPMTOut) external {
        require(usdtAmount > 0, "Amount must be > 0");

        // Pull USDT from user
        require(
            IERC20(USDT).transferFrom(msg.sender, address(this), usdtAmount),
            "USDT transfer failed"
        );

        // Approve PancakeSwap V3 router
        IERC20(USDT).approve(V3_ROUTER, usdtAmount);

        // Swap USDT → PMT, PMT goes directly to msg.sender
        uint256 pmtReceived = IPancakeV3Router(V3_ROUTER).exactInputSingle(
            IPancakeV3Router.ExactInputSingleParams({
                tokenIn:           USDT,
                tokenOut:          PMT,
                fee:               POOL_FEE,
                recipient:         msg.sender,
                amountIn:          usdtAmount,
                amountOutMinimum:  minPMTOut,
                sqrtPriceLimitX96: 0
            })
        );

        emit Swapped(msg.sender, usdtAmount, pmtReceived);
    }

    /// @notice Rescue any stuck tokens (safety valve — owner not needed)
    function rescueTokens(address token, address to, uint256 amount) external {
        // Anyone can call but only sends to `to` — useful if USDT gets stuck
        require(to != address(0), "Zero address");
        IERC20(token).approve(to, amount);
    }
}
