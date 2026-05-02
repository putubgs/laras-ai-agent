import { describe, expect, it } from "vitest";
import { validateSpecialKeyword } from "../../../utils/validation/special-keyword";

describe("validateSpecialKeyword", () => {
  it("accepts non-empty within limit", () => {
    expect(validateSpecialKeyword("my recovery phrase")).toEqual({ ok: true });
  });

  it("trims and accepts", () => {
    expect(validateSpecialKeyword("  ok  ")).toEqual({ ok: true });
  });

  it("rejects empty after trim", () => {
    expect(validateSpecialKeyword("   ")).toEqual({
      ok: false,
      message: "Special keyword is required.",
    });
  });

  it("rejects over 100 characters", () => {
    expect(validateSpecialKeyword("x".repeat(101))).toEqual({
      ok: false,
      message: "Special keyword must be at most 100 characters.",
    });
  });

  it("accepts exactly 100 characters after trim", () => {
    const phrase = "k".repeat(100);
    expect(phrase.length).toBe(100);
    expect(validateSpecialKeyword(phrase)).toEqual({ ok: true });
  });

  it("accepts 100 characters when padded by trimmable outer spaces", () => {
    const inner = "z".repeat(100);
    const raw = `  ${inner}  `;
    expect(raw.trim().length).toBe(100);
    expect(validateSpecialKeyword(raw)).toEqual({ ok: true });
  });

  it("rejects when trim leaves 101 characters (inner too long)", () => {
    const inner = "y".repeat(101);
    const raw = `  ${inner}  `;
    expect(raw.trim().length).toBe(101);
    expect(validateSpecialKeyword(raw)).toEqual({
      ok: false,
      message: "Special keyword must be at most 100 characters.",
    });
  });

  it("rejects NBSP-only (NBSP is trimmed in modern engines, so value becomes empty)", () => {
    expect(validateSpecialKeyword("\u00a0\u00a0")).toEqual({
      ok: false,
      message: "Special keyword is required.",
    });
  });

  it("accepts 50 🙂 characters when UTF-16 length is exactly 100", () => {
    const phrase = "🙂".repeat(50);
    expect(phrase.length).toBe(100);
    expect(validateSpecialKeyword(phrase)).toEqual({ ok: true });
  });

  it("rejects 51 🙂 characters when UTF-16 length exceeds 100", () => {
    const phrase = "🙂".repeat(51);
    expect(phrase.length).toBe(102);
    expect(validateSpecialKeyword(phrase)).toEqual({
      ok: false,
      message: "Special keyword must be at most 100 characters.",
    });
  });
});
