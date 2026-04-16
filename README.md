# Padel Tracker

A mobile-first web app for tracking padel matches in real time, storing match history, and maintaining a leaderboard for a group of players.

## Features

- **Live scoring** — large tap-friendly buttons for courtside use, 2-second undo grace period
- **Leaderboard** — sortable player rankings by win%, wins, losses
- **Player profiles** — stats, win rate, current streak, recent form, head-to-head records
- **Match summaries** — shareable results with collapsible game-by-game set details
- **Match history** — filterable list of all matches (completed, live, abandoned)
- **Player management** — pick existing players or create new ones, rename from profile page
- **1v1 and 2v2** — supports singles and doubles formats
- **Best of 3 sets** — standard tennis scoring with tiebreaks at 6-6

## Tech Stack

- React 19 + Vite 8
- Tailwind CSS v4
- React Router v7
- Supabase (PostgreSQL + REST API)
- Deployed on Vercel

## Getting Started

```bash
npm install
cp .env.example .env.local
# Fill in your Supabase credentials in .env.local
npm run dev
```

## Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `supabase/migration.sql`
3. Go to **Settings > API** and copy your **Project URL** and **Publishable key**
4. Add them to `.env.local`:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_...
   ```

## Scripts

```bash
npm run dev       # Start dev server (localhost:5173)
npm test          # Run scoring engine tests (Vitest)
npm run build     # Production build
```

## Deployment

Deployed via Vercel's native GitHub integration. Push to `main` triggers automatic deployment. Environment variables are configured in the Vercel dashboard.
