import { parseISO, subMonths } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

/** Indonesia Western (WIB, UTC+7) — user-submitted datetimes without offset are interpreted here. */
export const APP_TIME_ZONE = "Asia/Jakarta";

/** Current instant as ISO UTC (Postgres `timestamptz`). */
export function utcNowIso(): string {
  return new Date().toISOString();
}

/**
 * Parses a `timestamptz` (or `Date`) from Supabase/PostgREST into a JavaScript `Date`.
 * Normalizes Postgres’s `YYYY-MM-DD hh:mm:ss…±offset` form (space before clock time) to ISO.
 * Prefer this over `new Date(unknown)` alone so odd spacing still parses; still format UI times
 * with `formatInTimeZone(..., APP_TIME_ZONE)` when you want WIB regardless of device zone.
 */
export function parseDbInstant(value: Date | string | null | undefined): Date {
  if (value == null || value === "") return new Date(NaN);
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? new Date(NaN) : value;
  let s = String(value).trim();
  if (!s) return new Date(NaN);
  if (/^\d{4}-\d{2}-\d{2} \d/.test(s)) s = s.replace(/^(\d{4}-\d{2}-\d{2}) /, "$1T");
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d;
  const alt = parseISO(s);
  return Number.isNaN(alt.getTime()) ? new Date(NaN) : alt;
}

/**
 * Parses `<input type="datetime-local">` / plain `YYYY-MM-DDTHH:mm` values as **wall clock in APP_TIME_ZONE**,
 * then returns the correct **UTC ISO** string for Supabase.
 */
export function naiveFormDateTimeToUtcIso(input: string): string {
  const t = input.trim();
  if (!t) return utcNowIso();
  if (/[zZ]$|[+-]\d{2}:\d{2}$|[+-]\d{4}$/.test(t)) {
    return new Date(t).toISOString();
  }
  let normalized = t.includes("T") ? t : `${t}T00:00:00`;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) {
    normalized = `${normalized}:00`;
  }
  const m = normalized.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\.\d+)?$/);
  const base = m ? m[1] : normalized.slice(0, 19);
  return new Date(`${base}+07:00`).toISOString();
}

export function jakartaMonthRangeUtcIso(year: number, month: number): { start: string; end: string } {
  const start = fromZonedTime(new Date(year, month - 1, 1, 0, 0, 0, 0), APP_TIME_ZONE);
  const lastD = new Date(year, month, 0).getDate();
  const end = fromZonedTime(new Date(year, month - 1, lastD, 23, 59, 59, 999), APP_TIME_ZONE);
  return { start: start.toISOString(), end: end.toISOString() };
}

/** Start/end instants for the Jakarta calendar day containing `reference`. */
export function jakartaCalendarDayRangeUtc(reference: Date): { start: Date; end: Date } {
  const [y, m, d] = formatInTimeZone(reference, APP_TIME_ZONE, "yyyy-MM-dd")
    .split("-")
    .map((x) => parseInt(x, 10));
  return {
    start: fromZonedTime(new Date(y, m - 1, d, 0, 0, 0, 0), APP_TIME_ZONE),
    end: fromZonedTime(new Date(y, m - 1, d, 23, 59, 59, 999), APP_TIME_ZONE),
  };
}

export function jakartaYearMonthDayNow(): { year: number; month: number; day: number } {
  const [y, m, d] = formatInTimeZone(new Date(), APP_TIME_ZONE, "yyyy-MM-dd")
    .split("-")
    .map((x) => parseInt(x, 10));
  return { year: y, month: m, day: d };
}

/** Chronological list of `{ year, month }` (1–12) from first instant to last, by Jakarta calendar months. */
export function eachJakartaYearMonthBetween(first: Date, last: Date): { year: number; month: number }[] {
  const startYm = formatInTimeZone(first, APP_TIME_ZONE, "yyyy-MM");
  const endYm = formatInTimeZone(last, APP_TIME_ZONE, "yyyy-MM");
  const [sy, sm] = startYm.split("-").map((x) => parseInt(x, 10));
  const [ey, em] = endYm.split("-").map((x) => parseInt(x, 10));
  const out: { year: number; month: number }[] = [];
  let y = sy;
  let mo = sm;
  const endKey = ey * 12 + em;
  while (y * 12 + mo <= endKey) {
    out.push({ year: y, month: mo });
    mo += 1;
    if (mo > 12) {
      mo = 1;
      y += 1;
    }
  }
  return out;
}

/** First instant of the Jakarta calendar month that is `monthsBack` before the Jakarta month of `reference`. */
export function jakartaMonthStartMonthsAgo(reference: Date, monthsBack: number): Date {
  const ym = formatInTimeZone(reference, APP_TIME_ZONE, "yyyy-MM-dd");
  const [y, m, d] = ym.split("-").map((x) => parseInt(x, 10));
  const mid = fromZonedTime(new Date(y, m - 1, Math.min(d, 28), 12, 0, 0, 0), APP_TIME_ZONE);
  const shifted = subMonths(mid, monthsBack);
  const [y2, m2] = formatInTimeZone(shifted, APP_TIME_ZONE, "yyyy-MM").split("-").map((x) => parseInt(x, 10));
  return fromZonedTime(new Date(y2, m2 - 1, 1, 0, 0, 0, 0), APP_TIME_ZONE);
}
