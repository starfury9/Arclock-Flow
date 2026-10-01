// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Minimal mintable ERC-20 standing in for Arc's USDC during local
/// Hardhat testing. Arc's real USDC is a native coin with an ERC-20 view;
/// for unit tests of ArcLock's escrow logic, a standard 6-decimal ERC-20 is
/// a faithful enough substitute since ArcLock only calls transferFrom/transfer.
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
