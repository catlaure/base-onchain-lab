#!/usr/bin/env node
import { parseArgs } from "node:util";
import { isAddress, type Address } from "viem";
import { createClient, isNetworkName, type NetworkName } from "./chains.js";
import { getBalance, getTokenInfo } from "./erc20.js";
import { getTransferLogs } from "./events.js";
import { formatAmount, parseDuration, shortAddress } from "./format.js";
import { milestones, releasableAmount, vestedAmount } from "./vesting.js";

export const USAGE = `lab - read ERC-20 data on Base

Usage:
  lab info <token> [--network base|base-sepolia] [--rpc <url>]
  lab balance <token> <holder> [--network ...] [--rpc <url>]
  lab transfers <token> --from-block <n> [--to-block <n>] [--sender <addr>] [--recipient <addr>]
  lab vesting <total> --start <unix> --duration <30d> [--cliff <7d>] [--at <unix>] [--released <amount>]

Default network is base-sepolia.
`;

function requireAddress(value: string | undefined, label: string): Address {
  if (!value || !isAddress(value)) throw new Error(`${label} must be a valid address`);
  return value;
}

function requireBigint(value: string | undefined, label: string): bigint {
  if (value === undefined || !/^\d+$/.test(value)) throw new Error(`${label} must be a non-negative integer`);
  return BigInt(value);
}

/** Parses a decimal token amount like "12.5" into a bigint with the given decimals. */
export function parseTokenAmount(input: string, decimals: number): bigint {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(input);
  if (!match) throw new Error(`Invalid amount "${input}"`);
  const [, whole, fraction = ""] = match;
  if (fraction.length > decimals) throw new Error(`Too many decimal places (max ${decimals})`);
  return BigInt(whole!) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, "0") || "0");
}

export async function run(argv: string[]): Promise<string> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      network: { type: "string", default: "base-sepolia" },
      rpc: { type: "string" },
      "from-block": { type: "string" },
      "to-block": { type: "string" },
      sender: { type: "string" },
      recipient: { type: "string" },
      start: { type: "string" },
      cliff: { type: "string", default: "0" },
      duration: { type: "string" },
      at: { type: "string" },
      released: { type: "string", default: "0" },
      decimals: { type: "string", default: "18" },
    },
  });

  const [command, ...args] = positionals;
  if (!command) return USAGE;

  const networkName = values.network as string;
  if (!isNetworkName(networkName)) throw new Error(`Unknown network "${networkName}"`);
  const network: NetworkName = networkName;

  switch (command) {
    case "info": {
      const token = requireAddress(args[0], "token");
      const info = await getTokenInfo(createClient(network, values.rpc), token);
      return [
        `${info.name} (${info.symbol})`,
        `address:      ${info.address}`,
        `decimals:     ${info.decimals}`,
        `total supply: ${formatAmount(info.totalSupply, info.decimals)} ${info.symbol}`,
      ].join("\n");
    }

    case "balance": {
      const token = requireAddress(args[0], "token");
      const holder = requireAddress(args[1], "holder");
      const balance = await getBalance(createClient(network, values.rpc), token, holder);
      return `${balance.formatted} ${balance.symbol}`;
    }

    case "transfers": {
      const token = requireAddress(args[0], "token");
      const client = createClient(network, values.rpc);
      const fromBlock = requireBigint(values["from-block"], "--from-block");
      const toBlock =
        values["to-block"] !== undefined
          ? requireBigint(values["to-block"], "--to-block")
          : await client.getBlockNumber();

      const logs = await getTransferLogs(client, token, {
        fromBlock,
        toBlock,
        from: values.sender ? requireAddress(values.sender, "--sender") : undefined,
        to: values.recipient ? requireAddress(values.recipient, "--recipient") : undefined,
      });
      const { decimals } = await getTokenInfo(client, token);

      if (logs.length === 0) return "No transfers found.";
      return logs
        .map(
          (l) =>
            `#${l.blockNumber} ${shortAddress(l.from)} -> ${shortAddress(l.to)}  ${formatAmount(l.value, decimals)}`,
        )
        .join("\n");
    }

    case "vesting": {
      const decimals = Number(values.decimals);
      const total = parseTokenAmount(args[0] ?? "", decimals);
      const schedule = {
        start: requireBigint(values.start, "--start"),
        cliffDuration: BigInt(parseDuration(values.cliff as string)),
        duration: BigInt(parseDuration(values.duration ?? "")),
      };
      const at = values.at !== undefined ? requireBigint(values.at, "--at") : BigInt(Math.floor(Date.now() / 1000));
      const released = parseTokenAmount(values.released as string, decimals);

      const { cliffEnd, end } = milestones(schedule);
      const vested = vestedAmount(schedule, total, at);
      const releasable = releasableAmount(schedule, total, released, at);

      return [
        `cliff ends: ${cliffEnd}`,
        `fully vested: ${end}`,
        `vested at ${at}: ${formatAmount(vested, decimals)}`,
        `releasable:  ${formatAmount(releasable, decimals)}`,
      ].join("\n");
    }

    default:
      throw new Error(`Unknown command "${command}"\n\n${USAGE}`);
  }
}

// Only run when executed directly, not when imported by tests.
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  run(process.argv.slice(2))
    .then((out) => console.log(out))
    .catch((err: unknown) => {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    });
}
