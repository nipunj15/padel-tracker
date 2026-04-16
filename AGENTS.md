# Agents Guide

## Working on the Scoring Engine (`src/lib/scoring.js`)
- All scoring logic is pure functions — no side effects, no Supabase calls
- `scorePoint(match, team)` is the main entry point — returns a new match state
- Always run `npm test` after any changes to scoring logic
- The `game_history` array must be updated in `winGame()` and `winTiebreak()` — don't forget this when adding new scoring features
- `point_history` stores snapshots BEFORE applying each point — used for undo
- `undoPoint()` must restore `game_history` from the snapshot (it's included in `createSnapshot`)

## Working on Pages
- All pages except `LiveMatch.jsx` should include `<BottomNav />` and use `pb-24` padding to avoid content behind the nav
- Use `<MatchCard />` for displaying match results (don't rebuild match cards inline)
- Player names should link to `/players/:id` wherever displayed
- Stats computation lives in `src/lib/stats.js` — don't duplicate logic in page components

## Working on the Database
- Schema is in `supabase/migration.sql` (full) — update this for new projects
- Put incremental migrations in `supabase/` with descriptive names
- No delete RLS policy exists — if you need programmatic deletes, add one first
- All queries should filter `is_deleted = false` and exclude `status = 'abandoned'` for leaderboard/stats
- The `game_history` column was added after initial launch — old matches may have empty arrays

## Testing
- Tests are in `src/lib/scoring.test.js` using Vitest
- Test helpers: `makeMatch()`, `scoreN()`, `winGame()`, `winGames()`
- When testing set/match progression, interleave games (don't score all for one team then the other — the set will be won early)
- Run `npm test` before committing

## Deployment
- Push to `main` triggers Vercel deployment automatically
- Environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) are configured in Vercel dashboard
- Run `npm run build` locally to verify before pushing
