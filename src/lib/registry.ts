import "server-only";
import { sql } from "./db";

// Live data from the national register, read through the privacy-safe views
// in db/public_views.sql. Every function returns null when no database is
// configured, so the website still builds and runs on its own.

export const CLUB_TYPES = ["UNIVERSITY", "SCHOOL", "CIVIL_CLUB", "INSTITUTIONAL"] as const;
export type ClubType = (typeof CLUB_TYPES)[number];

export type Club = { club_id: string; name: string; category: ClubType; district: string; athlete_count: number };

export type PublicMember = {
  slaa_id: string;
  display_name: string;
  is_minor: boolean;
  birth_year: number;
  gender: "M" | "F";
  district: string;
  is_athlete: boolean;
  is_coach: boolean;
  club_name: string | null;
};

export const registryConnected = () => sql !== null;

async function safely<T>(run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch (e) {
    console.error("registry query failed", (e as Error).message);
    return null;
  }
}

export async function listClubs(filter: { district?: string; type?: string; q?: string }): Promise<Club[] | null> {
  const db = sql;
  if (!db) return null;
  const like = filter.q ? `%${filter.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
  return safely(() => db<Club[]>`
    SELECT club_id, name, category, district, athlete_count FROM web.club_v
    WHERE (${filter.district ?? null}::text IS NULL OR district = ${filter.district ?? null})
      AND (${filter.type ?? null}::text IS NULL OR category = ${filter.type ?? null})
      AND (${like}::text IS NULL OR name ILIKE ${like})
    ORDER BY name LIMIT 500`);
}

export async function getClub(id: string): Promise<Club | null> {
  const db = sql;
  if (!db) return null;
  const rows = await safely(() => db<Club[]>`
    SELECT club_id, name, category, district, athlete_count FROM web.club_v WHERE club_id = ${id}`);
  return rows?.[0] ?? null;
}

export async function getMember(slaaId: string): Promise<PublicMember | null | undefined> {
  const db = sql;
  if (!db) return undefined;
  const rows = await safely(() => db<PublicMember[]>`
    SELECT slaa_id, display_name, is_minor, birth_year, gender, district, is_athlete, is_coach, club_name
    FROM web.member_v WHERE slaa_id = ${slaaId}`);
  return rows?.[0] ?? null;
}
