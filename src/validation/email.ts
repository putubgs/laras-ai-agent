import type { ValidationResult } from "./types";

const MAX_LEN = 255;
/** Practical subset — full RFC 5322 is not practical in a single regex */
const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function validateEmail(raw: string): ValidationResult {
  const value = raw.trim();
  if (!value) {
    return { ok: false, message: "Email is required." };
  }
  if (value.length > MAX_LEN) {
    return { ok: false, message: `Email must be at most ${MAX_LEN} characters.` };
  }
  if (!EMAIL_RE.test(value)) {
    return { ok: false, message: "Enter a valid email address." };
  }
  return { ok: true };
}
