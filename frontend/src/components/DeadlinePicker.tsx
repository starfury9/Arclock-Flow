"use client";

import { useMemo } from "react";

/**
 * Themed deadline picker.
 *
 * Replaces the browser's native datetime-local box (which renders an
 * unstyled "dd/mm/yyyy --:--" mask and an invisible calendar icon on dark
 * backgrounds) with: quick presets, a styled date field, a time dropdown in
 * 30-minute steps, and a human-readable summary.
 *
 * The value contract is unchanged: `value` / `onChange` use the
 * "YYYY-MM-DDTHH:mm" local-time string the create page already parses.
 */

const pad = (n: number) => String(n).padStart(2, "0");

function toLocalDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toLocalValue(d: Date) {
  return `${toLocalDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? 0 : 30;
  const value = `${pad(h)}:${pad(m)}`;
  const label = new Date(2000, 0, 1, h, m).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return { value, label };
});

const PRESETS = [
  { label: "24 hours", hours: 24 },
  { label: "3 days", hours: 72 },
  { label: "1 week", hours: 168 },
  { label: "2 weeks", hours: 336 },
];

function relative(target: Date): string {
  const diffMs = target.getTime() - Date.now();
  if (diffMs <= 0) return "in the past";
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `in ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `in ${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  return `in ${days} days`;
}

export function DeadlinePicker({
  value,
  onChange,
  minLeadMinutes = 1,
}: {
  value: string;
  onChange: (value: string) => void;
  minLeadMinutes?: number;
}) {
  const [datePart, timePart] = value ? value.split("T") : ["", ""];
  const today = toLocalDate(new Date());

  const selected = useMemo(() => (value ? new Date(value) : null), [value]);
  const tooSoon = selected ? selected.getTime() < Date.now() + minLeadMinutes * 60 * 1000 : false;

  function applyPreset(hours: number) {
    const d = new Date(Date.now() + hours * 3600 * 1000);
    // Round up to the next half hour so it lines up with the time dropdown.
    d.setSeconds(0, 0);
    const m = d.getMinutes();
    d.setMinutes(m === 0 || m === 30 ? m : m < 30 ? 30 : 60);
    onChange(toLocalValue(d));
  }

  function setDate(next: string) {
    if (!next) return onChange("");
    onChange(`${next}T${timePart || "18:00"}`);
  }

  function setTime(next: string) {
    onChange(`${datePart || today}T${next}`);
  }

  const activePreset = PRESETS.find((p) => {
    if (!selected) return false;
    const diffH = (selected.getTime() - Date.now()) / 3600000;
    return Math.abs(diffH - p.hours) < 0.6;
  });

  // Keep a selected non-half-hour time (e.g. from a preset edge case) visible.
  const timeOptions =
    timePart && !TIME_OPTIONS.some((t) => t.value === timePart)
      ? [{ value: timePart, label: timePart }, ...TIME_OPTIONS]
      : TIME_OPTIONS;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => applyPreset(p.hours)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              activePreset?.label === p.label
                ? "border-arc-violet/60 bg-arc-violet/20 text-white"
                : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/25 hover:text-white"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" aria-hidden>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M16 3v4M8 3v4M3 10h18" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="date"
            required
            min={today}
            value={datePart}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Deadline date"
            className="field-input date-field pl-9"
          />
        </div>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" aria-hidden>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" strokeLinecap="round" />
            </svg>
          </span>
          <select
            required
            value={timePart}
            onChange={(e) => setTime(e.target.value)}
            aria-label="Deadline time"
            className="field-input appearance-none pl-9 pr-8"
          >
            <option value="" disabled>
              Time
            </option>
            {timeOptions.map((t) => (
              <option key={t.value} value={t.value} className="bg-[#0f0f17]">
                {t.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40" aria-hidden>
            ▾
          </span>
        </div>
      </div>

      <p className={`text-xs ${tooSoon ? "text-red-300" : selected ? "text-white/55" : "text-white/35"}`} aria-live="polite">
        {selected
          ? tooSoon
            ? "This deadline is in the past or too soon. Pick a later time."
            : `${selected.toLocaleString([], {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })} · ${relative(selected)}`
          : "Pick a preset or choose a date and time."}
      </p>
    </div>
  );
}
