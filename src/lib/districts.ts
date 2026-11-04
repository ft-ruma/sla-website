import type { Lang } from "./i18n";

export const DISTRICTS = [
  "Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo", "Galle",
  "Gampaha", "Hambantota", "Jaffna", "Kalutara", "Kandy", "Kegalle",
  "Kilinochchi", "Kurunegala", "Mannar", "Matale", "Matara", "Monaragala",
  "Mullaitivu", "Nuwara Eliya", "Polonnaruwa", "Puttalam", "Ratnapura",
  "Trincomalee", "Vavuniya",
] as const;

const SI: Record<string, string> = {
  Ampara: "අම්පාර", Anuradhapura: "අනුරාධපුර", Badulla: "බදුල්ල", Batticaloa: "මඩකලපුව",
  Colombo: "කොළඹ", Galle: "ගාල්ල", Gampaha: "ගම්පහ", Hambantota: "හම්බන්තොට", Jaffna: "යාපනය",
  Kalutara: "කළුතර", Kandy: "මහනුවර", Kegalle: "කෑගල්ල", Kilinochchi: "කිලිනොච්චිය",
  Kurunegala: "කුරුණෑගල", Mannar: "මන්නාරම", Matale: "මාතලේ", Matara: "මාතර", Monaragala: "මොණරාගල",
  Mullaitivu: "මුලතිව්", "Nuwara Eliya": "නුවරඑළිය", Polonnaruwa: "පොළොන්නරුව", Puttalam: "පුත්තලම",
  Ratnapura: "රත්නපුර", Trincomalee: "ත්‍රිකුණාමලය", Vavuniya: "වව්නියාව",
};

const TA: Record<string, string> = {
  Ampara: "அம்பாறை", Anuradhapura: "அனுராதபுரம்", Badulla: "பதுளை", Batticaloa: "மட்டக்களப்பு",
  Colombo: "கொழும்பு", Galle: "காலி", Gampaha: "கம்பஹா", Hambantota: "அம்பாந்தோட்டை", Jaffna: "யாழ்ப்பாணம்",
  Kalutara: "களுத்துறை", Kandy: "கண்டி", Kegalle: "கேகாலை", Kilinochchi: "கிளிநொச்சி", Kurunegala: "குருநாகல்",
  Mannar: "மன்னார்", Matale: "மாத்தளை", Matara: "மாத்தறை", Monaragala: "மொனராகலை", Mullaitivu: "முல்லைத்தீவு",
  "Nuwara Eliya": "நுவரெலியா", Polonnaruwa: "பொலன்னறுவை", Puttalam: "புத்தளம்", Ratnapura: "இரத்தினபுரி",
  Trincomalee: "திருகோணமலை", Vavuniya: "வவுனியா",
};

export function districtName(lang: Lang, name: string) {
  if (lang === "si") return SI[name] ?? name;
  if (lang === "ta") return TA[name] ?? name;
  return name;
}
