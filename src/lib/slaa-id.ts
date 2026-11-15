// SLA ID: SLA26-000452-8 (year, 6-digit serial, Luhn check digit over the
// 8 digits). IDs issued before the unified format (A26-..., C26-..., O26-...)
// stay valid for life. Legacy SL26-… still normalises to SLA26-….
// Must give the same answer as the registry's checker.

export const SLAA_ID_REGEX = /^(?:SLA|[ACO])[0-9]{2}-[0-9]{6}-[0-9]$/;

export function checkDigit(body: string): number {
  const digits = body.replace(/\D/g, "");
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    const d = Number(digits[i]);
    if ((digits.length - (i + 1)) % 2 === 0) {
      const x = d * 2;
      sum += Math.floor(x / 10) + (x % 10);
    } else {
      sum += d;
    }
  }
  return (10 - (sum % 10)) % 10;
}

/** Uppercase and restore the dashes people often leave out; upgrade SL… → SLA…. */
export function normalizeSlaaId(input: string): string {
  let v = input.toUpperCase().replace(/[\s–—]/g, "").replace(/-/g, "");
  if (v.startsWith("SL") && !v.startsWith("SLA")) v = "SLA" + v.slice(2);
  const m = v.match(/^(SLA|[ACO])(\d{2})(\d{6})(\d)$/);
  return m ? `${m[1]}${m[2]}-${m[3]}-${m[4]}` : input.trim().toUpperCase().replace(/^SL(?=\d)/, "SLA");
}

export function isValidSlaaId(id: string): boolean {
  const v = normalizeSlaaId(id);
  if (!SLAA_ID_REGEX.test(v)) return false;
  return checkDigit(v.slice(0, -2)) === Number(v.at(-1));
}
