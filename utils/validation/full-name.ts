import type { ValidationResult } from "./types";

const MAX_LEN = 255;

export function validateFullName(raw: string): ValidationResult {
  const value = raw.trim();
  if (!value) {
    return { ok: false, message: "Full name is required." };
  }
  if (value.length > MAX_LEN) {
    return {
      ok: false,
      message: `Full name must be at most ${MAX_LEN} characters.`,
    };
  }
  return { ok: true };
}
