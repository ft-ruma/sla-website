import type { L10n } from "./i18n";

export type Measurement = "TIME" | "DISTANCE" | "HEIGHT" | "POINTS";

export type AthleticsEvent = {
  code: string;
  name: L10n;
  measurement: Measurement;
  /** Wind gauge readings decide whether a mark is legal. */
  windAffected: boolean;
};

const run = (m: number, extra?: { en: string; si: string; ta: string }): L10n => ({
  en: `${m.toLocaleString("en")}m${extra ? ` ${extra.en}` : ""}`,
  si: `මීටර් ${m}${extra ? ` ${extra.si}` : ""}`,
  ta: `${m} மீ${extra ? ` ${extra.ta}` : ""}`,
});
const HURDLES = { en: "hurdles", si: "කඩුලු", ta: "தடை ஓட்டம்" };

export const EVENTS: AthleticsEvent[] = [
  { code: "100m", name: run(100), measurement: "TIME", windAffected: true },
  { code: "200m", name: run(200), measurement: "TIME", windAffected: true },
  { code: "400m", name: run(400), measurement: "TIME", windAffected: false },
  { code: "800m", name: run(800), measurement: "TIME", windAffected: false },
  { code: "1500m", name: run(1500), measurement: "TIME", windAffected: false },
  { code: "5000m", name: run(5000), measurement: "TIME", windAffected: false },
  { code: "10000m", name: run(10000), measurement: "TIME", windAffected: false },
  { code: "100mH", name: run(100, HURDLES), measurement: "TIME", windAffected: true },
  { code: "110mH", name: run(110, HURDLES), measurement: "TIME", windAffected: true },
  { code: "400mH", name: run(400, HURDLES), measurement: "TIME", windAffected: false },
  { code: "3000mSC", name: { en: "3000m steeplechase", si: "මීටර් 3000 බාධක ධාවනය", ta: "3000 மீ தடைதாண்டல் ஓட்டம்" }, measurement: "TIME", windAffected: false },
  { code: "MAR", name: { en: "Marathon", si: "මැරතන්", ta: "மரதன்" }, measurement: "TIME", windAffected: false },
  { code: "4x100m", name: { en: "4×100m relay", si: "4×100 සහාය දිවීම", ta: "4×100 மீ அஞ்சல் ஓட்டம்" }, measurement: "TIME", windAffected: false },
  { code: "4x400m", name: { en: "4×400m relay", si: "4×400 සහාය දිවීම", ta: "4×400 மீ அஞ்சல் ஓட்டம்" }, measurement: "TIME", windAffected: false },
  { code: "HJ", name: { en: "High jump", si: "උස පැනීම", ta: "உயரம் தாண்டுதல்" }, measurement: "HEIGHT", windAffected: false },
  { code: "PV", name: { en: "Pole vault", si: "කණු පැනීම", ta: "கோலூன்றிப் பாய்தல்" }, measurement: "HEIGHT", windAffected: false },
  { code: "LJ", name: { en: "Long jump", si: "දුර පැනීම", ta: "நீளம் தாண்டுதல்" }, measurement: "DISTANCE", windAffected: true },
  { code: "TJ", name: { en: "Triple jump", si: "තුන් පිම්ම", ta: "மும்முறைத் தாண்டுதல்" }, measurement: "DISTANCE", windAffected: true },
  { code: "SP", name: { en: "Shot put", si: "යගුලිය දැමීම", ta: "குண்டு எறிதல்" }, measurement: "DISTANCE", windAffected: false },
  { code: "DT", name: { en: "Discus throw", si: "හිලිය විසි කිරීම", ta: "தட்டு எறிதல்" }, measurement: "DISTANCE", windAffected: false },
  { code: "HT", name: { en: "Hammer throw", si: "මිටිය විසි කිරීම", ta: "சம்மட்டி எறிதல்" }, measurement: "DISTANCE", windAffected: false },
  { code: "JT", name: { en: "Javelin throw", si: "හෙල්ල විසි කිරීම", ta: "ஈட்டி எறிதல்" }, measurement: "DISTANCE", windAffected: false },
  { code: "HEP", name: { en: "Heptathlon", si: "සප්තාංග", ta: "ஹெப்டத்லான்" }, measurement: "POINTS", windAffected: false },
  { code: "DEC", name: { en: "Decathlon", si: "දසාංග", ta: "டெக்கத்லான்" }, measurement: "POINTS", windAffected: false },
];

const BY_CODE = new Map(EVENTS.map((e) => [e.code, e]));

export function getEvent(code: string): AthleticsEvent {
  const e = BY_CODE.get(code);
  if (!e) throw new Error(`Unknown event ${code}`);
  return e;
}

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

/**
 * Marks are stored as integers: milliseconds for times, millimetres for
 * distances and heights, points for combined events.
 * 10320 → "10.32", 107650 → "1:47.65", 8054000 → "2:14:14", 8150 → "8.15".
 */
export function formatMark(code: string, value: number): string {
  const { measurement } = getEvent(code);
  if (measurement === "POINTS") return value.toLocaleString("en");
  if (measurement !== "TIME") return (value / 1000).toFixed(2);
  const hundredths = Math.round(value / 10);
  const totalSeconds = Math.floor(hundredths / 100);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const frac = pad(hundredths % 100);
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  if (m > 0) return `${m}:${pad(s)}.${frac}`;
  return `${s}.${frac}`;
}

export function formatWind(wind: number | undefined): string {
  if (wind === undefined) return "";
  return `${wind > 0 ? "+" : ""}${wind.toFixed(1)}`;
}
