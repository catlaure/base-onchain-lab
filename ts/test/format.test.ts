import { describe, expect, it } from "vitest";
import { formatAmount, parseDuration, shortAddress } from "../src/format.js";

describe("shortAddress", () => {
  it("shortens a full address", () => {
    expect(shortAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe("0x1234…5678");
  });

  it("leaves short strings alone", () => {
    expect(shortAddress("0x1234")).toBe("0x1234");
  });
});

describe("formatAmount", () => {
  it("formats whole amounts without a fraction", () => {
    expect(formatAmount(5n * 10n ** 18n, 18)).toBe("5");
  });

  it("keeps significant fractional digits", () => {
    expect(formatAmount(1_500_000_000_000_000_000n, 18)).toBe("1.5");
    expect(formatAmount(1n, 6)).toBe("0.000001");
  });

  it("truncates beyond maxFractionDigits", () => {
    expect(formatAmount(1_123_456_789_000_000_000n, 18, 4)).toBe("1.1234");
  });

  it("drops the fraction entirely when truncation leaves only zeros", () => {
    expect(formatAmount(1_000_000_000_000_001n, 18, 6)).toBe("0.001");
    expect(formatAmount(1n, 18, 6)).toBe("0");
  });

  it("handles zero decimals and negative values", () => {
    expect(formatAmount(42n, 0)).toBe("42");
    expect(formatAmount(-1_500_000n, 6)).toBe("-1.5");
  });
});

describe("parseDuration", () => {
  it("parses each unit", () => {
    expect(parseDuration("90s")).toBe(90);
    expect(parseDuration("15m")).toBe(900);
    expect(parseDuration("12h")).toBe(43_200);
    expect(parseDuration("30d")).toBe(2_592_000);
    expect(parseDuration("2w")).toBe(1_209_600);
  });

  it("treats a bare number as seconds", () => {
    expect(parseDuration("45")).toBe(45);
  });

  it("rejects garbage", () => {
    expect(() => parseDuration("abc")).toThrow(/Invalid duration/);
    expect(() => parseDuration("5y")).toThrow(/Invalid duration/);
    expect(() => parseDuration("")).toThrow(/Invalid duration/);
  });
});
