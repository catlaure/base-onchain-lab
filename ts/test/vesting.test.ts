import { describe, expect, it } from "vitest";
import { milestones, releasableAmount, vestedAmount, type VestingSchedule } from "../src/vesting.js";

// Same numbers as test/LinearVesting.t.sol
const schedule: VestingSchedule = { start: 1_000n, cliffDuration: 100n, duration: 1_000n };
const TOTAL = 1_000n * 10n ** 18n;

describe("vestedAmount", () => {
  it("is zero before the cliff", () => {
    expect(vestedAmount(schedule, TOTAL, 999n)).toBe(0n);
    expect(vestedAmount(schedule, TOTAL, 1_099n)).toBe(0n);
  });

  it("unlocks pro-rata at the cliff", () => {
    expect(vestedAmount(schedule, TOTAL, 1_100n)).toBe(100n * 10n ** 18n);
  });

  it("pays half at the midpoint", () => {
    expect(vestedAmount(schedule, TOTAL, 1_500n)).toBe(500n * 10n ** 18n);
  });

  it("pays everything at and after the end", () => {
    expect(vestedAmount(schedule, TOTAL, 2_000n)).toBe(TOTAL);
    expect(vestedAmount(schedule, TOTAL, 9_999n)).toBe(TOTAL);
  });

  it("floors fractional results like Solidity", () => {
    expect(vestedAmount({ start: 0n, cliffDuration: 0n, duration: 3n }, 10n, 1n)).toBe(3n);
  });

  it("is monotonic in time", () => {
    let previous = 0n;
    for (let t = 0n; t <= 2_200n; t += 37n) {
      const v = vestedAmount(schedule, TOTAL, t);
      expect(v >= previous).toBe(true);
      expect(v <= TOTAL).toBe(true);
      previous = v;
    }
  });

  it("rejects invalid schedules", () => {
    expect(() => vestedAmount({ start: 0n, cliffDuration: 0n, duration: 0n }, 1n, 0n)).toThrow(/duration/);
    expect(() => vestedAmount({ start: 0n, cliffDuration: 5n, duration: 4n }, 1n, 0n)).toThrow(/cliff/);
  });
});

describe("releasableAmount", () => {
  it("subtracts what was already released", () => {
    expect(releasableAmount(schedule, TOTAL, 200n * 10n ** 18n, 1_500n)).toBe(300n * 10n ** 18n);
  });

  it("handles top-ups: allocation includes released tokens", () => {
    // 500 released, then 1000 more funded: total allocation 2000, 50% vested = 1000 -> 500 left to release
    expect(releasableAmount(schedule, 2_000n * 10n ** 18n, 500n * 10n ** 18n, 1_500n)).toBe(500n * 10n ** 18n);
  });
});

describe("milestones", () => {
  it("returns cliff end and schedule end", () => {
    expect(milestones(schedule)).toEqual({ cliffEnd: 1_100n, end: 2_000n });
  });
});
