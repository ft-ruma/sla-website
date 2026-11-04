import "server-only";
import postgres from "postgres";

// Read-only connection used by the club directory and athlete lookup. The
// web_reader role can read only the privacy-safe views in schema "web".
const url = process.env.WEB_DATABASE_URL;

const globalForDb = globalThis as unknown as { webSql?: postgres.Sql };

export const sql: postgres.Sql | null = url
  ? (globalForDb.webSql ??= postgres(url, { max: 3, idle_timeout: 20, connect_timeout: 8, prepare: false }))
  : null;
