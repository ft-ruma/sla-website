import "server-only";
import { unstable_cache } from "next/cache";
import { sql } from "./db";

// Live rankings from the national register (db/rankings.sql). Each function
// returns null without a database connection, so the page can fall back to
// the season lists edited in /admin. Cached for five minutes.

export type RankingEvent = { code: string; name: string; category: string; ranked: number };

export type AthleteRank = {
  place: number; field: number; slaa_id: string; name: string; is_minor: boolean; district: string;
  club: string | null; mark: string; pb_year: number | null; verified: boolean;
};

export type CoachRank = {
  place: number; slaa_id: string; name: string; district: string; athletes: number; score: number;
  avg_standing: number; best_name: string; best_mark: string; best_gender: "M" | "F"; best_place: number; best_field: number;
};

// Errors are thrown inside the cache (which never stores them) and turned into
// null outside it, so a failed query is retried on the next request.
const cached = <A extends unknown[], T>(key: string, run: (...a: A) => Promise<T>) => {
  const inner = unstable_cache(run, [key], { tags: ["register"], revalidate: 300 });
  return async (...a: A): Promise<T | null> => {
    if (!sql) return null;
    try {
      return await inner(...a);
    } catch (e) {
      console.error("rankings:", (e as Error).message);
      return null;
    }
  };
};

export const rankingEvents = cached("rank-events", () => sql!<RankingEvent[]>`SELECT * FROM web.ranking_events()`);

export const athleteRanking = cached("rank-athletes", (event: string, gender: "M" | "F") =>
  sql!<AthleteRank[]>`SELECT * FROM web.athlete_ranking(${event}, ${gender}, 100)`);

export const coachRanking = cached("rank-coaches", (event: string) =>
  sql!<CoachRank[]>`SELECT * FROM web.coach_ranking(${event}, 100)`);
