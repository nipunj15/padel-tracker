# Padel Tracker

## Project Overview
Mobile-first padel match tracker for a small friend group. No authentication — public Supabase with RLS policies for anonymous access. Deployed on Vercel via native GitHub integration (push to main auto-deploys).

## Tech Stack
- React 19 + Vite 8 + Tailwind CSS v4 + React Router v7
- Supabase (Postgres + auto-generated REST API)
- Vitest for testing
- Deployed on Vercel

## Project Structure
```
src/
  components/      # Reusable UI components
    BottomNav.jsx    # Fixed bottom tab bar (Home, Matches, Players, + New)
    MatchCard.jsx    # Reusable match result card
    PlayerInput.jsx  # Player picker dropdown with "add new" option
  lib/
    scoring.js       # Pure function scoring engine (points, games, sets, tiebreaks, undo)
    scoring.test.js  # 29 Vitest tests for scoring logic
    stats.js         # Shared stats computation (leaderboard, player stats, H2H)
    supabase.js      # Supabase client init
  pages/
    Home.jsx         # Dashboard: top 5 leaderboard, last 3 matches
    Matches.jsx      # Full match history with status filters
    Players.jsx      # Sortable player table
    PlayerProfile.jsx # Player stats, recent form, H2H, match history, rename
    NewMatch.jsx     # Match setup: format toggle, player picker
    LiveMatch.jsx    # Live scoring with large tap buttons, undo grace period
    MatchSummary.jsx # Shareable match summary with collapsible game-by-game details
supabase/
  migration.sql      # Full schema (run on fresh Supabase project)
  add_game_history.sql # Incremental migration for game_history column
```

## Routes
- `/` — Home dashboard
- `/matches` — All matches with filters
- `/players` — Player leaderboard (sortable columns)
- `/players/:id` — Player profile
- `/match/new` — Create new match
- `/match/:id` — Live scoring (no bottom nav)
- `/match/:id/summary` — Shareable match summary

## Key Architecture Decisions
- **Scoring engine is pure functions** — no side effects, easy to test. All state transformations in `scoring.js`.
- **`game_history`** tracks every game won (set, game number, winner, running score). Enables collapsible set details in match summary.
- **`point_history`** stores full state snapshots for undo. Grace period (2s) allows quick undo before persisting to Supabase.
- **Stats computed client-side** — small user base, no need for server-side aggregation.
- **Player selection is pick-first, create-second** to prevent duplicate players from typos.
- **No delete RLS policy** on matches — deletes via Supabase dashboard only.

## Database
Two tables: `players` and `matches`. See `supabase/migration.sql` for full schema. Key fields on matches:
- `sets` (jsonb) — array of `{ team1_games, team2_games }`
- `game_history` (jsonb) — array of `{ set, game, winner_team, is_tiebreak, score_before }`
- `point_history` (jsonb) — state snapshots for undo
- `status` — `in_progress`, `completed`, or `abandoned`

## Commands
```bash
npm run dev       # Start dev server (localhost:5173)
npm test          # Run Vitest tests
npm run build     # Production build
```

## Environment Variables
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

## Scoring Rules
- Standard tennis scoring: 0/15/30/40/Deuce/Advantage
- First to 6 games wins a set (win by 2)
- Tiebreak at 6-6 (first to 7, win by 2)
- Best of 3 sets wins the match
