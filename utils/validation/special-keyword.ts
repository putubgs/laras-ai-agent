import type { ValidationResult } from "./types";

const MAX_LEN = 100;

/** Matches planned `User.special_keyword varchar(100)` */
export function validateSpecialKeyword(raw: string): ValidationResult {
  const value = raw.trim();
  if (!value) {
    return { ok: false, message: "Special keyword is required." };
  }
  if (value.length > MAX_LEN) {
    return {
      ok: false,
      message: `Special keyword must be at most ${MAX_LEN} characters.`,
    };
  }
  return { ok: true };
}
