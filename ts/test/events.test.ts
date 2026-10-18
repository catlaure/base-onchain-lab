import { describe, expect, it, vi } from "vitest";
import { chunkRange, getTransferLogs, type LogsClient } from "../src/events.js";

const TOKEN = "0x1111111111111111111111111111111111111111" as const;
const ALICE = "0x2222222222222222222222222222222222222222" as const;
const BOB = "0x3333333333333333333333333333333333333333" as const;

describe("chunkRange", () => {
  it("covers the range without gaps or overlaps", () => {
    expect(chunkRange(0n, 9n, 4n)).toEqual([
      { from: 0n, to: 3n },
      { from: 4n, to: 7n },
      { from: 8n, to: 9n },
    ]);
  });

  it("returns a single range when it fits", () => {
    expect(chunkRange(5n, 5n, 100n)).toEqual([{ from: 5n, to: 5n }]);
  });

  it("returns nothing for an inverted range", () => {
    expect(chunkRange(10n, 9n, 5n)).toEqual([]);
  });

  it("rejects a non-positive chunk size", () => {
    expect(() => chunkRange(0n, 10n, 0n)).toThrow(/positive/);
  });
});

describe("getTransferLogs", () => {
  it("queries each chunk and maps the logs", async () => {
    const getLogs = vi.fn(async ({ fromBlock }: { fromBlock: bigint }) => [
      {
        blockNumber: fromBlock,
        transactionHash: `0x${"ab".repeat(32)}`,
        logIndex: 0,
        args: { from: ALICE, to: BOB, value: 5n },
      },
    ]);
    const client = { getLogs } as unknown as LogsClient;

    const logs = await getTransferLogs(client, TOKEN, {
      fromBlock: 100n,
      toBlock: 109n,
      chunkSize: 5n,
      from: ALICE,
    });

    expect(getLogs).toHaveBeenCalledTimes(2);
    expect(getLogs.mock.calls[0]?.[0]).toMatchObject({
      address: TOKEN,
      fromBlock: 100n,
      toBlock: 104n,
      args: { from: ALICE },
    });
    expect(getLogs.mock.calls[1]?.[0]).toMatchObject({ fromBlock: 105n, toBlock: 109n });
    expect(logs).toHaveLength(2);
    expect(logs[0]).toEqual({
      blockNumber: 100n,
      transactionHash: `0x${"ab".repeat(32)}`,
      logIndex: 0,
      from: ALICE,
      to: BOB,
      value: 5n,
    });
  });

  it("returns an empty list without calling the RPC for an inverted range", async () => {
    const getLogs = vi.fn();
    const client = { getLogs } as unknown as LogsClient;
    await expect(getTransferLogs(client, TOKEN, { fromBlock: 10n, toBlock: 1n })).resolves.toEqual([]);
    expect(getLogs).not.toHaveBeenCalled();
  });
});
