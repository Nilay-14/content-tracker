# Content Tracker: Build Prompts for Claude Code

Paste these into Claude Code one step at a time. `CLAUDE.md` holds the full spec, so the prompts can stay short.

## How to work

- **Start a fresh Claude Code conversation for each step.** CLAUDE.md carries the context from one step to the next.
- **Test before moving on.** After each step, go through the **Check** list, on your phone where possible. Then tell Claude Code: `commit this`. Once step 5 is done, every push updates the live site automatically.
- **When something breaks,** paste the exact error message and describe what you tapped. For a visual problem, give Claude Code the screenshot file path.
- **Don't skip ahead.** Steps 1–5 give you a working app you can use daily. Everything after that is an upgrade.

---

## Step 0: Setup (you do this, no prompt)

1. Install **Node.js** (the LTS version) from nodejs.org.
2. Install **Claude Code**. The Quickstart page at docs.claude.com covers it.
3. Create free accounts on **GitHub**, **Supabase** and **Vercel**. Sign in to Vercel using your GitHub account.
4. In **Supabase**:
   - Create a new project and pick the region closest to you (Mumbai).
   - Open the project's API settings and copy two things: the **Project URL** and the **service_role / secret key**.
   - Keep the secret key private. It only goes into `.env.local` and Vercel's settings, never into chats or screenshots.
5. On your laptop:
   - Create a folder called `content-tracker` and put `CLAUDE.md` and this file inside it.
   - Open a terminal in that folder and start Claude Code.

---

## Step 1: Project setup

```text
Read CLAUDE.md and BUILD_PROMPTS.md. Do Step 1 only:
set up the project exactly as in the Tech stack and Access sections (Next.js App Router + TypeScript, Tailwind, shadcn/ui, @supabase/supabase-js used only on the server, date-fns).
Create .env.local.example with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then tell me where to paste my values.
Add the IST date helper from Core rules, and the robots.txt + noindex from Access.
Add the mobile bottom tab bar with four empty pages: Today, Calendar, Master, Setup.
Add the PWA manifest, simple app icons and a theme colour.
Initialise git with a proper .gitignore.
Start the dev server and tell me how to open it on my laptop AND on my phone on the same Wi-Fi.
```

**Check**
- The app opens on your laptop and on your phone.
- All four tabs switch pages.
- `.env.local` is not committed (it's listed in `.gitignore`).

---

## Step 2: Database

```text
Do Step 2 from BUILD_PROMPTS.md.
Write a Supabase migration in supabase/migrations/ for the enums and the four tables (brands, brand_month_targets, festivals, posts), exactly as in the Data model section of CLAUDE.md. Include the indexes, the updated_at trigger, the post_date/idea check constraint, and RLS enabled with no policies.
Tell me step by step how to run it in the Supabase SQL Editor.
Then create a server-only data layer (lib/db) that every page will use, plus the shared stats file for the Definitions section (it can stay mostly empty for now).
No login: see the Access section.
```

**Check**
- In Supabase's Table Editor you can see all 4 tables.
- The app still runs with no errors.

---

## Step 3: Setup page (brands, targets, festivals)

```text
Do Step 3: build the Setup page exactly as in CLAUDE.md:
- Brands: add / edit / archive / reorder, monthly target, optional preferred days, "Change target for one month", and the "Add starter brands" button.
- Festivals: add / edit with date / archive / reorder, and the "Add starter festivals" button.
```

**Check**
- Tap "Add starter brands". Cocoland shows 30, iCraft 25, Plush 8.
- Tap "Add starter festivals" and enter dates for Diwali and Children's Day.
- Set a one-month target (e.g. Plush, November = 10) and confirm it saves.

---

## Step 4: Today page

```text
Do Step 4: build the Today page exactly as in CLAUDE.md, including:
- the IST date with ‹ › and Today buttons, plus the date picker
- the upcoming festival banner
- the brand chips, remembering the last brand
- the full entry form with the Festival post toggle + picker + "Add festival"
- the status defaults and the skip reason
- the list of today's entries with edit/delete
- the This month's progress card with pace
Make the form fast to use one-handed on a phone.
```

**Check**
- Log a "Happy Diwali poster" for Cocoland as Static with the Festival post toggle on, set to Diwali.
- The progress card's Posted count goes up, and pace updates.
- With Diwali's date within 10 days, the banner shows Cocoland ✅ and the others ⏳.
- The date shows today in IST. Test this once after midnight too.

---

## Step 5: Go live + install on phone

```text
Do Step 5: help me put this online.
1. Create a GitHub repo and push the code (use the gh CLI if I have it, otherwise give me the exact clicks).
2. Give me the exact clicks to import the repo into Vercel and add the two environment variables.
3. Check the PWA manifest works so the app can be added to the home screen.
```

**Then install it on your phone**
- **Android (Chrome):** open the Vercel link, tap ⋮, then **Add to Home screen** (or **Install app**).
- **iPhone (Safari):** open the link, tap **Share**, then **Add to Home Screen**.

**Check**
- The app opens from your home screen without the browser bar, and an entry you save there shows up on your laptop.

👉 **From here, start using it daily.** Backfill 1–14 October from your Instagram grid, and tag the Navratri posts.

---

## Step 6: Brand calendar

```text
Do Step 6: build the Calendar page exactly as in CLAUDE.md, including:
- the brand selector and month switcher
- the summary strip with pace
- the month grid with every day state, the missed logic for preferred days, and the 🎉 festival marker
- the tap-a-day bottom sheet with "Add entry"
- the List view toggle with the Festival column
Put all the counting logic in the shared stats file so Master reuses it.
```

**Check**
- Cocoland (daily) shows red on past October days with no post. iCraft and Plush show no red, because they have no preferred days.
- The Diwali poster's day shows the 🎉 marker.

---

## Step 7: Master dashboard

```text
Do Step 7: build the Master page exactly as in CLAUDE.md:
- the month picker
- the summary as cards on phone and a table on desktop, with Target, Posted, Reels, Statics, Carousels, Stories, Festival, Pending, % and Pace, plus the Total
- tap Festival to list those posts
- the Festivals this month grid
- the combined log with filters, including festival and "festival posts only"
```

**Check**
- Example: Cocoland with 2 statics in October (Navratri + Diwali) shows Statics 2 and Festival 2, and tapping Festival lists both.
- The numbers match what you count by hand on the Calendar.

---

## Step 8: Missed, reschedule, upcoming

```text
Do Phase 2 item 1 from CLAUDE.md (missed list for brands with preferred days, Reschedule button using rescheduled_from, Upcoming 7 days).
```

**Check**
- Reschedule a missed Cocoland day. The original day turns blue-grey and is no longer counted as missed.

---

## Step 9: Repeat warning + autocomplete

```text
Do Phase 2 item 2 from CLAUDE.md (title and people autocomplete, and the 30-day repeat warning).
```

**Check**
- Log "Dumpling squishy" twice within 30 days. The second time, a warning shows but saving still works.

---

## Step 10: Performance results

```text
Do Phase 2 item 3 from CLAUDE.md (Add results on an entry, and Top 5 posts per brand on Master).
```

---

## Step 11: Monthly report export

```text
Do Phase 2 item 4 from CLAUDE.md: export the monthly report for one brand or all brands as an .xlsx file (Summary + Festivals + Log sheets) and as a printable PDF page.
```

**Check**
- Open the Excel file on your phone, and check its type and festival counts match the Master page.

---

## Step 12: Import your September Google Sheet

**Before you prompt**
- Download each **brand tab** as CSV: File → Download → CSV. **Don't use the master tab.** It's out of sync and has `#REF!` rows.
- On the Setup page, set the **September targets** with "Change target for one month": Cocoland 25, iCraft 25, Plush 14 (what the sheet planned).

```text
Do Phase 2 item 5 from CLAUDE.md: add a CSV import on the Setup page, one brand at a time.
CSV columns: Date, Day, Video / Content, Posted (TRUE/FALSE), Notes. Dates look like "01-Sep-2026 (Tue)" or "01-Sep-2026".
Mapping rules:
- Title: if "Video / Content" is a placeholder like "Cocoland Toys - Video 3" or "Plush - Post 5", use Notes as the title; otherwise use the Content value as the title and keep Notes as notes.
- Posted TRUE or the text "Done" → status posted. FALSE → status skipped with skip_reason "Not posted (imported)".
- A row with an empty Posted value that still has content or notes → status planned. A row with no content and no notes → skip it.
- Rows containing #REF! → skip them and list them in the summary.
- Ignore the Day column (it's calculated from Date).
- Content type: if the text contains "carousel" or "crousel" → carousel; "static", "creative post", "poster" or "offer post" → static; otherwise reel.
- Festival: if the title or notes contains a festival name from the festivals table (case-insensitive; also treat "Ganpati" as Ganesh Chaturthi), suggest that festival.
Show a preview table first (with the suggested type and festival, both editable) and save nothing until I confirm. Don't create duplicates (same brand + date + title).
At the end, show how many rows were imported and how many skipped, with the reason for each skip.
```

**Check**
- September on Master is close to your sheet: Cocoland 24 posted, and Plush's Ganpati offer posts show under Festival.

---

## Step 13: Idea bank

```text
Do Phase 2 item 6 from CLAUDE.md: a per-brand Ideas list (idea entries with no date) with a "Schedule" button that gives an idea a date and makes it planned.
```

---

## Later ideas (ask when you're ready)

- A simple 4-digit PIN lock, if you ever want one
- An 8 pm reminder if Cocoland hasn't posted today
- Read-only share links for brand owners
- Auto-pulling Instagram insights (needs a Meta business app, so it's the most setup)
