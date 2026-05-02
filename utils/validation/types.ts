export type ValidationResult =
  | { ok: true }
  | { ok: false; message: string };
