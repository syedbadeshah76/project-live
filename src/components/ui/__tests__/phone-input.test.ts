import { describe, it, expect } from "vitest";
import {
  validatePhoneForCountry,
  detectCountryFromPhone,
  extractLocalNumber,
  countries,
} from "@/components/ui/phone-input";

describe("PhoneInput utilities", () => {
  describe("detectCountryFromPhone", () => {
    it("detects India from +91", () => {
      const country = detectCountryFromPhone("+91 98765 43210");
      expect(country?.code).toBe("IN");
    });

    it("detects UAE from +971", () => {
      const country = detectCountryFromPhone("+971 50 123 4567");
      expect(country?.code).toBe("AE");
    });

    it("detects US from +1", () => {
      const country = detectCountryFromPhone("+1 555 123 4567");
      expect(country?.code).toBe("US");
    });

    it("returns null for no dial code", () => {
      expect(detectCountryFromPhone("9876543210")).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(detectCountryFromPhone("")).toBeNull();
    });
  });

  describe("extractLocalNumber", () => {
    it("extracts local digits from Indian number", () => {
      const india = countries.find((c) => c.code === "IN")!;
      expect(extractLocalNumber("+91 98765 43210", india)).toBe("9876543210");
    });

    it("extracts local digits from UAE number", () => {
      const uae = countries.find((c) => c.code === "AE")!;
      expect(extractLocalNumber("+971 501234567", uae)).toBe("501234567");
    });
  });

  describe("validatePhoneForCountry", () => {
    it("validates 10-digit India number", () => {
      const india = countries.find((c) => c.code === "IN")!;
      expect(validatePhoneForCountry("9876543210", india)).toBeNull();
    });

    it("rejects 8-digit India number", () => {
      const india = countries.find((c) => c.code === "IN")!;
      expect(validatePhoneForCountry("98765432", india)).toBe("India numbers must be 10 digits");
    });

    it("validates 9-digit UAE number", () => {
      const uae = countries.find((c) => c.code === "AE")!;
      expect(validatePhoneForCountry("501234567", uae)).toBeNull();
    });

    it("rejects 10-digit UAE number", () => {
      const uae = countries.find((c) => c.code === "AE")!;
      expect(validatePhoneForCountry("5012345678", uae)).toBe("UAE numbers must be 9 digits");
    });

    it("returns error for empty input", () => {
      const india = countries.find((c) => c.code === "IN")!;
      expect(validatePhoneForCountry("", india)).toBe("Phone number is required");
    });

    it("validates 8-digit Singapore number", () => {
      const sg = countries.find((c) => c.code === "SG")!;
      expect(validatePhoneForCountry("91234567", sg)).toBeNull();
    });

    it("validates 10-digit US number", () => {
      const us = countries.find((c) => c.code === "US")!;
      expect(validatePhoneForCountry("5551234567", us)).toBeNull();
    });
  });

  describe("countries data integrity", () => {
    it("all countries have required fields", () => {
      for (const c of countries) {
        expect(c.code).toBeTruthy();
        expect(c.name).toBeTruthy();
        expect(c.dialCode).toMatch(/^\+\d+$/);
        expect(c.flag).toBeTruthy();
        expect(c.maxDigits).toBeGreaterThan(0);
      }
    });

    it("no duplicate country codes", () => {
      const codes = countries.map((c) => c.code);
      expect(new Set(codes).size).toBe(codes.length);
    });
  });
});
