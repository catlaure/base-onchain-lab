import { createPublicClient, http, type Chain, type PublicClient } from "viem";
import { base, baseSepolia } from "viem/chains";

export type NetworkName = "base" | "base-sepolia";

const CHAINS: Record<NetworkName, Chain> = {
  base,
  "base-sepolia": baseSepolia,
};

export function isNetworkName(value: string): value is NetworkName {
  return Object.hasOwn(CHAINS, value);
}

export function getChain(network: NetworkName): Chain {
  return CHAINS[network];
}

/** Creates a read-only client for the given network, optionally with a custom RPC URL. */
export function createClient(network: NetworkName, rpcUrl?: string): PublicClient {
  return createPublicClient({ chain: getChain(network), transport: http(rpcUrl) });
}
