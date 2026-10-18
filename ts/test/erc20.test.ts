import { describe, expect, it, vi } from "vitest";
import { getBalance, getTokenInfo, type ReadClient } from "../src/erc20.js";

const TOKEN = "0x1111111111111111111111111111111111111111" as const;
const HOLDER = "0x2222222222222222222222222222222222222222" as const;

function fakeClient(values: Record<string, unknown>) {
  const readContract = vi.fn(async ({ functionName }: { functionName: string }) => {
    if (!(functionName in values)) throw new Error(`unexpected call: ${functionName}`);
    return values[functionName];
  });
  return { client: { readContract } as unknown as ReadClient, readContract };
}

describe("getTokenInfo", () => {
  it("collects name, symbol, decimals and supply", async () => {
    const { client } = fakeClient({
      name: "Base Guild Token",
      symbol: "BGT",
      decimals: 18,
      totalSupply: 1_000n * 10n ** 18n,
    });

    await expect(getTokenInfo(client, TOKEN)).resolves.toEqual({
      address: TOKEN,
      name: "Base Guild Token",
      symbol: "BGT",
      decimals: 18,
      totalSupply: 1_000n * 10n ** 18n,
    });
  });

  it("propagates RPC errors", async () => {
    const { client } = fakeClient({ name: "x" });
    await expect(getTokenInfo(client, TOKEN)).rejects.toThrow(/unexpected call/);
  });
});

describe("getBalance", () => {
  it("formats the raw balance using the token's decimals", async () => {
    const { client, readContract } = fakeClient({
      balanceOf: 12_345_000n,
      decimals: 6,
      symbol: "USDC",
    });

    await expect(getBalance(client, TOKEN, HOLDER)).resolves.toEqual({
      raw: 12_345_000n,
      formatted: "12.345",
      symbol: "USDC",
    });

    const balanceCall = readContract.mock.calls.find(([arg]) => arg.functionName === "balanceOf");
    expect(balanceCall?.[0]).toMatchObject({ address: TOKEN, args: [HOLDER] });
  });
});
