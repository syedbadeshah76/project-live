import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, Search, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { detectUserCountry } from "@/lib/country-detection";

export interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  maxDigits: number;
  format?: string; // e.g., "XXXXX XXXXX" for India
}

export const countries: Country[] = [
  { code: "IN", name: "India", dialCode: "+91", flag: "🇮🇳", maxDigits: 10, format: "XXXXX XXXXX" },
  { code: "US", name: "United States", dialCode: "+1", flag: "🇺🇸", maxDigits: 10, format: "XXX XXX XXXX" },
  { code: "GB", name: "United Kingdom", dialCode: "+44", flag: "🇬🇧", maxDigits: 10, format: "XXXX XXXXXX" },
  { code: "AE", name: "UAE", dialCode: "+971", flag: "🇦🇪", maxDigits: 9, format: "XX XXX XXXX" },
  { code: "SA", name: "Saudi Arabia", dialCode: "+966", flag: "🇸🇦", maxDigits: 9, format: "XX XXX XXXX" },
  { code: "AU", name: "Australia", dialCode: "+61", flag: "🇦🇺", maxDigits: 9, format: "XXX XXX XXX" },
  { code: "CA", name: "Canada", dialCode: "+1", flag: "🇨🇦", maxDigits: 10, format: "XXX XXX XXXX" },
  { code: "DE", name: "Germany", dialCode: "+49", flag: "🇩🇪", maxDigits: 11, format: "XXXX XXXXXXX" },
  { code: "FR", name: "France", dialCode: "+33", flag: "🇫🇷", maxDigits: 9, format: "X XX XX XX XX" },
  { code: "JP", name: "Japan", dialCode: "+81", flag: "🇯🇵", maxDigits: 10, format: "XX XXXX XXXX" },
  { code: "CN", name: "China", dialCode: "+86", flag: "🇨🇳", maxDigits: 11, format: "XXX XXXX XXXX" },
  { code: "BR", name: "Brazil", dialCode: "+55", flag: "🇧🇷", maxDigits: 11, format: "XX XXXXX XXXX" },
  { code: "SG", name: "Singapore", dialCode: "+65", flag: "🇸🇬", maxDigits: 8, format: "XXXX XXXX" },
  { code: "KR", name: "South Korea", dialCode: "+82", flag: "🇰🇷", maxDigits: 10, format: "XX XXXX XXXX" },
  { code: "NZ", name: "New Zealand", dialCode: "+64", flag: "🇳🇿", maxDigits: 9, format: "XX XXX XXXX" },
  { code: "ZA", name: "South Africa", dialCode: "+27", flag: "🇿🇦", maxDigits: 9, format: "XX XXX XXXX" },
  { code: "NG", name: "Nigeria", dialCode: "+234", flag: "🇳🇬", maxDigits: 10, format: "XXX XXX XXXX" },
  { code: "PK", name: "Pakistan", dialCode: "+92", flag: "🇵🇰", maxDigits: 10, format: "XXX XXXXXXX" },
  { code: "BD", name: "Bangladesh", dialCode: "+880", flag: "🇧🇩", maxDigits: 10, format: "XXXX XXXXXX" },
  { code: "LK", name: "Sri Lanka", dialCode: "+94", flag: "🇱🇰", maxDigits: 9, format: "XX XXX XXXX" },
  { code: "NP", name: "Nepal", dialCode: "+977", flag: "🇳🇵", maxDigits: 10, format: "XXX XXXXXXX" },
  { code: "MY", name: "Malaysia", dialCode: "+60", flag: "🇲🇾", maxDigits: 10, format: "XX XXXX XXXX" },
  { code: "ID", name: "Indonesia", dialCode: "+62", flag: "🇮🇩", maxDigits: 12, format: "XXX XXXX XXXXX" },
  { code: "PH", name: "Philippines", dialCode: "+63", flag: "🇵🇭", maxDigits: 10, format: "XXX XXX XXXX" },
  { code: "TH", name: "Thailand", dialCode: "+66", flag: "🇹🇭", maxDigits: 9, format: "XX XXX XXXX" },
  { code: "IT", name: "Italy", dialCode: "+39", flag: "🇮🇹", maxDigits: 10, format: "XXX XXX XXXX" },
  { code: "ES", name: "Spain", dialCode: "+34", flag: "🇪🇸", maxDigits: 9, format: "XXX XXX XXX" },
  { code: "MX", name: "Mexico", dialCode: "+52", flag: "🇲🇽", maxDigits: 10, format: "XXX XXX XXXX" },
  { code: "RU", name: "Russia", dialCode: "+7", flag: "🇷🇺", maxDigits: 10, format: "XXX XXX XX XX" },
  { code: "TR", name: "Turkey", dialCode: "+90", flag: "🇹🇷", maxDigits: 10, format: "XXX XXX XXXX" },
];

/**
 * High-quality SVG Flag renderer with responsive scaling and fallback.
 */
export function CountryFlag({
  code,
  name,
  className = "w-5 h-3.5",
}: {
  code: string;
  name?: string;
  className?: string;
}) {
  const [imageError, setImageError] = useState(false);
  const upperCode = code.toUpperCase();
  const lowerCode = code.toLowerCase();

  const flagUrl = `https://flagcdn.com/${lowerCode}.svg`;

  if (imageError) {
    const fallbackEmoji = countries.find((c) => c.code === upperCode)?.flag || "🌐";
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center text-xs leading-none shrink-0 select-none",
          className
        )}
        aria-hidden="true"
        title={name || upperCode}
      >
        {fallbackEmoji}
      </span>
    );
  }

  return (
    <img
      src={flagUrl}
      alt={name ? `${name} flag` : `${upperCode} flag`}
      loading="lazy"
      decoding="async"
      onError={() => setImageError(true)}
      className={cn(
        "object-cover rounded-[2px] border border-black/10 shadow-xs shrink-0 select-none align-middle pointer-events-none",
        className
      )}
    />
  );
}

/**
 * Detect country from a dial code prefix in a phone string.
 */
export function detectCountryFromPhone(phone: string): Country | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[^+\d]/g, "");
  if (!cleaned.startsWith("+")) return null;

  // Sort by dial code length desc so longer codes match first (e.g., +971 before +97)
  const sorted = [...countries].sort((a, b) => b.dialCode.length - a.dialCode.length);
  for (const c of sorted) {
    if (cleaned.startsWith(c.dialCode)) return c;
  }
  return null;
}

/**
 * Extract the local number (digits only) from a full phone string.
 */
export function extractLocalNumber(phone: string, country: Country): string {
  const cleaned = phone.replace(/[^+\d]/g, "");
  if (cleaned.startsWith(country.dialCode)) {
    return cleaned.slice(country.dialCode.length);
  }
  return cleaned.replace(/^\+/, "");
}

/**
 * Validate phone number digits against country's max digit rule.
 */
export function validatePhoneForCountry(localDigits: string, country: Country): string | null {
  const digits = localDigits.replace(/\D/g, "");
  if (!digits) return "Phone number is required";
  if (digits.length !== country.maxDigits) {
    return `${country.name} numbers must be ${country.maxDigits} digits`;
  }
  return null;
}

/**
 * Format digits according to the country format pattern.
 */
function formatPhone(digits: string, format?: string): string {
  if (!format || !digits) return digits;
  let result = "";
  let di = 0;
  for (let i = 0; i < format.length && di < digits.length; i++) {
    if (format[i] === "X") {
      result += digits[di++];
    } else {
      result += format[i];
    }
  }
  return result;
}

interface PhoneInputProps {
  value: string; // full phone value e.g. "+91 98765 43210" or just "9876543210"
  onChange: (fullPhone: string, countryCode: string, localNumber: string) => void;
  disabled?: boolean;
  error?: string;
  className?: string;
  defaultCountry?: string; // country code e.g. "IN"
}

export const PhoneInput = ({
  value,
  onChange,
  disabled = false,
  error,
  className,
  defaultCountry,
}: PhoneInputProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Determine selected country: existing value > explicit prop > auto-detected > IN
  const [selectedCountry, setSelectedCountry] = useState<Country>(() => {
    const detected = detectCountryFromPhone(value);
    if (detected) return detected;
    if (defaultCountry) {
      const found = countries.find((c) => c.code === defaultCountry);
      if (found) return found;
    }
    const auto = detectUserCountry();
    return countries.find((c) => c.code === auto) || countries.find((c) => c.code === "IN") || countries[0];
  });

  // Local number (digits only)
  const [localNumber, setLocalNumber] = useState(() => {
    if (value) {
      const detected = detectCountryFromPhone(value);
      if (detected) return extractLocalNumber(value, detected);
      return value.replace(/\D/g, "");
    }
    return "";
  });

  // Sync external value changes if provided
  useEffect(() => {
    if (value) {
      const detected = detectCountryFromPhone(value);
      if (detected && detected.code !== selectedCountry.code) {
        setSelectedCountry(detected);
      }
      const local = detected ? extractLocalNumber(value, detected) : value.replace(/\D/g, "");
      setLocalNumber(local.slice(0, (detected || selectedCountry).maxDigits));
    }
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
      if (searchRef.current) {
        searchRef.current.focus();
      }
    }
  }, [isOpen]);

  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return countries;
    const q = searchQuery.toLowerCase().trim();
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleCountrySelect = useCallback(
    (country: Country) => {
      setSelectedCountry(country);
      setIsOpen(false);
      setSearchQuery("");
      const digits = localNumber.replace(/\D/g, "").slice(0, country.maxDigits);
      setLocalNumber(digits);
      const formatted = formatPhone(digits, country.format);
      onChange(`${country.dialCode} ${formatted}`.trim(), country.code, digits);
    },
    [localNumber, onChange]
  );

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    const limited = raw.slice(0, selectedCountry.maxDigits);
    setLocalNumber(limited);
    const formatted = formatPhone(limited, selectedCountry.format);
    onChange(`${selectedCountry.dialCode} ${formatted}`.trim(), selectedCountry.code, limited);
  };

  // Keyboard navigation for dropdown
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < filteredCountries.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredCountries.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredCountries[highlightedIndex]) {
          handleCountrySelect(filteredCountries[highlightedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setSearchQuery("");
        break;
      case "Tab":
        setIsOpen(false);
        setSearchQuery("");
        break;
    }
  };

  // Ensure highlighted element is visible in scroll container
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.children[highlightedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [highlightedIndex, isOpen]);

  const displayValue = formatPhone(localNumber.replace(/\D/g, ""), selectedCountry.format);

  return (
    <div className={cn("relative w-full", className)} ref={dropdownRef} onKeyDown={handleKeyDown}>
      <div
        className={cn(
          "flex items-stretch rounded-lg border bg-background transition-all duration-200 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary",
          error ? "border-destructive focus-within:ring-destructive/20 focus-within:border-destructive" : "border-input",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {/* Country selector button */}
        <Button
          type="button"
          variant="ghost"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label="Select country calling code"
          className="flex items-center gap-2 px-3 h-11 rounded-r-none border-r border-input hover:bg-accent/60 focus-visible:bg-accent/60 shrink-0 font-normal select-none"
        >
          <CountryFlag code={selectedCountry.code} name={selectedCountry.name} className="w-5 h-3.5" />
          <span className="text-sm font-semibold text-foreground tracking-tight">
            {selectedCountry.dialCode}
          </span>
          <ChevronDown
            className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")}
          />
        </Button>

        {/* Phone number input */}
        <Input
          type="tel"
          value={displayValue}
          onChange={handleNumberChange}
          disabled={disabled}
          placeholder={selectedCountry.format?.replace(/X/g, "0") || "Enter mobile number"}
          aria-label="Mobile phone number"
          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-l-none h-11 text-sm bg-transparent px-3"
        />
      </div>

      {/* Helper / validation state feedback */}
      {localNumber.length === 0 && !disabled && (
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <CountryFlag code={selectedCountry.code} name={selectedCountry.name} className="w-3.5 h-2.5" />
          <span>{selectedCountry.name} ({selectedCountry.maxDigits} digits)</span>
        </p>
      )}
      {localNumber.length > 0 && localNumber.length < selectedCountry.maxDigits && !disabled && (
        <p className="text-xs text-muted-foreground mt-1">
          {selectedCountry.name}: {localNumber.length}/{selectedCountry.maxDigits} digits
        </p>
      )}
      {localNumber.length === selectedCountry.maxDigits && !disabled && (
        <p className="text-xs text-green-600 dark:text-green-500 mt-1 flex items-center gap-1 font-medium">
          ✓ Valid {selectedCountry.name} number
        </p>
      )}

      {/* Error display */}
      {error && <p className="text-xs text-destructive mt-1 font-medium">{error}</p>}

      {/* Dropdown list */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Country list"
          className="absolute top-full left-0 z-50 mt-1.5 w-full min-w-[280px] max-h-[300px] bg-popover border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in-80 slide-in-from-top-1"
        >
          {/* Search box */}
          <div className="p-2 border-b border-border/80 bg-popover/90 backdrop-blur-xs">
            <div className="relative flex items-center">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                placeholder="Search country or code..."
                aria-label="Search country or code"
                className="w-full pl-8 pr-8 py-1.5 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-sm"
                  aria-label="Clear search query"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Country options list */}
          <div ref={listRef} className="overflow-y-auto max-h-[235px] py-1">
            {filteredCountries.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center select-none">No countries found</p>
            ) : (
              filteredCountries.map((country, index) => {
                const isSelected = selectedCountry.code === country.code;
                const isHighlighted = highlightedIndex === index;
                return (
                  <button
                    key={country.code}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleCountrySelect(country)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={cn(
                      "w-full flex items-center justify-between gap-2.5 px-3.5 py-2 text-sm transition-colors text-left select-none cursor-pointer",
                      isSelected
                        ? "bg-primary/10 text-primary font-medium"
                        : isHighlighted
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/60 text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <CountryFlag code={country.code} name={country.name} className="w-5 h-3.5" />
                      <span className="truncate text-sm font-medium text-foreground">{country.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={cn("text-xs font-normal", isSelected ? "text-primary font-semibold" : "text-muted-foreground")}>
                        ({country.dialCode})
                      </span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

