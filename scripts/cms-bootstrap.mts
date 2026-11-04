// Creates the first website owner and copies the built-in content (src/content)
// into the CMS, so nothing is lost when the website switches to the database.
// Run once, after applying db/cms.sql, with an owner database connection:
//
//   CMS_OWNER_EMAIL=you@athletics.lk npm run cms:bootstrap
//
// The owner connection comes from CMS_DATABASE_URL or DATABASE_URL_UNPOOLED
// (environment or .env.local). A temporary password is written to .env.local
// as CMS_OWNER_PASSWORD (not printed); the owner must change it at first
// sign-in. Content kinds that already have items are left alone. Safe to re-run.

import { randomBytes, scrypt } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import postgres from "postgres";
import { COMPETITIONS } from "../src/content/competitions.ts";
import { NEWS } from "../src/content/news.ts";
import { PAGES } from "../src/content/pages.ts";
import { RANKINGS } from "../src/content/rankings.ts";
import { RECORDS } from "../src/content/records.ts";

const envFile = ".env.local";
const local = existsSync(envFile) ? parseEnv(readFileSync(envFile, "utf8")) : {};
const env = (k: string) => process.env[k] ?? local[k];

const url = env("CMS_DATABASE_URL") ?? env("DATABASE_URL_UNPOOLED");
const email = (env("CMS_OWNER_EMAIL") ?? "").trim().toLowerCase();
const name = (env("CMS_OWNER_NAME") ?? "Website owner").trim();
if (!url) throw new Error("Set CMS_DATABASE_URL (or DATABASE_URL_UNPOOLED) to an owner connection.");
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Set CMS_OWNER_EMAIL to the first owner's email.");

let password = env("CMS_OWNER_PASSWORD") ?? "";
if (password.length < 12) {
  password = randomBytes(18).toString("base64url");
  const text = existsSync(envFile) ? readFileSync(envFile, "utf8") : "";
  writeFileSync(envFile, `${text.replace(/\n?$/, "\n")}CMS_OWNER_PASSWORD=${password}\n`);
}

const hash = await new Promise<string>((resolve, reject) => {
  const salt = randomBytes(16).toString("hex");
  scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (e, key) =>
    e ? reject(e) : resolve(`scrypt-v1$${salt}$${key.toString("hex")}`));
});

const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
const lower = (s: string) => s.toLowerCase();

try {
  await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(719002)`;
    const [{ n }] = await tx<{ n: number }[]>`SELECT count(*)::int AS n FROM web_cms.editor`;
    if (n === 0) {
      await tx`INSERT INTO web_cms.editor (email, display_name, role, password_hash, must_change_password)
               VALUES (${email}, ${name}, 'owner', ${hash}, true)`;
      console.log(`Owner ${email} created. The temporary password is in ${envFile} (CMS_OWNER_PASSWORD).`);
    } else {
      console.log(`Editors already exist (${n}); no owner created.`);
    }

    const seed = async (kind: string, rows: { key: string; doc: unknown; date?: string | null }[]) => {
      const [{ c }] = await tx<{ c: number }[]>`SELECT count(*)::int AS c FROM web_cms.item WHERE kind = ${kind}`;
      if (c > 0) return console.log(`${kind}: ${c} already in the CMS, left alone.`);
      for (const r of rows) {
        await tx`INSERT INTO web_cms.item (kind, key, doc, published, sort_date, updated_by)
                 VALUES (${kind}, ${r.key}, ${tx.json(r.doc as never)}, true, ${r.date ?? null}, 'bootstrap')`;
      }
      console.log(`${kind}: ${rows.length} copied from the built-in content.`);
    };
    await seed("news", NEWS.map((d) => ({ key: d.slug, doc: d, date: d.date })));
    await seed("competition", COMPETITIONS.map((d) => ({ key: d.id, doc: d, date: d.start })));
    await seed("ranking", RANKINGS.map((d) => ({ key: lower(`${d.event}-${d.gender}-${d.season}`), doc: d, date: `${d.season}-01-01` })));
    await seed("record", RECORDS.map((d, i) => ({ key: `r-seed-${i + 1}`, doc: d, date: `${d.year}-01-01` })));
    await seed("page", Object.entries(PAGES).map(([key, d]) => ({ key: lower(key), doc: { ...d, key } })));
    await seed("setting", [{ key: "site", doc: { sampleNotice: true } }]);
  });
} finally {
  await sql.end();
}
