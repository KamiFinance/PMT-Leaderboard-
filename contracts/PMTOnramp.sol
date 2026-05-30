// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                        PMTOnramp                            ║
 * ║  Swaps USDT → PMT via PancakeSwap V3 on BSC in one tx.     ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  DEPLOY IN REMIX:                                           ║
 * ║  1. Paste this file — Remix sees ONLY "PMTOnramp"           ║
 * ║  2. Compiler: 0.8.20, EVM: Paris                           ║
 * ║  3. Deploy & Run → Injected Provider → BSC Mainnet          ║
 * ║  4. Hit Deploy — no constructor args needed                 ║
 * ╚══════════════════════════════════════════════════════════════╝
 */
contract PMTOnramp {

    address private constant USDT      = 0x55d398326f99059fF775485246999027B3197955;
    address private constant PMT       = 0x68Ae2F202799be2008c89e2100257e66F77DA1f3;
    address private constant V3_ROUTER = 0x13f4EA83D0bd40E75C8222255bc855a974568Dd4;
    uint24  private constant POOL_FEE  = 2500;

    event Swapped(address indexed user, uint256 usdtIn, uint256 pmtOut);

    /**
     * @notice Swap USDT → PMT. Caller must approve USDT first.
     * @param usdtAmount  Amount of USDT (18 dec) to spend.
     * @param minPMTOut   Minimum PMT to accept (slippage guard).
     */
    function buyPMT(uint256 usdtAmount, uint256 minPMTOut) external {
        require(usdtAmount > 0, "PMTOnramp: zero amount");

        // --- pull USDT from user ---
        _call(USDT, abi.encodeWithSelector(
            bytes4(keccak256("transferFrom(address,address,uint256)")),
            msg.sender, address(this), usdtAmount
        ));

        // --- approve router ---
        _call(USDT, abi.encodeWithSelector(
            bytes4(keccak256("approve(address,uint256)")),
            V3_ROUTER, usdtAmount
        ));

        // --- exactInputSingle on PancakeSwap V3 ---
        // Struct: (address tokenIn, address tokenOut, uint24 fee,
        //          address recipient, uint256 amountIn,
        //          uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)
        bytes memory swapCall = abi.encodeWithSelector(
            bytes4(keccak256("exactInputSingle((address,address,uint24,address,uint256,uint256,uint160))")),
            USDT, PMT, POOL_FEE, msg.sender, usdtAmount, minPMTOut, uint160(0)
        );
        (bool ok, bytes memory result) = V3_ROUTER.call(swapCall);
        require(ok, "PMTOnramp: swap failed");

        uint256 pmtOut = abi.decode(result, (uint256));
        emit Swapped(msg.sender, usdtAmount, pmtOut);
    }

    // Internal helper — reverts on failure
    function _call(address target, bytes memory data) private {
        (bool ok,) = target.call(data);
        require(ok, "PMTOnramp: call failed");
    }
}
