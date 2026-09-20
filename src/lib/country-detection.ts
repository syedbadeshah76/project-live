/**
 * Detect the user's country code (ISO 3166-1 alpha-2) using:
 *   1. Browser locale region (e.g. "en-IN" → "IN")  — instant, no network
 *   2. navigator.language fallback
 *   3. Intl.DateTimeFormat resolved options (timezone heuristic)
 *
 * Returns a 2-letter uppercase country code, or "IN" as final fallback.
 *
 * Note: We intentionally avoid IP-based geolocation services (privacy +
 * no extra network calls + works offline). Browser locale is sufficient
 * for setting a sensible default — users can always switch manually.
 */

// Map common timezones → country code (only used if locale parsing fails)
const TIMEZONE_TO_COUNTRY: Record<string, string> = {
  "Asia/Kolkata": "IN",
  "Asia/Calcutta": "IN",
  "Asia/Dubai": "AE",
  "Asia/Riyadh": "SA",
  "Asia/Singapore": "SG",
  "Asia/Tokyo": "JP",
  "Asia/Shanghai": "CN",
  "Asia/Karachi": "PK",
  "Asia/Dhaka": "BD",
  "Asia/Colombo": "LK",
  "Asia/Kathmandu": "NP",
  "Asia/Kuala_Lumpur": "MY",
  "Asia/Jakarta": "ID",
  "Asia/Manila": "PH",
  "Asia/Bangkok": "TH",
  "Asia/Seoul": "KR",
  "America/New_York": "US",
  "America/Los_Angeles": "US",
  "America/Chicago": "US",
  "America/Denver": "US",
  "America/Toronto": "CA",
  "America/Vancouver": "CA",
  "America/Mexico_City": "MX",
  "America/Sao_Paulo": "BR",
  "Europe/London": "GB",
  "Europe/Paris": "FR",
  "Europe/Berlin": "DE",
  "Europe/Rome": "IT",
  "Europe/Madrid": "ES",
  "Europe/Moscow": "RU",
  "Europe/Istanbul": "TR",
  "Africa/Lagos": "NG",
  "Africa/Johannesburg": "ZA",
  "Australia/Sydney": "AU",
  "Pacific/Auckland": "NZ",
};

export function detectUserCountry(): string {
  // 1. Try Intl.Locale region (most accurate)
  try {
    const locale = navigator.language || (navigator.languages && navigator.languages[0]);
    if (locale) {
      // e.g. "en-IN", "fr-FR", "en-US"
      const parts = locale.split("-");
      if (parts.length >= 2) {
        const region = parts[parts.length - 1].toUpperCase();
        if (/^[A-Z]{2}$/.test(region)) return region;
      }
      // Try Intl.Locale API (modern browsers)
      try {
        const IntlLocale = (Intl as unknown as { Locale?: new (tag: string) => { maximize(): { region?: string } } }).Locale;
        if (IntlLocale) {
          const region = new IntlLocale(locale).maximize().region;
          if (region && /^[A-Z]{2}$/.test(region)) return region;
        }
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }

  // 2. Timezone fallback
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && TIMEZONE_TO_COUNTRY[tz]) return TIMEZONE_TO_COUNTRY[tz];
  } catch {
    // ignore
  }

  // 3. Final fallback
  return "IN";
}
