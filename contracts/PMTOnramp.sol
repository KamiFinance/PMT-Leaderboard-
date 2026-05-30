// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;
// ^^^ IMPORTANT: Use 0.8.19 (NOT 0.8.20+) to avoid PUSH0 opcodes unsupported by BSC

/**
 * PMTOnramp — swaps USDT directly to PMT via PancakeSwap V3 on BSC.
 *
 * ═══════════════════════════════════════════════════════════════
 *  REMIX DEPLOY CHECKLIST — follow exactly or deployment fails:
 *
 *  COMPILER tab:
 *    • Compiler version : 0.8.19
 *    • EVM version      : paris     ← CRITICAL for BSC
 *    • Optimization     : enabled, 200 runs
 *
 *  DEPLOY & RUN tab:
 *    • Environment : Injected Provider - MetaMask
 *    • MetaMask    : BSC Mainnet (chain ID 56)
 *    • Contract    : PMTOnramp   ← select this (only one shown)
 *    • No constructor arguments needed
 *    • Click Deploy
 * ═══════════════════════════════════════════════════════════════
 */
contract PMTOnramp {

    address private constant USDT      = 0x55d398326f99059fF775485246999027B3197955;
    address private constant PMT       = 0x68Ae2F202799be2008c89e2100257e66F77DA1f3;
    address private constant V3_ROUTER = 0x13f4EA83D0bd40E75C8222255bc855a974568Dd4;
    uint24  private constant POOL_FEE  = 2500;

    event Swapped(address indexed user, uint256 usdtIn, uint256 pmtOut);

    /**
     * @notice Swap USDT -> PMT in one transaction.
     * Caller must first call: USDT.approve(thisContractAddress, usdtAmount)
     *
     * @param usdtAmount  USDT amount to swap (18 decimals on BSC).
     * @param minPMTOut   Minimum PMT to receive (slippage protection).
     */
    function buyPMT(uint256 usdtAmount, uint256 minPMTOut) external {
        require(usdtAmount > 0, "PMTOnramp: zero amount");

        // Pull USDT from caller
        _safeCall(USDT, abi.encodeWithSelector(
            bytes4(keccak256("transferFrom(address,address,uint256)")),
            msg.sender, address(this), usdtAmount
        ));

        // Approve router
        _safeCall(USDT, abi.encodeWithSelector(
            bytes4(keccak256("approve(address,uint256)")),
            V3_ROUTER, usdtAmount
        ));

        // exactInputSingle: USDT -> PMT, PMT sent directly to caller
        bytes memory callData = abi.encodeWithSelector(
            bytes4(keccak256("exactInputSingle((address,address,uint24,address,uint256,uint256,uint160))")),
            USDT, PMT, POOL_FEE, msg.sender, usdtAmount, minPMTOut, uint160(0)
        );
        (bool ok, bytes memory ret) = V3_ROUTER.call(callData);
        require(ok, "PMTOnramp: swap failed");

        uint256 pmtOut = abi.decode(ret, (uint256));
        emit Swapped(msg.sender, usdtAmount, pmtOut);
    }

    function _safeCall(address target, bytes memory data) private {
        (bool ok,) = target.call(data);
        require(ok, "PMTOnramp: call failed");
    }
}
