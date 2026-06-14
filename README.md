# The Intermission — Personal Edition

A moment of calm in a busy world. Your day — feeds, news, and optionally your inbox — composed into a small daily magazine and delivered to your Kindle each morning. An audience of one: you.

This is **Phase 1** of The Intermission project: prove the product on your own daily workflow before building the consumer app (Phase 2, scaffolded separately in `quiet.zip`).

## How it works

```
GitHub Actions (daily cron, free)
        │
        ▼
   src/pipeline.ts
        │
        ├── fetch your RSS/Substack feeds ──┐
        ├── fetch news feeds ───────────────┤
        ├── fetch Gmail (optional) ─────────┤
        ├── fetch daily Met drawing ────────┤
        │                                   ▼
        │                       Claude Haiku (per-item summaries)
        │                                   │
        │                                   ▼
        │                       Claude Sonnet (final synthesis)
        │                                   │
        ▼                                   ▼
   EPUB build (or PDF) ◄────────  structured briefing JSON
   + composed cover image
        │
        ▼
   your own Gmail → SMTP → your @kindle.com address
```

No database. No web app. No auth system. No hosting. The entire "backend" is a script that GitHub runs for free every morning.

## What you need to sign up for

| Service | Why | Cost |
|---|---|---|
| **Anthropic API** | The AI pipeline | Pay-as-you-go, roughly $0.08–0.15/day |
| **GitHub** | Free daily scheduler (you almost certainly have this) | Free |
| Google Cloud Console | *Only if* you want Gmail ingestion | Free |

That's it. No domain, no Resend, no database host, no job queue service.

## Setup (~20 minutes)

### 1. Install

```bash
npm install
cp .env.example .env
```

### 2. Anthropic key

console.anthropic.com → API keys → paste into `.env` as `ANTHROPIC_API_KEY`.

### 3. Gmail app password (for SENDING to your Kindle)

1. Google Account → Security → 2-Step Verification (enable if you haven't)
2. Search "App passwords" → create one named `intermission`
3. Put your Gmail address and the app password in `.env`

### 4. Approve your sender with Amazon

1. amazon.co.uk → Account → Manage Your Content and Devices → Preferences
2. Personal Document Settings → find your Kindle's @kindle.com address → put it in `intermission.config.ts`
3. Approved Personal Document E-mail List → add **your own Gmail address**

### 5. Configure your briefing

Edit `intermission.config.ts` — your Kindle address, timezone, feeds, interests, length. This file *is* your account settings.

### 6. Test locally

```bash
npm run briefing:dry   # generates PDF into ./output, doesn't send
npm run briefing       # generates AND sends to your Kindle
```

Check your Kindle. Your first issue should land within a couple of minutes.

### 7. Automate with GitHub Actions

1. Push this repo to GitHub (private repo is fine)

git init
git add .
git status (checkk)
git commit -m "Initial commit"
git remote add origin https://github.com/theintermission/the-intermission.git
git branch -M main
git push -u origin main

2. Repo → Settings → Secrets and variables → Actions → add:
   - `ANTHROPIC_API_KEY`
   - `GMAIL_ADDRESS`
   - `GMAIL_APP_PASSWORD`
   - (and the three `GOOGLE_*` secrets if using Gmail ingestion)
3. The workflow in `.github/workflows/daily.yml` runs at 04:30 UTC daily. Adjust the cron to taste.
4. Test it: repo → Actions → "Daily briefing" → Run workflow

If a run fails, GitHub emails you. That's your monitoring.

### 8. Optional: Gmail ingestion (reading your inbox)

This is the most involved step, skip it until you want it:

1. console.cloud.google.com → new project
2. Enable the **Gmail API**
3. OAuth consent screen → External → add yourself as test user
4. Credentials → OAuth client ID → **Desktop app** → copy ID + secret to `.env`
5. Run `npm run gmail:auth` → browser opens → authorize → paste the printed refresh token into `.env`
6. Set `gmail.enabled: true` in `intermission.config.ts`

⚠ Google expires refresh tokens after 7 days while your OAuth app is in "testing" mode. To avoid weekly re-auth, publish the app (it can stay unverified — only you use it).

## Delivery format

`format` in `intermission.config.ts`:

- **`"epub"` (default, recommended)** — Amazon converts it on arrival. You get: the day's composed cover as the book thumbnail in your Kindle library, chapter navigation between sections, and on-device font size control (reflowable text).
- **`"pdf"`** — fixed magazine layout with exact typography, page sized to a Kindle Paperwhite screen. No reflowing, no thumbnail cover.

Live with the EPUB for a week first; switch to PDF if you find you miss the fixed layout.

## No repeats across issues

Every article URL that appears in an issue is remembered in `.seen-articles.json`, so the same piece never features twice — even when a slow-updating feed (Aeon, Quanta, a research blog) keeps showing its last post in the RSS for days. On a day a feed has nothing new, it simply contributes nothing; the day it publishes, the new piece appears once and never again. URLs are normalised first, so tracking parameters, trailing slashes, and http/https don't let the same article slip through as "new".

This memory must persist between daily runs. The GitHub Action commits `.seen-articles.json` (and the Interlude's `.interlude-history.json`) back to the repo after each successful run — that's why the workflow has `contents: write` permission and a "Save run state" step. Locally, the files just sit in your project folder. Dry runs deliberately do NOT record articles as seen, so you can test freely without "using up" a day's content.

## Worth Reading in Full

A `verbatimFeeds` list in `intermission.config.ts` (alongside `feeds` and `newsFeeds`) holds feeds you want to read IN FULL rather than summarised — a favourite Substack, say. Each morning, if a verbatim feed's most recent post was published in the last 24 hours, the whole post is pulled and placed in a "Worth Reading in Full" section after The Long Read. If the latest post is older than 24h, that feed contributes nothing that day.

This makes the issue longer on days when there's a fresh post — by design, for deeper end-of-issue reading. Best kept to a small number of long-form feeds. Full post HTML is cleaned into plain paragraphs (images, subscribe widgets, and share buttons removed).

## The Interlude

Between The World and Your Interests sits a short pause — a verbatim passage from a curated deck of public-domain prose, philosophy, and aphorisms (`src/interludes.ts`), drawn at random each morning, avoiding recent repeats. Real text, real attribution, genuine variety.

Grow it freely: open `src/interludes.ts` and add entries (verbatim text + attribution). The rules are in the file header — keep them public domain, verbatim, and short. The more you add, the longer the gaps between repeats; there's no other upkeep.

## The daily frontispiece

Each issue's cover carries a different public-domain drawing or print from the Metropolitan Museum of Art's Open Access collection (CC0, ~492k works, free API, no key needed). The pipeline rotates through themes across the week — landscapes, botanical studies, architecture, birds — picks deterministically by date, converts to grayscale, and captions it museum-style. If the Met API is unreachable, the issue simply renders without it.

Toggle with `illustration.enabled` in `intermission.config.ts`.

## Daily cost

Standard-length briefing from ~6 feeds: roughly **$0.08–0.15/day** in Anthropic API usage (~$3–4.50/month). Shorter briefings and fewer feeds cost less.

## Iterating (the whole point)

You're validating the product on yourself. Things to tune as you live with it:

- **The synthesis voice** — edit the system prompt in `src/ai/synthesize.ts`
- **The template** — `src/pdf/template.tsx`. Print an issue. Read it on the actual Kindle. Adjust.
- **Your sources** — `intermission.config.ts`. The mix matters more than the count.
- **Length** — `standard` is ~15 min. Try `short` for busy weeks.

Keep notes on what feels wrong each morning. After 2–3 weeks of daily use you'll know exactly what the consumer product needs to be — that's your Phase 2 spec.

## Phase 2: the consumer app

When you're ready, the multi-user scaffold (Next.js + Clerk + Stripe + Neon + Inngest) is in the separate `quiet.zip` from earlier. The pipeline code here transfers almost directly — the consumer app wraps it in auth, billing, and a settings UI.

Suggested promotion criteria before starting Phase 2:
- You've read it ≥ 20 mornings and still want it
- At least 3 friends have seen an issue and asked for one
- You know your ideal default settings from lived experience
