# Sri Lanka Athletics public website

The public website from Part 1 of the implementation plan. It covers news, the competition calendar, results, rankings, national records, athlete lookup by SLA ID, the club directory, coaches, development, anti-doping, about, downloads, privacy and terms. Every page is available in Sinhala (`/si`), Tamil (`/ta`) and English (`/en`).

This folder is a complete Next.js project of its own. It does not import anything from the registration portal, so you can move it anywhere and host it separately.

## Run it

```bash
cd website
npm install
cp .env.example .env.local   # optional, see below
npm run dev                  # http://localhost:3001
```

The website runs on port 3001 so it can run next to the registration portal on port 3000.

Before publishing:

```bash
npm run typecheck && npm run lint && npm test
npm run build
npm start
```

## Settings

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Public address of this website, used in the sitemap and share links. |
| `NEXT_PUBLIC_PORTAL_URL` | Address of the registration portal. All "Register" buttons go there. |
| `WEB_DATABASE_URL` | Read-only connection to the registry database. Optional. |
| `MEMBER_AUTH_SECRET` | Random secret of 32+ characters. Turns on member sign-in. |
| `MAILJET_API_KEY`, `MAILJET_SECRET_KEY`, `MAIL_FROM_EMAIL`, `MAIL_FROM_NAME` | Send the 6-digit codes through Mailjet. In development the code is printed in the server console instead. |
| `MEMBER_AUTH_MOCK` | Development only: `1` tries sign-in with fictional records and no database. |

All of them are optional for local work. Without `WEB_DATABASE_URL`, the club directory and the athlete lookup say "not connected" and the rest of the site works normally.

## Hosting

On Vercel, import the repository and set **Root Directory** to `website` (or to the root of its new repository if you move it), then add the variables above. Any host that runs Node 20 or newer also works with `npm run build` and `npm start`.

## Connecting the registry

The website never reads the registration tables directly. It reads two views that already hide private data. Minors are shown as initials plus a masked surname, and their club is not shown. Contact details, NIC numbers and documents are never exposed.

1. Apply the views once to the registry database as the owner: `psql "$DATABASE_URL" -f db/public_views.sql`.
2. Give the read-only role a login: `ALTER ROLE web_reader WITH LOGIN PASSWORD '...';`
3. Set `WEB_DATABASE_URL` to a connection string that uses `web_reader`.

Run step 1 again whenever the registry schema changes.

## Member sign-in

Members sign in at `/{lang}/sign-in` with their NIC, Postal ID or the email address they gave on the registration form. Nobody creates an account on the website: the login already exists.

- **Saved by the form.** Whenever the registration portal saves a member, a database trigger adds that email to `web_auth.users` with no password (`is_registered_via_form = true`). One email is one login, even when it is on several registrations (a parent who registered two children).
- **First sign-in.** The member enters their email. It has no password yet, so the website emails a 6-digit code through Mailjet. The code works for 5 minutes and 5 tries; a new code can be asked for once a minute (the button counts down). A correct code does not sign in yet: the member must choose a password (10 to 200 characters) first, then lands on `/{lang}/account`.
- **Later sign-ins.** The email has a password, so the next screen asks for it. A correct password starts a 7-day session.
- **Forgot password?** On the password screen. It emails a reset code; after the code, the member chooses a new password, and every other session is signed out.
- **NIC or Postal ID.** Instead of an email, the member may type the NIC (old or new format, spaces allowed) or Postal ID on their registration. Postal ID must be continuous — no spaces — with English or Sinhala letters and digits only (e.g. `CMT13021`); length is not fixed (max 40). `web.member_identify` finds the email on that pending or verified registration; the website shows it only masked (`ru******23@gmail.com`: first and last two characters and the domain, always six stars) and continues exactly as above with that email. The full address never reaches the browser: the form state carries only what the member typed and the masked text, and the server looks the email up again at every step. A number with no registration, or a registration with no email, gets its own message. Each number can be looked up 20 times an hour and each connection 60 times (counted as HMACs in `web_auth.lookup`, never raw addresses).
- **Can't access this email?** Shown under the masked email. The member gives their NIC or Postal ID, full name, a phone number and the new email. `web.member_email_reset_request` stores it in `slaa.email_reset_request` (at most 5 requests a day per connection and 3 waiting per number) and always answers "request received", whether or not the number is registered. Staff see it under **Email resets** in the admin panel, phone the member, and approve (the registration's email changes; the member then signs in with their NIC and the code goes to the new email) or reject. Every decision records the staff member and time in the request and the audit log.

Passwords are hashed with scrypt (built into Node, memory-hard, a common alternative to bcrypt) with a random salt per password. Codes are stored only as HMACs (`otp_codes.otp`), never as the 6 digits. Sessions are random tokens in an `HttpOnly` cookie, stored as HMACs, so they can be revoked, unlike a JWT.

`/{lang}/account` lists every registration with the signed-in email:

| Record status | Counts for sign-in | Shown as |
| --- | --- | --- |
| `pending` | Yes | "Waiting for SLA" |
| `verified` | Yes | Its private details |
| `suspended`, `merged` | No | Not shown |

An email with no pending or verified record cannot sign in, and its open sessions stop working. For an email typed in, the screens say "if this email is on a registration, we have sent a code" whether or not it is, so the form cannot be used to find out which emails are registered. A NIC or Postal ID does show whether it is registered (that is what makes the masked email possible); the lookup limits above slow down anyone trying many numbers. After 10 wrong codes or passwords in an hour, the email cannot sign in for the rest of that hour. An email gets at most 5 codes an hour.

To turn it on, apply `db/member_auth.sql` once as the database owner (after `db/public_views.sql`, and after migration `db/014_email_reset_request.sql` of the registration portal; re-apply it when this file changes), then set `MEMBER_AUTH_SECRET` and the Mailjet variables. It replaces the earlier SLA ID + NIC sign-in tables. The `web_reader` role still cannot read any table: it can only call the sign-in functions in schema `web`, which check every rule in the database.

## Member dashboard

`/{lang}/account` shows, under each of the member's registrations:

- **Athletes:** their events and personal bests, whether each PB is verified by their coach, and their live place in each event (among verified athletes of the same gender with a mark; it changes as soon as anyone's PB changes). They can send a new PB, which waits for their current coach and only then replaces the old one. **My coach** shows current, waiting and past coaches. Athletes search registered coaches by name or SLA ID and either **switch** (when the new coach accepts, the other current coaches become past coaches in the same step and lose access, so the athlete is never without a coach) or **add** another coach. Athletes with no current coach are asked to choose one. Existing registrations without a coach are not blocked.
- **Coaches:** athletes asking to be coached (accept or decline), marks to check (approve or reject with a reason), and their current athletes with contact details, events, places and a **Confirm PB** button for marks from the registration. Past athletes are only counted, never shown.
- **Privacy** (everyone): leave me out of the directory, hide club and school, hide year of birth, hide events and PBs. Phone, email, NIC and address are never public anyway. The athlete's current coach and SLA staff still see everything.

The **Athletes** and **Coaches** pages are a searchable public directory of verified members that honours these switches. Under-18s show a shortened name, no club and no marks, and can be found only by their exact SLA ID.

All of this goes through the functions in `db/member_dashboard.sql`, which check that the record belongs to the signed-in email (and, for coaches, that the athlete is theirs now). Every coach decision goes to the audit log. To turn it on, apply migration `db/015_member_dashboard.sql` of the registration portal, then `db/public_views.sql`, `db/member_auth.sql` and `db/member_dashboard.sql` from this folder, as the database owner. In the in-memory test mode (`MEMBER_AUTH_MOCK=1`) only sign-in works; the dashboard needs the database.

### Mailjet

1. Create a Mailjet account (the free plan sends 6,000 emails a month, at most 200 a day).
2. Add and verify the sending domain (for example `athletics.lk`) under **Senders & Domains**, and publish the SPF and DKIM records Mailjet shows. Do not send from a Gmail address: Gmail's own rules make those emails land in spam or bounce.
3. Copy the API key and secret key from **Account settings > REST API keys** into `MAILJET_API_KEY` and `MAILJET_SECRET_KEY`, and set `MAIL_FROM_EMAIL` to an address on the verified domain, such as `no-reply@athletics.lk`.

## Rankings

`/{lang}/rankings` has two tabs, for every event on the registration form (read from the register's `event` table, so new form events appear automatically):

- **Athletes:** verified members ranked by personal best, separately for men and women; a tick marks PBs confirmed by the athlete's coach. Members who hide their profile or results are left out, and under-18s are shown with a shortened name and no club. If an official season list for that event exists in `/admin`, it is shown underneath.
- **Coaches:** for each event, coaches ranked by the athletes they coach now (current, accepted links). Each athlete's standing within their gender is `(field - place + 1) / (field + 1)`, so winning a large field counts for more than being the only entrant; a coach's score out of 100 is 60% their best athlete's standing plus 40% the average of all their athletes in that event. Past athletes do not count.

Apply `db/rankings.sql` as the database owner (after `db/member_dashboard.sql`). Without a register connection the page shows only the season lists from `/admin`.

## Website admin (/admin)

Website editors manage the public content at `/admin`, in English: news (with cover photos), competitions with their results and PDF circulars, ranking lists, national records, the information pages (About, Development, Anti-doping, Downloads, Privacy, Terms), the PDFs on the Downloads page, and site settings (the sample-content banner and the home-page hero text). Saving refreshes the public pages straight away.

- **Accounts.** Editors have their own accounts, separate from members and from the registration portal's staff; they cannot see the register. Owners add editors with a temporary password, change roles, deactivate accounts and reset passwords. New and reset accounts must choose their own password (12+ characters) before doing anything else. Ten wrong passwords in an hour lock an email for the rest of the hour; sessions last 12 hours.
- **Results and rankings** are typed or pasted one athlete per line: `athlete, club, mark, wind` (rankings add `date, competition`), with tabs from a spreadsheet also accepted. Marks are written as people write them (10.21, 1:52.30, 7.68, 5400); lines that cannot be read are listed back and left out. Ranking lists are sorted best first automatically.
- **Languages.** Every text has English, Sinhala and Tamil fields. An empty Sinhala or Tamil field uses the English text, and the form shows such fields as empty with "Uses the English text", so missing translations are easy to spot.
- **Uploads.** Photos (JPG, PNG, WebP, up to 5 MB) and PDFs (up to 15 MB) are stored in the database and served at `/api/cms/file/<id>`. The file type is checked from its contents, not its name. Uploaded files are public website material.
- **Audit.** Sign-ins, every save, delete, upload and account change are logged; the dashboard shows the latest.

Setting it up:

1. Apply `db/cms.sql` as the database owner (after `db/member_auth.sql`).
2. Set `CMS_SECRET` (32+ characters) in the website's environment; `WEB_DATABASE_URL` stays the `web_reader` login, which can only call the CMS functions.
3. From `website/`, run `CMS_OWNER_EMAIL=you@athletics.lk CMS_DATABASE_URL=<owner connection> npm run cms:bootstrap`. It creates the first owner (temporary password written to `.env.local` as `CMS_OWNER_PASSWORD`, never printed) and copies the built-in content from `src/content` into the CMS, so the site looks the same until editors change it. Running it again changes nothing that already exists.

Without a database, or before `db/cms.sql` is applied, the website shows the built-in content from `src/content` as before.

## Content

News, competitions, results, rankings, records and the information pages live in `src/content/`. Each text is written in all three languages. The tests fail if a translation is missing.

The current content is **sample data with fictional names**, and every page shows a preview notice. When SLA supplies official content, replace the files in `src/content/` and set `SAMPLE_CONTENT = false` in `src/content/index.ts`. The privacy and terms pages are marked as drafts until they have been legally reviewed.

Interface text, such as buttons and headings, lives in `src/lib/dict/` with one file per language.
