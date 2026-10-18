import type { Address, PublicClient } from "viem";
import { erc20Abi } from "./abi.js";
import { formatAmount } from "./format.js";

/** Only the part of the client we need, so tests can pass a tiny fake. */
export type ReadClient = Pick<PublicClient, "readContract">;

export interface TokenInfo {
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
}

export async function getTokenInfo(client: ReadClient, token: Address): Promise<TokenInfo> {
  const read = <T extends "name" | "symbol" | "decimals" | "totalSupply">(functionName: T) =>
    client.readContract({ address: token, abi: erc20Abi, functionName });

  const [name, symbol, decimals, totalSupply] = await Promise.all([
    read("name"),
    read("symbol"),
    read("decimals"),
    read("totalSupply"),
  ]);

  return { address: token, name, symbol, decimals, totalSupply };
}

export interface Balance {
  raw: bigint;
  formatted: string;
  symbol: string;
}

export async function getBalance(client: ReadClient, token: Address, holder: Address): Promise<Balance> {
  const [raw, decimals, symbol] = await Promise.all([
    client.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [holder] }),
    client.readContract({ address: token, abi: erc20Abi, functionName: "decimals" }),
    client.readContract({ address: token, abi: erc20Abi, functionName: "symbol" }),
  ]);

  return { raw, formatted: formatAmount(raw, decimals), symbol };
}
