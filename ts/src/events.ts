import { parseAbiItem, type Address, type PublicClient } from "viem";

const transferEvent = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
);

export interface TransferLog {
  blockNumber: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
  from: Address;
  to: Address;
  value: bigint;
}

export type LogsClient = Pick<PublicClient, "getLogs">;

export interface BlockRange {
  from: bigint;
  to: bigint;
}

/**
 * Splits [from, to] (inclusive) into consecutive ranges of at most `size` blocks.
 * Public RPCs commonly cap eth_getLogs ranges, so large scans must be chunked.
 */
export function chunkRange(from: bigint, to: bigint, size: bigint): BlockRange[] {
  if (size <= 0n) throw new Error("chunk size must be positive");
  if (to < from) return [];

  const ranges: BlockRange[] = [];
  for (let start = from; start <= to; start += size) {
    const end = start + size - 1n;
    ranges.push({ from: start, to: end > to ? to : end });
  }
  return ranges;
}

export interface TransferQuery {
  fromBlock: bigint;
  toBlock: bigint;
  /** Only transfers sent by this address. */
  from?: Address;
  /** Only transfers received by this address. */
  to?: Address;
  /** Max blocks per eth_getLogs request. Defaults to 2000. */
  chunkSize?: bigint;
}

export async function getTransferLogs(
  client: LogsClient,
  token: Address,
  query: TransferQuery,
): Promise<TransferLog[]> {
  const { fromBlock, toBlock, from, to, chunkSize = 2_000n } = query;
  const results: TransferLog[] = [];

  for (const range of chunkRange(fromBlock, toBlock, chunkSize)) {
    const logs = await client.getLogs({
      address: token,
      event: transferEvent,
      args: { from, to },
      fromBlock: range.from,
      toBlock: range.to,
    });

    for (const log of logs) {
      results.push({
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        logIndex: log.logIndex,
        from: log.args.from as Address,
        to: log.args.to as Address,
        value: log.args.value as bigint,
      });
    }
  }

  return results;
}
