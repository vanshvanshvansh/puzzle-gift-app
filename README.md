# Puzzle Gift

Turn a photo into a sliding puzzle, send a private link, and get a letter back when they solve it. Everything self-destructs after a chosen time window. No accounts, no paid infrastructure.

## 1. Set up Supabase (free tier)

1. Create a project at https://supabase.com (free tier).
2. Open the SQL editor and run `supabase/schema.sql` from this repo. This creates the `puzzles` table, RLS policies, and the `puzzle-images` storage bucket.
3. Go to Project Settings → API and copy your **Project URL** and **anon public key**.

## 2. Configure the app

```bash
cp .env.example .env
```

Fill in:
```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_PUBLIC_KEY
```

## 3. Run locally

```bash
npm install
npm run dev
```

Open the printed localhost URL. Everything works end-to-end against your real Supabase project — image upload, puzzle creation, solving, letters, dashboard, and live "Watch" mode.

## 4. Deploy the free expiry cleanup job

The app itself never deletes expired puzzles client-side (that's not trustworthy). A scheduled Edge Function does it:

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy cleanup-expired
```

Then in the Supabase Dashboard → Edge Functions → `cleanup-expired` → set a Cron schedule, e.g. every 2 minutes: `*/2 * * * *`.

This function needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as function secrets (the Supabase CLI sets `SUPABASE_URL` automatically; add the service role key from Project Settings → API):

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 5. Deploy the frontend (free)

Push this repo to GitHub, then import it in Vercel or Netlify (free tier). Add the same two `VITE_SUPABASE_*` env vars in your host's dashboard. Build command `npm run build`, output directory `dist`.

## How it's built

- **React + Vite + Tailwind** — frontend, no paid libraries.
- **Supabase** — Postgres (`puzzles` table), Storage (images), Realtime (live "Watch" view), scheduled Edge Function (expiry cleanup).
- **`share_token`** (goes in the link you send) and **`owner_token`** (stays only in the creator's `localStorage`) are two unrelated 32-byte random strings — one can never be derived from the other, and access control is capability-based: whoever holds a token can read/update only that one row.
- Puzzle engine (shuffle, solvability check, move logic, image slicing into tiles) is fully custom — no third-party puzzle library, since it also needs to drive the live piece-position broadcast and the blurred reference-hint panel.

## Project structure

```
src/
  lib/        supabase client, tokens, puzzle engine, db queries, localStorage, themes
  components/ GiftBox, CropStep, PuzzleBoard, ReferencePanel, LetterFlow
  pages/      Home, Create, Play (recipient + owner), Dashboard, Watch
supabase/
  schema.sql              run once in the SQL editor
  functions/cleanup-expired  scheduled Edge Function
```

## Notes / known simplifications

- The crop tool is a lightweight custom canvas cropper (drag to pan, slider to zoom, 90° rotate) rather than a third-party library — kept dependency-free and easy to extend.
- "Watch" mode polls via Supabase Realtime on `UPDATE` events; piece moves are broadcast with a small debounce (300ms) so it doesn't hammer the DB on fast dragging.
- Free-tier Supabase Realtime and Storage limits apply (fine for personal/gift-scale usage; not built for high traffic).
