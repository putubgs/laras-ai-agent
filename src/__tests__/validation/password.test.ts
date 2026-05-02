import { describe, expect, it } from "vitest";
import {
  validatePassword,
  validatePasswordMatch,
} from "../../../utils/validation/password";

describe("validatePassword", () => {
  it("accepts a strong password", () => {
    expect(validatePassword("GoodPass1!")).toEqual({ ok: true });
  });

  it("accepts exactly 8 characters when all rules are satisfied", () => {
    expect(validatePassword("Ab1!wxyz")).toEqual({ ok: true });
  });

  it("rejects empty", () => {
    expect(validatePassword("")).toEqual({
      ok: false,
      message: "Password is required.",
    });
  });

  it("rejects short password", () => {
    expect(validatePassword("Aa1!xx")).toEqual({
      ok: false,
      message: "Password must be at least 8 characters.",
    });
  });

  it("requires lowercase", () => {
    expect(validatePassword("NOLOWER1!")).toEqual({
      ok: false,
      message: "Password must include a lowercase letter.",
    });
  });

  it("requires uppercase", () => {
    expect(validatePassword("noupper1!")).toEqual({
      ok: false,
      message: "Password must include an uppercase letter.",
    });
  });

  it("requires digit", () => {
    expect(validatePassword("NoDigit!!")).toEqual({
      ok: false,
      message: "Password must include a number.",
    });
  });

  it("requires special character", () => {
    expect(validatePassword("NoSpecial1")).toEqual({
      ok: false,
      message: "Password must include a special character.",
    });
  });

  it("rejects fullwidth Latin letters (ASCII classes only)", () => {
    expect(validatePassword("Ａbcdefg1!")).toEqual({
      ok: false,
      message: "Password must include an uppercase letter.",
    });
  });

  it("rejects Greek letters for the lowercase rule (Unicode is not Latin a–z)", () => {
    expect(validatePassword("ΑβγΔΕΖΗ1!")).toEqual({
      ok: false,
      message: "Password must include a lowercase letter.",
    });
  });

  it("rejects fullwidth digit for the number rule", () => {
    expect(validatePassword("Abcdefg１!")).toEqual({
      ok: false,
      message: "Password must include a number.",
    });
  });

  it("accepts a 255-character password that still satisfies all rules", () => {
    const core = "Aa1!" + "x".repeat(251);
    expect(core.length).toBe(255);
    expect(validatePassword(core)).toEqual({ ok: true });
  });

  it("rejects 256 characters even when pattern looks strong", () => {
    const core = "Aa1!" + "x".repeat(252);
    expect(core.length).toBe(256);
    expect(validatePassword(core)).toEqual({
      ok: false,
      message: "Password must be at most 255 characters.",
    });
  });

  it("rejects when only uppercase letters are Latin (no a–z)", () => {
    expect(validatePassword("AAAAAAA1!")).toEqual({
      ok: false,
      message: "Password must include a lowercase letter.",
    });
  });
});

describe("validatePasswordMatch", () => {
  it("accepts matching passwords", () => {
    expect(validatePasswordMatch("Same1!", "Same1!")).toEqual({ ok: true });
  });

  it("rejects mismatch", () => {
    expect(validatePasswordMatch("Aa1!aaaa", "Aa1!aaab")).toEqual({
      ok: false,
      message: "Passwords do not match.",
    });
  });

  it("compares strictly (leading space on confirm fails)", () => {
    expect(validatePasswordMatch("Ab1!abcd", " Ab1!abcd")).toEqual({
      ok: false,
      message: "Passwords do not match.",
    });
  });

  it("treats two empty strings as matching (caller should gate empty)", () => {
    expect(validatePasswordMatch("", "")).toEqual({ ok: true });
  });
});
