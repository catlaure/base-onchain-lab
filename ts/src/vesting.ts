/** Mirrors the schedule stored in LinearVesting.sol. All times are unix seconds. */
export interface VestingSchedule {
  start: bigint;
  cliffDuration: bigint;
  duration: bigint;
}

/**
 * Total amount vested at `timestamp`, using the exact integer math of the contract.
 * `totalAllocation` is the contract's token balance plus everything already released.
 */
export function vestedAmount(
  schedule: VestingSchedule,
  totalAllocation: bigint,
  timestamp: bigint,
): bigint {
  const { start, cliffDuration, duration } = schedule;
  if (duration <= 0n) throw new Error("duration must be positive");
  if (cliffDuration > duration) throw new Error("cliff cannot be longer than the duration");

  if (timestamp < start + cliffDuration) return 0n;
  if (timestamp >= start + duration) return totalAllocation;
  return (totalAllocation * (timestamp - start)) / duration;
}

/** Amount that could be released at `timestamp` given what was already released. */
export function releasableAmount(
  schedule: VestingSchedule,
  totalAllocation: bigint,
  released: bigint,
  timestamp: bigint,
): bigint {
  return vestedAmount(schedule, totalAllocation, timestamp) - released;
}

/** Unix timestamp at which the cliff ends and at which vesting completes. */
export function milestones(schedule: VestingSchedule): { cliffEnd: bigint; end: bigint } {
  return {
    cliffEnd: schedule.start + schedule.cliffDuration,
    end: schedule.start + schedule.duration,
  };
}
