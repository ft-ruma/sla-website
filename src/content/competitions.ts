import type { Competition } from "./types";

const ARMY = "Sri Lanka Army Sports Club";
const NAVY = "Sri Lanka Navy Sports Club";
const AIR = "Sri Lanka Air Force Sports Club";
const POLICE = "Sri Lanka Police Sports Club";

// Sample content: replace with official competitions and results.
export const COMPETITIONS: Competition[] = [
  {
    id: "national-championship-2026",
    name: { en: "National Athletics Championship 2026", si: "2026 ජාතික මලල ක්‍රීඩා ශූරතාවලිය", ta: "2026 தேசிய மெய்வல்லுநர் சாம்பியன்ஷிப்" },
    category: "national",
    venue: "Sugathadasa Stadium",
    district: "Colombo",
    start: "2026-09-18",
    end: "2026-09-20",
    results: [
      { event: "100m", gender: "M", stage: "official", rows: [
        { athlete: "K. D. Perera", club: ARMY, mark: 10280, wind: 0.8 },
        { athlete: "M. R. Fernando", club: NAVY, mark: 10350, wind: 0.8 },
        { athlete: "S. A. Bandara", club: AIR, mark: 10410, wind: 0.8 },
        { athlete: "N. Sivakumar", club: "Jaffna Athletics Club", mark: 10490, wind: 0.8 },
      ] },
      { event: "100m", gender: "F", stage: "official", rows: [
        { athlete: "A. Sanduni Perera", club: ARMY, mark: 11620, wind: 1.1 },
        { athlete: "K. Hashini Gunawardena", club: AIR, mark: 11750, wind: 1.1 },
        { athlete: "M. Fathima Rizna", club: "Kandy Athletics Club", mark: 11830, wind: 1.1 },
      ] },
      { event: "400m", gender: "M", stage: "official", rows: [
        { athlete: "P. L. Wickramasinghe", club: ARMY, mark: 46120 },
        { athlete: "H. M. Dissanayake", club: NAVY, mark: 46580 },
        { athlete: "J. M. Rizan", club: POLICE, mark: 47030 },
      ] },
      { event: "800m", gender: "F", stage: "official", rows: [
        { athlete: "S. Ishara Herath", club: ARMY, mark: 125400 },
        { athlete: "P. Methmi Ranasinghe", club: "University of Colombo", mark: 127120 },
        { athlete: "R. Kavya Senthilnathan", club: "Jaffna Athletics Club", mark: 128900 },
      ] },
      { event: "LJ", gender: "M", stage: "official", rows: [
        { athlete: "A. S. Kumara", club: AIR, mark: 7680, wind: 1.2 },
        { athlete: "D. T. Silva", club: ARMY, mark: 7520, wind: 0.4 },
        { athlete: "N. Sivakumar", club: "Jaffna Athletics Club", mark: 7410, wind: -0.3 },
      ] },
      { event: "JT", gender: "M", stage: "official", rows: [
        { athlete: "R. P. Jayalath", club: ARMY, mark: 74200 },
        { athlete: "W. A. Senanayake", club: NAVY, mark: 70850 },
        { athlete: "T. M. Ekanayake", club: POLICE, mark: 68330 },
      ] },
      { event: "HJ", gender: "F", stage: "provisional", rows: [
        { athlete: "K. Hashini Gunawardena", club: AIR, mark: 1780 },
        { athlete: "D. Nethmi Abeysekara", club: "Kandy Athletics Club", mark: 1740 },
        { athlete: "S. Tharsika Mahendran", club: "University of Jaffna", mark: 1700 },
      ] },
    ],
  },
  {
    id: "national-junior-championship-2026",
    name: { en: "National Junior Championship 2026", si: "2026 ජාතික කනිෂ්ඨ ශූරතාවලිය", ta: "2026 தேசிய இளையோர் சாம்பியன்ஷிப்" },
    category: "national",
    venue: "Diyagama Mahinda Rajapaksa Stadium",
    district: "Colombo",
    start: "2026-10-23",
    end: "2026-10-25",
    entryDeadline: "2026-10-10",
  },
  {
    id: "southern-province-championship-2026",
    name: { en: "Southern Province Championship 2026", si: "2026 දකුණු පළාත් ශූරතාවලිය", ta: "2026 தென் மாகாண சாம்பியன்ஷிப்" },
    category: "provincial",
    venue: "Uyanwatte Stadium",
    district: "Matara",
    start: "2026-11-14",
    end: "2026-11-15",
    entryDeadline: "2026-11-01",
  },
  {
    id: "inter-university-championship-2026",
    name: { en: "Inter-University Championship 2026", si: "2026 අන්තර් විශ්වවිද්‍යාල ශූරතාවලිය", ta: "2026 பல்கலைக்கழகங்களுக்கிடையிலான சாம்பியன்ஷிப்" },
    category: "university",
    venue: "University of Peradeniya Grounds",
    district: "Kandy",
    start: "2026-11-27",
    end: "2026-11-29",
    entryDeadline: "2026-11-15",
  },
  {
    id: "schools-relay-carnival-2026",
    name: { en: "All-Island Schools Relay Carnival 2026", si: "2026 සමස්ත ලංකා පාසල් සහාය දිවීම් උළෙල", ta: "2026 அகில இலங்கை பாடசாலை அஞ்சல் ஓட்டத் திருவிழா" },
    category: "schools",
    venue: "Sugathadasa Stadium",
    district: "Colombo",
    start: "2026-12-05",
    end: "2026-12-06",
  },
  {
    id: "colombo-marathon-2026",
    name: { en: "Colombo Marathon 2026", si: "2026 කොළඹ මැරතන්", ta: "2026 கொழும்பு மரதன்" },
    category: "road",
    venue: "Galle Face Green",
    district: "Colombo",
    start: "2026-12-13",
    end: "2026-12-13",
  },
];
