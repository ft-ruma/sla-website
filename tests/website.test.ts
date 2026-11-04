import { describe, expect, it } from "vitest";
import { COMPETITIONS, NEWS, PAGES, RANKINGS, RECORDS } from "@/content";
import { en } from "@/lib/dict/en";
import { si } from "@/lib/dict/si";
import { ta } from "@/lib/dict/ta";
import { formatMark, getEvent } from "@/lib/events";
import { formatDateRange } from "@/lib/i18n";
import { LANGS } from "@/lib/langs";
import { maskEmail } from "@/lib/mask";
import { parseMarkInput, parseRows, rowsToText } from "@/lib/mark-input";
import { bestPerYear, fieldGap, improvement, markValue, standing, topPercent } from "@/lib/marks";
import { isValidSlaaId, normalizeSlaaId } from "@/lib/slaa-id";

describe("SLA ID", () => {
  it("matches the plan's test vectors", () => {
    expect(isValidSlaaId("SL26-000452-8")).toBe(true);
    expect(isValidSlaaId("SL26-000452-3")).toBe(false);
    expect(isValidSlaaId("SL26-000001-3")).toBe(true);
    expect(isValidSlaaId("SL27-000001-1")).toBe(true);
  });

  it("accepts the ID typed without dashes or in lowercase", () => {
    expect(normalizeSlaaId("sl26 000452 8")).toBe("SL26-000452-8");
    expect(isValidSlaaId("sl260004528")).toBe(true);
  });
});

describe("marks", () => {
  it("formats times, distances and points", () => {
    expect(formatMark("100m", 10280)).toBe("10.28");
    expect(formatMark("800m", 125400)).toBe("2:05.40");
    expect(formatMark("MAR", 8054000)).toBe("2:14:14");
    expect(formatMark("LJ", 7680)).toBe("7.68");
    expect(formatMark("DEC", 7012)).toBe("7,012");
  });
});

describe("dates", () => {
  it("shortens ranges inside one month", () => {
    expect(formatDateRange("en", "2026-10-23", "2026-10-25")).toBe("23–25 October 2026");
    expect(formatDateRange("en", "2026-10-23", "2026-10-23")).toBe("23 October 2026");
  });
});

describe("translations", () => {
  it("has every interface text in Sinhala and Tamil", () => {
    for (const dict of [si, ta]) {
      expect(Object.keys(dict).sort()).toEqual(Object.keys(en).sort());
      for (const [k, v] of Object.entries(dict)) {
        expect(v.trim(), k).not.toBe("");
        if (/[a-z]{4,}/.test(en[k as keyof typeof en])) {
          expect(v, `${k} looks untranslated`).not.toBe(en[k as keyof typeof en]);
        }
      }
    }
  });

  it("has all content in three languages", () => {
    const texts = [
      ...NEWS.flatMap((n) => [n.title, n.summary]),
      ...COMPETITIONS.map((c) => c.name),
      ...Object.values(PAGES).flatMap((p) => [p.title, p.intro, ...p.sections.flatMap((s) => [s.heading, s.body])]),
    ];
    for (const text of texts) for (const l of LANGS) expect(text[l]?.trim(), text.en).toBeTruthy();
    for (const n of NEWS) {
      expect(n.body.si.length).toBe(n.body.en.length);
      expect(n.body.ta.length).toBe(n.body.en.length);
    }
  });
});

describe("content", () => {
  it("uses only known events", () => {
    const codes = [
      ...RANKINGS.map((r) => r.event),
      ...RECORDS.map((r) => r.event),
      ...COMPETITIONS.flatMap((c) => c.results?.map((r) => r.event) ?? []),
    ];
    for (const code of codes) expect(() => getEvent(code)).not.toThrow();
  });

  it("has unique addresses", () => {
    expect(new Set(NEWS.map((n) => n.slug)).size).toBe(NEWS.length);
    expect(new Set(COMPETITIONS.map((c) => c.id)).size).toBe(COMPETITIONS.length);
  });
});

describe("masked email", () => {
  it("shows the start, the end and the domain, and hides the length", () => {
    expect(maskEmail("rumeth.thathsilu23@gmail.com")).toBe("ru******23@gmail.com");
    expect(maskEmail("ruma23@gmail.com")).toBe("ru******23@gmail.com");
    expect(maskEmail("abc@sla.lk")).toBe("a******c@sla.lk");
    expect(maskEmail("ab@sla.lk")).toBe("a******@sla.lk");
    expect(maskEmail("a@sla.lk")).toBe("a******@sla.lk");
  });
});

describe("marks for charts", () => {
  it("turns times, distances and points into numbers", () => {
    expect(markValue("10.85")).toBeCloseTo(10.85);
    expect(markValue("1:52.30")).toBeCloseTo(112.3);
    expect(markValue("2.15.30")).toBeCloseTo(135.3);
    expect(markValue("7200")).toBe(7200);
    expect(markValue("fast")).toBeNull();
  });

  it("keeps the best mark of each year, oldest first", () => {
    const marks = [{ year: 2024, mark: "10.90" }, { year: 2024, mark: "10.80" }, { year: 2023, mark: "11.05" }, { year: null, mark: "9.0" }];
    expect(bestPerYear("100m", marks).map((p) => p.mark)).toEqual(["11.05", "10.80"]);
    expect(bestPerYear("LJ", [{ year: 2025, mark: "6.10" }, { year: 2025, mark: "6.40" }])[0].mark).toBe("6.40");
  });
});

describe("dashboard figures", () => {
  it("turns a place into a share of the field", () => {
    expect(standing(1, 18)).toBe(1);
    expect(topPercent(3, 18)).toBe(17);
    expect(topPercent(1, 500)).toBe(1);
  });

  it("describes progress with better always meaning faster or further", () => {
    const run = improvement("100m", bestPerYear("100m", [{ year: 2023, mark: "11.05" }, { year: 2025, mark: "10.72" }]), en);
    expect(run).toEqual({ better: true, text: "0.33 s better than 2023 (3.0%)" });
    const jump = improvement("LJ", bestPerYear("LJ", [{ year: 2024, mark: "6.40" }, { year: 2025, mark: "6.20" }]), en);
    expect(jump?.better).toBe(false);
    expect(jump?.text).toBe("0.20 m off your 2024 mark (3.1%)");
  });
});

describe("field gap", () => {
  const dist = [10.55, 10.64, 10.72, 10.81];
  it("says how far to the next place up", () => {
    expect(fieldGap("100m", dist, 10.72, 3)).toEqual({ leading: false, gap: "0.08 s", target: 2 });
  });
  it("says the lead when first, with further being better in jumps", () => {
    expect(fieldGap("100m", dist, 10.55, 1)).toEqual({ leading: true, gap: "0.09 s", target: 2 });
    expect(fieldGap("LJ", [6.1, 6.4, 7.05], 7.05, 1)?.gap).toBe("0.65 m");
  });
});

describe("admin mark input", () => {
  it("reads marks as people type them", () => {
    expect(parseMarkInput("100m", "10.21")).toBe(10210);
    expect(parseMarkInput("800m", "1:52.30")).toBe(112300);
    expect(parseMarkInput("MAR", "2:14:14")).toBe(8054000);
    expect(parseMarkInput("LJ", "7.68")).toBe(7680);
    expect(parseMarkInput("HEP", "5400")).toBe(5400);
    expect(parseMarkInput("100m", "fast")).toBeNull();
    expect(parseMarkInput("800m", "1:75.00")).toBeNull();
  });

  it("reads pasted rows, with commas or tabs, and round-trips them", () => {
    const { rows, errors } = parseRows("100m", "K. D. Perera, Army, 10.21, +1.4\nM. R. Fernando\tNavy\t10.35\t\nbroken line", "result");
    expect(rows).toEqual([
      { athlete: "K. D. Perera", club: "Army", mark: 10210, wind: 1.4 },
      { athlete: "M. R. Fernando", club: "Navy", mark: 10350 },
    ]);
    expect(errors).toEqual(["Line 3: broken line"]);
    expect(rowsToText("100m", rows, "result")).toBe("K. D. Perera, Army, 10.21, +1.4\nM. R. Fernando, Navy, 10.35, ");
    const ranking = parseRows("LJ", "A. S. Kumara, Air Force, 7.68, +0.9, 2026-07-12, Air Force Open", "ranking");
    expect(ranking.rows[0]).toMatchObject({ mark: 7680, date: "2026-07-12", competition: "Air Force Open" });
  });
});
