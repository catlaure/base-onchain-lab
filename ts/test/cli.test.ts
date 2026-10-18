import { describe, expect, it } from "vitest";
import { parseTokenAmount, run, USAGE } from "../src/cli.js";

describe("parseTokenAmount", () => {
  it("parses whole and fractional amounts", () => {
    expect(parseTokenAmount("5", 18)).toBe(5n * 10n ** 18n);
    expect(parseTokenAmount("12.5", 18)).toBe(12_500_000_000_000_000_000n);
    expect(parseTokenAmount("0.000001", 6)).toBe(1n);
  });

  it("rejects too many decimals and malformed input", () => {
    expect(() => parseTokenAmount("1.1234567", 6)).toThrow(/decimal places/);
    expect(() => parseTokenAmount("-1", 18)).toThrow(/Invalid amount/);
    expect(() => parseTokenAmount("abc", 18)).toThrow(/Invalid amount/);
    expect(() => parseTokenAmount("", 18)).toThrow(/Invalid amount/);
  });
});

describe("run", () => {
  it("prints usage without a command", async () => {
    await expect(run([])).resolves.toBe(USAGE);
  });

  it("rejects unknown commands and networks", async () => {
    await expect(run(["nope"])).rejects.toThrow(/Unknown command/);
    await expect(run(["info", "--network", "mainnet"])).rejects.toThrow(/Unknown network/);
  });

  it("validates addresses before any network call", async () => {
    await expect(run(["info", "0x123"])).rejects.toThrow(/token must be a valid address/);
    await expect(run(["balance", "0x1111111111111111111111111111111111111111", "bad"])).rejects.toThrow(
      /holder must be a valid address/,
    );
  });

  it("previews a vesting schedule offline", async () => {
    const out = await run([
      "vesting",
      "1000",
      "--start",
      "1000",
      "--cliff",
      "100",
      "--duration",
      "1000",
      "--at",
      "1500",
      "--released",
      "200",
    ]);
    expect(out).toContain("cliff ends: 1100");
    expect(out).toContain("fully vested: 2000");
    expect(out).toContain("vested at 1500: 500");
    expect(out).toContain("releasable:  300");
  });

  it("requires --start and --duration for vesting", async () => {
    await expect(run(["vesting", "10", "--duration", "10"])).rejects.toThrow(/--start/);
    await expect(run(["vesting", "10", "--start", "1"])).rejects.toThrow(/Invalid duration/);
  });
});
