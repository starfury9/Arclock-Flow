/**
 * Deadline parsing/validation shared by the commitments routes.
 *
 * Kept in sync with the on-chain guard in ArcLock.createCommitment, which
 * reverts with InvalidDeadline when `deadline <= block.timestamp`. We
 * replicate a slightly stricter version of that check here (with a lead-time
 * buffer) so a bad deadline fails fast with a clear 400 response instead of
 * creating a backend commitment row that later fails on-chain with a cryptic
 * revert during fundCommitment/createCommitment.
 */

export function toUnixSeconds(deadline: string | number): number {
  if (typeof deadline === "number") return deadline;
  const asNumber = Number(deadline);
  if (!Number.isNaN(asNumber) && String(asNumber) === deadline) return asNumber;
  const parsed = Date.parse(deadline);
  if (Number.isNaN(parsed)) throw new Error("deadline must be a unix timestamp or ISO date string");
  return Math.floor(parsed / 1000);
}

export const MIN_DEADLINE_LEAD_SECONDS = 60;

export function assertFutureDeadline(deadlineSeconds: number, nowSeconds = Math.floor(Date.now() / 1000)): void {
  if (deadlineSeconds <= nowSeconds + MIN_DEADLINE_LEAD_SECONDS) {
    throw new Error(
      `deadline must be at least ${MIN_DEADLINE_LEAD_SECONDS} seconds in the future (got ${new Date(
        deadlineSeconds * 1000
      ).toISOString()}, now is ${new Date(nowSeconds * 1000).toISOString()})`
    );
  }
}
