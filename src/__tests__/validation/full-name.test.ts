import { describe, expect, it } from "vitest";
import { validateFullName } from "../../../utils/validation/full-name";

describe("validateFullName", () => {
  it("accepts a normal name", () => {
    expect(validateFullName("Jane Doe")).toEqual({ ok: true });
  });

  it("rejects empty", () => {
    expect(validateFullName("  ")).toEqual({
      ok: false,
      message: "Full name is required.",
    });
  });

  it("rejects over 255 characters after trim", () => {
    expect(validateFullName("x".repeat(256))).toEqual({
      ok: false,
      message: "Full name must be at most 255 characters.",
    });
  });

  it("accepts exactly 255 characters after trim", () => {
    const name = "N".repeat(255);
    expect(name.length).toBe(255);
    expect(validateFullName(name)).toEqual({ ok: true });
  });

  it("accepts 255 characters when wrapped in trimmable spaces", () => {
    const inner = "M".repeat(255);
    const raw = ` \t${inner} `;
    expect(raw.trim().length).toBe(255);
    expect(validateFullName(raw)).toEqual({ ok: true });
  });

  it("rejects when trim leaves 256 characters", () => {
    const inner = "P".repeat(256);
    const raw = `  ${inner}  `;
    expect(raw.trim().length).toBe(256);
    expect(validateFullName(raw)).toEqual({
      ok: false,
      message: "Full name must be at most 255 characters.",
    });
  });

  it("collapses outer trim but keeps inner spacing (still valid)", () => {
    expect(validateFullName("  Jean   Paul  ")).toEqual({ ok: true });
  });

  it("rejects NBSP-only as empty after trim", () => {
    expect(validateFullName("\u00a0\u00a0")).toEqual({
      ok: false,
      message: "Full name is required.",
    });
  });
});
