import { describe, expect, it } from "vitest";
import { assertFutureDeadline, toUnixSeconds, MIN_DEADLINE_LEAD_SECONDS } from "./deadline";

describe("toUnixSeconds", () => {
  it("passes through a numeric unix timestamp", () => {
    expect(toUnixSeconds(1800000000)).toBe(1800000000);
  });

  it("parses a numeric string as a unix timestamp", () => {
    expect(toUnixSeconds("1800000000")).toBe(1800000000);
  });

  it("parses an ISO date string", () => {
    expect(toUnixSeconds("2027-01-01T00:00:00Z")).toBe(Math.floor(Date.parse("2027-01-01T00:00:00Z") / 1000));
  });

  it("throws on an unparseable string", () => {
    expect(() => toUnixSeconds("not-a-date")).toThrow();
  });
});

describe("assertFutureDeadline", () => {
  const now = 1_900_000_000;

  it("accepts a deadline comfortably in the future", () => {
    expect(() => assertFutureDeadline(now + 3600, now)).not.toThrow();
  });

  it("rejects a deadline in the past", () => {
    expect(() => assertFutureDeadline(now - 10, now)).toThrow(/must be at least/);
  });

  it("rejects a deadline that equals now", () => {
    expect(() => assertFutureDeadline(now, now)).toThrow();
  });

  it("rejects a deadline inside the minimum lead-time buffer", () => {
    expect(() => assertFutureDeadline(now + MIN_DEADLINE_LEAD_SECONDS - 1, now)).toThrow();
  });

  it("accepts a deadline exactly at the lead-time boundary", () => {
    expect(() => assertFutureDeadline(now + MIN_DEADLINE_LEAD_SECONDS + 1, now)).not.toThrow();
  });
});
