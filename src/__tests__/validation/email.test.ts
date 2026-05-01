import { describe, expect, it } from "vitest";
import { validateEmail } from "@/validation/email";

describe("validateEmail", () => {
  describe("valid addresses", () => {
    it("accepts a simple lowercase local and domain", () => {
      expect(validateEmail("user@example.com")).toEqual({ ok: true });
    });

    it("accepts plus and dot in the local part", () => {
      expect(validateEmail("first.last+tag@mail.example.co.uk")).toEqual({
        ok: true,
      });
    });

    it("accepts single-letter domain labels after @", () => {
      expect(validateEmail("x@y.z")).toEqual({ ok: true });
    });

    it("trims leading and trailing ASCII whitespace then validates", () => {
      const raw = "\t  user.name@example.com \n";
      expect(raw.trim()).toBe("user.name@example.com");
      expect(validateEmail(raw)).toEqual({ ok: true });
    });
  });

  describe("empty or whitespace-only input", () => {
    it('returns ok: false with message "Email is required." for empty string', () => {
      expect(validateEmail("")).toEqual({
        ok: false,
        message: "Email is required.",
      });
    });

    it('returns ok: false with message "Email is required." for whitespace-only', () => {
      expect(validateEmail("   ")).toEqual({
        ok: false,
        message: "Email is required.",
      });
      expect(validateEmail("\t\n")).toEqual({
        ok: false,
        message: "Email is required.",
      });
    });
  });

  describe("length limit (255 characters)", () => {
    it('returns ok: false with message "Email must be at most 255 characters." when over 255 after trim', () => {
      const local = "a".repeat(254);
      const value = `${local}@x`;
      expect(value.length).toBe(256);
      expect(validateEmail(value)).toEqual({
        ok: false,
        message: "Email must be at most 255 characters.",
      });
    });

    it("accepts an address whose trimmed length is exactly 255", () => {
      const value = `${"a".repeat(250)}@x.co`;
      expect(value.length).toBe(255);
      expect(validateEmail(value)).toEqual({ ok: true });
    });
  });

  describe("invalid format (regex mismatch)", () => {
    it('returns ok: false with message "Enter a valid email address." when @ is missing', () => {
      expect(validateEmail("not-an-email")).toEqual({
        ok: false,
        message: "Enter a valid email address.",
      });
    });

    it('returns ok: false with message "Enter a valid email address." when local part is missing', () => {
      expect(validateEmail("@nodomain.com")).toEqual({
        ok: false,
        message: "Enter a valid email address.",
      });
    });

    it('returns ok: false with message "Enter a valid email address." when domain is missing after @', () => {
      expect(validateEmail("user@")).toEqual({
        ok: false,
        message: "Enter a valid email address.",
      });
    });

    it('returns ok: false with message "Enter a valid email address." for consecutive @', () => {
      expect(validateEmail("a@@b.com")).toEqual({
        ok: false,
        message: "Enter a valid email address.",
      });
    });

    it('returns ok: false with message "Enter a valid email address." when the local part contains a space', () => {
      expect(validateEmail("user name@example.com")).toEqual({
        ok: false,
        message: "Enter a valid email address.",
      });
    });

    it("rejects a trailing zero-width space (trim does not strip U+200B)", () => {
      const sneaky = "user@example.com\u200b";
      expect(sneaky.trim()).toBe(sneaky);
      expect(validateEmail(sneaky)).toEqual({
        ok: false,
        message: "Enter a valid email address.",
      });
    });

    it("rejects Unicode letters in the local part (only ASCII subset is allowed)", () => {
      expect(validateEmail("用户@example.com")).toEqual({
        ok: false,
        message: "Enter a valid email address.",
      });
    });

    it("rejects parentheses in the domain (not in the allowed grammar)", () => {
      expect(validateEmail("user@exa(mple).com")).toEqual({
        ok: false,
        message: "Enter a valid email address.",
      });
    });

    it("rejects a dot at the start of the domain label", () => {
      expect(validateEmail("user@.example.com")).toEqual({
        ok: false,
        message: "Enter a valid email address.",
      });
    });
  });
});
