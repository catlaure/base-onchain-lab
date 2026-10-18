import { parseAbi } from "viem";

export const erc20Abi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);

export const vestingAbi = parseAbi([
  "function token() view returns (address)",
  "function beneficiary() view returns (address)",
  "function start() view returns (uint64)",
  "function cliff() view returns (uint64)",
  "function duration() view returns (uint64)",
  "function released() view returns (uint256)",
  "function releasable() view returns (uint256)",
  "function vestedAmount(uint64 timestamp) view returns (uint256)",
  "event Released(address indexed beneficiary, uint256 amount)",
]);

export const faucetAbi = parseAbi([
  "function token() view returns (address)",
  "function dripAmount() view returns (uint256)",
  "function cooldown() view returns (uint256)",
  "function nextClaimAt(address account) view returns (uint256)",
  "event Claimed(address indexed account, uint256 amount)",
]);
