# Content Tracker

A personal web app for tracking daily social media content across multiple brands. It replaces a monthly Google Sheet that had one tab per brand plus a master tab. The owner is a social media manager who logs entries mostly from their phone.

## Working with the owner

- The owner is not a full-time developer. After each task, explain in plain words what changed and exactly how to test it, on the laptop and on the phone.
- Build one step at a time, following `BUILD_PROMPTS.md`. Don't start the next step or phase unless asked.
- Ask before adding any paid service, or any third-party package that isn't in the stack below.
- Before saying a task is done, run `npm run lint`, `npx tsc --noEmit` and `npm run build`, and fix every error.
- Keep secrets in `.env.local` and never commit it. Keep `.env.local.example` up to date.
- When a step is finished, tick it in the **Progress** section at the bottom of this file.

## Tech stack

- **Next.js** (App Router) with **TypeScript**
- **Tailwind CSS** and **shadcn/ui** components
- **Supabase** Postgres as the database, using `@supabase/supabase-js`
- **date-fns** for dates, plus a small helper that always works in IST (see Core rules)
- **Hosting:** Vercel, auto-deploying from the GitHub `main` branch
- **PWA:** a web app manifest, app icons, a theme colour and `display: standalone`, so the app can be added to the phone home screen. There is no offline mode in v1.
- SQL changes go in `supabase/migrations/` as numbered `.sql` files.

## Access (no login, by the owner's choice)

- **No login, accounts or user_id columns.** Whoever opens the site can use it. Don't add authentication unless asked.
- **The database is only reached from the server**, through Server Actions or Route Handlers.
  - The server uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Neither gets a `NEXT_PUBLIC_` prefix, and both are imported only in server-only files.
  - The browser never talks to Supabase directly.
- **Row Level Security is enabled on every table with no policies**, so the public anon key can't read or write anything.
- **Keep the site out of search engines:** a `robots.txt` that disallows everything, plus `<meta name="robots" content="noindex">`.

## Core rules

- **Mobile-first.** Design at 375px width first, then make sure it also looks fine on desktop. Tap targets are at least 44px. A bottom tab bar holds Today · Calendar · Master · Setup.
- **The timezone is Asia/Kolkata (IST).**
  - "Today" must always be computed in IST, never UTC. Vercel servers run in UTC, so between 00:00 and 05:30 IST a UTC date would show yesterday.
  - Store dates as Postgres `date`, with no time.
- **Date display** uses the style `14-Oct-2026 (Wed)`, matching the old sheet.
- **Numbers are always calculated** from the database when a page loads. Never store totals or completion %. Stored and linked totals are what broke the old sheet: it showed `#REF!` errors and the master tab drifted out of sync with the brand tabs.
- **Brands and festivals are data, not code.** Nothing is hard-coded per brand or festival. Anything added on the Setup page must appear everywhere automatically.
- A brand can have more than one entry on the same day, for example a reel and a festival poster.

## Data model

### Enums

- `content_type`: `reel`, `static`, `carousel`, `story`, `other`
- `post_status`: `idea`, `planned`, `shot`, `edited`, `scheduled`, `posted`, `skipped`

### `brands`

| column | type | notes |
|---|---|---|
| id | uuid pk | `gen_random_uuid()` |
| name | text not null unique | |
| instagram_handle | text | e.g. `@cocolandtoys` |
| color | text not null | hex, default `#6366F1` |
| monthly_target | int not null | default 0; the default number of posts per month |
| preferred_days | smallint[] not null | default `{}` (none); 0 = Sunday … 6 = Saturday; optional |
| is_active | boolean | default true; false means archived |
| sort_order | int | default 0 |
| created_at | timestamptz | default `now()` |

### `brand_month_targets` (optional override of the target for one month)

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| brand_id | uuid → brands | `on delete cascade` |
| month | date | always the 1st of the month |
| target | int not null | |

`brand_id` and `month` are unique together.

### `festivals`

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| name | text not null unique | e.g. Diwali |
| festival_date | date null | this year's date, entered by the owner; optional |
| is_active | boolean | default true |
| sort_order | int | default 0 |
| created_at | timestamptz | |

### `posts` (one row per content entry)

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| brand_id | uuid → brands, not null | `on delete restrict` |
| post_date | date | may be null only when status = `idea` (check constraint) |
| title | text not null | content or product, e.g. "Dumpling squishy" or "Happy Diwali poster" |
| content_type | content_type | default `reel` |
| slide_count | smallint null | pages (images) in a carousel, 1–20; null for other types |
| platform | text | default `instagram` |
| status | post_status | default `posted` |
| skip_reason | text | used when status = `skipped` |
| rescheduled_from | date | the missed date this entry replaces |
| festival_id | uuid → festivals, null | set when this is a festival post; `on delete set null` |
| post_url | text | |
| people | text[] | default `{}`; people featured or collaborators |
| notes | text | |
| views, likes, comments, shares, saves, followers_gained | int null | performance results (Phase 2) |
| metrics_updated_at | timestamptz | |
| created_at, updated_at | timestamptz | `updated_at` is maintained by a trigger |

- **Indexes:** `posts(post_date)`, `posts(brand_id, post_date)` and `posts(festival_id)`.
- **RLS:** enabled on all four tables, with no policies (see Access).

## Definitions (use these everywhere; put the logic in one shared file)

**Monthly numbers per brand**
- **Target** for a month = the `brand_month_targets` value if one exists; otherwise `brands.monthly_target`.
- **Posted** = the number of entries with status `posted` whose `post_date` is in that month.
- **By type** = posted entries counted per `content_type` (Reels, Statics, Carousels, Stories, Other).
- **Carousel pages** = the sum of `slide_count` over posted carousels. **Statics** shows single static posts **plus** carousel pages (3 statics + 5 carousels of 7 pages → Statics 38, Carousels 5 · 35 pages). Posted, Pending and % still count entries, not pages.
- **Festival posts** = posted entries with `festival_id` set. They are also counted in their type: a Diwali poster counts as 1 Static **and** 1 Festival post.
- **Pending** = max(Target − Posted, 0).
- **Completion %** = Posted ÷ Target, shown to 1 decimal place. Show "—" if the target is 0.

**Pace (current month only)**
- Expected by today = round(Target × today's day of month ÷ days in month).
- If Posted ≥ Expected, show **"On track"**; otherwise show **"Behind by N"**.
- For past months, show **"Done"** if Posted ≥ Target, otherwise **"Short by N"**.
- For future months, show "—".

**Preferred days (optional)**
- A brand can have no preferred days; then it is tracked by target and pace only.
- When it does have them:
  - A **missed day** is a preferred day before today with no `posted` or `skipped` entry for that brand, where no entry points to it through `rescheduled_from`.
  - A **due** day is today, when it is a preferred day and nothing is posted yet.
- **Totals row:** the sum across active brands.

## Screens

### Today (`/`), the home screen

**Top of the screen**
- The date, defaulting to today in IST.
- ‹ and › buttons for the previous and next day, a tap-to-pick date picker, and a "Today" button that jumps back.
- **Upcoming festival banner:** for each active festival whose date falls in the next 10 days, e.g. "🎉 Diwali in 6 days: Cocoland ✅ · iCraft 📅 · Plush ⏳".
  - ✅ = a posted entry tagged with this festival
  - 📅 = a planned or in-progress entry tagged with it
  - ⏳ = nothing yet
- Brand chips in each brand's colour, with one selected at a time.
- Remember the last selected brand on this device in `localStorage`, wrapped in try/catch.

**Entry form**
- **Content / product** (required)
- **Type:** Reel, Static, Carousel, Story or Other, shown as buttons; default Reel
- **Festival post:** a toggle that, when on, shows a festival picker.
  - Festivals with the nearest upcoming dates are listed first.
  - The picker includes "+ Add festival", which creates a new festival inline.
- **Status:** defaults to Posted if the date is today or earlier, and to Planned if the date is in the future
- **Reason:** appears only when the status is Skipped
- **Post link** (optional)
- **People featured:** free-text chips
- **Notes**

**Saving**
- Save shows a small success toast. The form then clears but keeps the date and brand.

**Below the form**
- The entries already logged for this date and brand. Tap one to edit it or delete it; ask for confirmation before deleting.
- **This month's progress** card, with one line per active brand: Posted / Target, %, pace, and ⏳ when today is a preferred day with nothing posted. Tapping a line selects that brand.

### Calendar (`/calendar`)

- A brand selector and a month switcher, defaulting to the current month.
- A summary strip at the top: Target · Posted · Pending · % · Pace.
- A month grid with these day states:

| State | Look |
|---|---|
| Posted | green |
| In progress (planned, shot, edited, scheduled) | amber |
| Idea | light |
| Skipped | grey |
| Missed (preferred days only) | red |
| Rescheduled | blue-grey |
| Today, preferred day, nothing yet | outlined |
| Festival post on that day | a small 🎉 marker |

- Tapping a day opens a bottom sheet with that day's entries and an "Add entry" button, prefilled with that date and brand.
- A toggle switches to a **List view** with columns Date, Day, Content, Type, Festival, Status and Notes, like the old sheet.

### Master (`/master`)

- A month picker, defaulting to the current month.

**Summary**
- On a phone: one card per active brand, followed by a Total card. On desktop: a table with one row per brand plus a Total row.
- Each card or row shows:

| Column | Notes |
|---|---|
| Brand | in its colour |
| Target | |
| Posted | |
| Reels | |
| Statics | |
| Carousels | |
| Stories | |
| 🎉 Festival | |
| Pending | |
| % | |
| Pace | |

- Show an Other column only when it is above 0.
- Tapping the 🎉 Festival number lists those posts, e.g. "Navratri: Static, 5-Oct" and "Diwali: Static, 20-Oct".
- Tapping a brand name opens its calendar.

**Festivals this month**
- A grid with festivals as rows and brands as columns. Each cell shows the count of posted festival entries, with the types on tap (e.g. "1 Static, 1 Reel").
- Only festivals that have at least one entry this month, or a date in this month, are shown.

**Combined log**
- Every entry in the month, newest first.
- Filters: brand, status, type, festival, and "festival posts only".
- Search text.
- Tap a row to edit it.

### Setup (`/setup`)

**Brands section**
- The list of brands, active first and archived after. Up and down buttons change the order.
- Add / edit form:
  - name, Instagram handle and colour
  - monthly target (the default)
  - optional preferred days: seven toggles plus "Daily" and "None" shortcuts
- **"Change target for one month":** pick a month and enter a number. This writes to `brand_month_targets`.
- Archive a brand to hide it from Today and Master while keeping its history. Allow a hard delete only for a brand with no entries.
- When there are no brands yet, show **"Add starter brands"**, which inserts the seed brands.

**Festivals section**
- The list of festivals with their dates.
- Add, edit (name and this year's date), archive, and reorder.
- When the list is empty, show **"Add starter festivals"**.

## Seed data

**Brands**

| name | handle | colour | monthly target | preferred days |
|---|---|---|---|---|
| Cocoland Toys | @cocolandtoys | #F59E0B | 30 | daily |
| iCraft Asia | @icraft.asia | #8B5CF6 | 25 | none |
| Plush Salon | @plushunisexbeautysalon | #EC4899 | 8 | none |

**Festivals** (names only; the owner fills in the dates):
Ganesh Chaturthi, Navratri, Dussehra, Karva Chauth, Dhanteras, Diwali, Bhai Dooj, Children's Day, Christmas, New Year, Makar Sankranti, Republic Day, Valentine's Day, Holi, Gudi Padwa, Raksha Bandhan, Independence Day, Janmashtami.

## Phase 2 (build only when asked)

1. **Missed, reschedule and upcoming**
   - Master gets a "Missed this month" list for brands with preferred days. Each missed day has a **Reschedule** button that creates a `planned` entry on a new date with `rescheduled_from` set to the missed date.
   - Master also gets an "Upcoming 7 days" list.
2. **Repeat warning and autocomplete**
   - While typing Content, suggest earlier titles for this brand.
   - If the same title (case-insensitive, trimmed) was posted for this brand in the last 30 days, show a note like "Last posted 13-Sep (21 days ago)". This is a warning only and never blocks saving.
   - Add the same autocomplete for People.
3. **Performance results**
   - An "Add results" section on each entry for views, likes, comments, shares, saves and followers gained.
   - Master gets "Top 5 posts this month" per brand, ranked by views.
4. **Monthly report export**
   - For one brand or all brands, for a chosen month.
   - An Excel (.xlsx) file with three sheets: a Summary sheet with the same columns as Master (including the type and festival counts), a Festivals sheet and a Log sheet.
   - Also a printable PDF page.
5. **Import of the old Google Sheet:** CSV upload per brand. The mapping rules are in `BUILD_PROMPTS.md`, step 12.
6. **Idea bank:** a per-brand list of `idea` entries with no date, each with a "Schedule" button that gives it a date and status `planned`.

## Later (out of scope for now)

- An optional simple PIN lock
- Reminders by push notification or WhatsApp
- Read-only share links for brand owners
- Auto-pulling Instagram insights through the Meta API
- Offline mode

## Progress

- [x] 1 Project setup
- [x] 2 Database
- [x] 3 Setup page (brands, targets, festivals)
- [x] 4 Today page
- [x] 5 Deploy to Vercel + install on phone
- [x] 6 Calendar
- [x] 7 Master dashboard
- [x] 8 Missed, reschedule, upcoming
- [x] 9 Repeat warning + autocomplete
- [x] 10 Performance results
- [x] 11 Monthly report export (printable PDF page; Excel skipped by the owner's choice)
- [x] 12 Import September sheet
- [x] 13 Idea bank
