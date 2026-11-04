import type { RankingList } from "./types";

const NC = "National Championship";
const AF = "Air Force Open";
const SP = "Southern Province Open";

// Sample content: in production these lists are rebuilt from official results.
export const RANKINGS: RankingList[] = [
  { event: "100m", gender: "M", season: 2026, rows: [
    { athlete: "K. D. Perera", club: "Sri Lanka Army Sports Club", mark: 10210, wind: 1.4, date: "2026-07-12", competition: AF },
    { athlete: "M. R. Fernando", club: "Sri Lanka Navy Sports Club", mark: 10350, wind: 0.8, date: "2026-09-18", competition: NC },
    { athlete: "S. A. Bandara", club: "Sri Lanka Air Force Sports Club", mark: 10380, wind: 1.9, date: "2026-07-12", competition: AF },
    { athlete: "N. Sivakumar", club: "Jaffna Athletics Club", mark: 10490, wind: 0.8, date: "2026-09-18", competition: NC },
    { athlete: "D. T. Silva", club: "Sri Lanka Army Sports Club", mark: 10520, wind: 0.2, date: "2026-06-21", competition: SP },
  ] },
  { event: "100m", gender: "F", season: 2026, rows: [
    { athlete: "A. Sanduni Perera", club: "Sri Lanka Army Sports Club", mark: 11580, wind: 1.6, date: "2026-07-12", competition: AF },
    { athlete: "K. Hashini Gunawardena", club: "Sri Lanka Air Force Sports Club", mark: 11750, wind: 1.1, date: "2026-09-18", competition: NC },
    { athlete: "M. Fathima Rizna", club: "Kandy Athletics Club", mark: 11830, wind: 1.1, date: "2026-09-18", competition: NC },
  ] },
  { event: "400m", gender: "M", season: 2026, rows: [
    { athlete: "P. L. Wickramasinghe", club: "Sri Lanka Army Sports Club", mark: 46120, date: "2026-09-19", competition: NC },
    { athlete: "H. M. Dissanayake", club: "Sri Lanka Navy Sports Club", mark: 46580, date: "2026-09-19", competition: NC },
    { athlete: "J. M. Rizan", club: "Sri Lanka Police Sports Club", mark: 47030, date: "2026-09-19", competition: NC },
  ] },
  { event: "800m", gender: "F", season: 2026, rows: [
    { athlete: "S. Ishara Herath", club: "Sri Lanka Army Sports Club", mark: 124810, date: "2026-07-13", competition: AF },
    { athlete: "P. Methmi Ranasinghe", club: "University of Colombo", mark: 127120, date: "2026-09-20", competition: NC },
    { athlete: "R. Kavya Senthilnathan", club: "Jaffna Athletics Club", mark: 128900, date: "2026-09-20", competition: NC },
  ] },
  { event: "LJ", gender: "M", season: 2026, rows: [
    { athlete: "A. S. Kumara", club: "Sri Lanka Air Force Sports Club", mark: 7680, wind: 1.2, date: "2026-09-19", competition: NC },
    { athlete: "D. T. Silva", club: "Sri Lanka Army Sports Club", mark: 7550, wind: 1.8, date: "2026-07-12", competition: AF },
    { athlete: "N. Sivakumar", club: "Jaffna Athletics Club", mark: 7410, wind: -0.3, date: "2026-09-19", competition: NC },
  ] },
  { event: "JT", gender: "M", season: 2026, rows: [
    { athlete: "R. P. Jayalath", club: "Sri Lanka Army Sports Club", mark: 75110, date: "2026-07-13", competition: AF },
    { athlete: "W. A. Senanayake", club: "Sri Lanka Navy Sports Club", mark: 70850, date: "2026-09-20", competition: NC },
    { athlete: "T. M. Ekanayake", club: "Sri Lanka Police Sports Club", mark: 68330, date: "2026-09-20", competition: NC },
  ] },
  { event: "HJ", gender: "F", season: 2026, rows: [
    { athlete: "K. Hashini Gunawardena", club: "Sri Lanka Air Force Sports Club", mark: 1780, date: "2026-09-20", competition: NC },
    { athlete: "D. Nethmi Abeysekara", club: "Kandy Athletics Club", mark: 1740, date: "2026-09-20", competition: NC },
    { athlete: "S. Tharsika Mahendran", club: "University of Jaffna", mark: 1700, date: "2026-09-20", competition: NC },
  ] },
];
