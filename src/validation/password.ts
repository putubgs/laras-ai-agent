import type { ValidationResult } from "./types";

const MIN_LEN = 8;
const MAX_LEN = 255;

export function validatePassword(raw: string): ValidationResult {
  const value = raw;
  if (!value) {
    return { ok: false, message: "Password is required." };
  }
  if (value.length < MIN_LEN) {
    return {
      ok: false,
      message: `Password must be at least ${MIN_LEN} characters.`,
    };
  }
  if (value.length > MAX_LEN) {
    return {
      ok: false,
      message: `Password must be at most ${MAX_LEN} characters.`,
    };
  }
  if (!/[a-z]/.test(value)) {
    return { ok: false, message: "Password must include a lowercase letter." };
  }
  if (!/[A-Z]/.test(value)) {
    return { ok: false, message: "Password must include an uppercase letter." };
  }
  if (!/[0-9]/.test(value)) {
    return { ok: false, message: "Password must include a number." };
  }
  if (!/[^a-zA-Z0-9]/.test(value)) {
    return {
      ok: false,
      message: "Password must include a special character.",
    };
  }
  return { ok: true };
}

export function validatePasswordMatch(
  password: string,
  confirmPassword: string
): ValidationResult {
  if (password !== confirmPassword) {
    return { ok: false, message: "Passwords do not match." };
  }
  return { ok: true };
}
