# Padel Tracker — Product Requirements Document

## Overview

A mobile-first web app for tracking padel matches in real time, storing match history, and maintaining a leaderboard for a group of players. No login required — built for a small trusted group.

---

## Tech Stack

- React + Vite + Tailwind CSS
- React Router
- Supabase (database + API)
- Deployed on Vercel

---

## Database Schema

### `players`

| Column       | Type          | Constraints / Default       |
|--------------|---------------|-----------------------------|
| `id`         | uuid          | PK                          |
| `name`       | text          | unique, not null             |
| `created_at` | timestamptz   | default `now()`              |

### `matches`

| Column                  | Type          | Constraints / Default                                      |
|-------------------------|---------------|------------------------------------------------------------|
| `id`                    | uuid          | PK                                                         |
| `format`                | text          | `'1v1'` or `'2v2'`                                        |
| `team1_player_ids`      | uuid[]        |                                                            |
| `team2_player_ids`      | uuid[]        |                                                            |
| `team1_name`            | text          | e.g. `"Nipun / Keerthi"`                                  |
| `team2_name`            | text          | e.g. `"Ravi / Anand"`                                     |
| `status`                | text          | `'in_progress'`, `'completed'`, or `'abandoned'`           |
| `is_deleted`            | boolean       | default `false`                                            |
| `winner_team`           | integer       | nullable — `1` or `2`                                      |
| `sets`                  | jsonb         | array of `{ team1_games, team2_games }`                    |
| `current_set`           | integer       | default `1` (1-indexed)                                    |
| `current_point_team1`   | integer       | standard scoring: `0/1/2/3/4` → `0/15/30/40/Adv`          |
| `current_point_team2`   | integer       | standard scoring: `0/1/2/3/4` → `0/15/30/40/Adv`          |
| `is_tiebreak`           | boolean       | default `false`                                            |
| `tiebreak_point_team1`  | integer       | default `0` — raw point count used during tiebreaks        |
| `tiebreak_point_team2`  | integer       | default `0` — raw point count used during tiebreaks        |
| `point_history`         | jsonb         | array of snapshots of match state for undo                 |
| `created_at`            | timestamptz   | default `now()`                                            |
| `started_at`            | timestamptz   | nullable — set when first point is scored                  |
| `completed_at`          | timestamptz   | nullable — set on match completion                         |

---

## Scoring Rules

### Standard Points

- Points follow standard tennis notation: 0 → 15 → 30 → 40 → game.
- At 40–40: **Deuce**. Next point = Advantage. Win from Advantage = game. Lose from Advantage = back to Deuce.
- Use `current_point_team1` / `current_point_team2` with the `0/1/2/3/4` mapping for standard scoring.

### Sets

- First to **6 games**, must win by 2.
- At 6–6: **tiebreak** begins. Set `is_tiebreak = true`.
- Tiebreak: first to **7 points**, must win by 2. Uses raw point counts (`tiebreak_point_team1` / `tiebreak_point_team2`), not the 15/30/40 notation.
- On tiebreak completion, reset `is_tiebreak = false` and tiebreak point counters.

### Match

- **Best of 3 sets**. First to win 2 sets wins the match.
- On match completion: set `status = 'completed'`, `winner_team` (1 or 2), and `completed_at`.

### Out of scope for v1

- Match tiebreak / super tiebreak (first to 10 instead of full third set). If the group adopts this later, the `is_tiebreak` + raw point counters can be extended to support it.

---

## Screens

### `/` — Home

- Prominent **"New Match"** button.
- **Leaderboard table**: all players sorted by win%, with columns: Player / W / L / Win%.
  - In 2v2 matches, wins and losses are attributed to **both players** on the team.
  - Players with fewer than 3 completed matches: show win% as `–` (insufficient data) and sort them below players with 3+ matches.
  - Exclude matches where `is_deleted = true` or `status = 'abandoned'` from all leaderboard calculations.
- **Recent matches list**: last 10 completed matches showing teams, final set scores, and date.

### `/match/new` — New Match Setup

- Toggle: **1v1 or 2v2**.
- Text inputs for player names per team (2 inputs for 2v2, 1 for 1v1).
- Autocomplete player names from existing Supabase `players` table. If a name doesn't exist, auto-create the player record on match creation.
- **"Start Match"** creates the match record (with `status = 'in_progress'`, `current_set = 1`) and navigates to `/match/:id`.

### `/match/:id` — Live Scoring

- **Two large tap-friendly buttons** (one per team) to award a point — primary interaction, must be thumb-friendly on mobile.
- **Undo grace period**: after tapping a score button, show a brief (2-second) undo toast/banner before committing to Supabase. Tapping undo during this window reverts the point without writing to the database. After the grace period, the point commits and the standard undo button (using `point_history`) is available for older points.
- **Current point score display**:
  - Standard: `0 / 15 / 30 / 40 / Deuce / Adv`.
  - Tiebreak: raw point counts (e.g. `5 – 4`).
- **Current game score** within the active set.
- **Set score history** shown as score boxes, e.g. `[6-4] [3-6] [–]`.
- **Undo button**: reverts to the previous state snapshot from `point_history`.
- **Abandon match button**: sets `status = 'abandoned'`. Confirmation required.
- **Share button**: copies `/match/:id/summary` URL to clipboard.
- **Set `started_at`** to `now()` on the very first point scored in the match (not on match creation).
- **Auto-navigate** to summary screen on match completion.

### `/match/:id/summary` — Match Summary (shareable)

- Final set scores.
- Winner highlighted (teal accent).
- Match duration (computed from `started_at` to `completed_at`).
- Must be fully readable by anyone with the link, no account needed.

---

## Supabase Setup

- All tables: **public read, public insert, public update** (no auth for v1).
- RLS policies should explicitly allow anonymous access for all operations.
- Credentials via `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables.
- All leaderboard and recent-matches queries must filter out `is_deleted = true` and `status = 'abandoned'` records.

---

## Design Principles

- **Mobile-first throughout** — designed for use courtside on a phone.
- **Large score numbers, high contrast**, readable in outdoor sunlight.
- **Teal accent color** for winner/winning team highlights.
- **Minimal chrome** — the scoring screen should feel instant and distraction-free.
- The score buttons should be the dominant UI element on the live scoring screen — at least 50% of the viewport height.

---

## Implementation Notes

### Point History & Undo

- Each point scored pushes a snapshot of the current match state onto the `point_history` array before applying the new point.
- The undo button pops the last snapshot and restores it as the current state.
- For v1, full-state snapshots are acceptable. A future optimization could store only the scoring sequence and replay forward.

### Screen Lock / Rehydration

- The live scoring screen (`/match/:id`) must rehydrate cleanly from Supabase state on mount. If the user's phone locks mid-match and they reopen the browser, the page should fetch current match state from Supabase and resume correctly.

### Security Note (v1 acceptable, v2 consideration)

- Public insert/update means anyone with a match UUID can modify scores. UUIDs make discovery unlikely but not impossible.
- Since the share feature distributes match URLs publicly, a future v2 mitigation would be a `creator_token` stored in `localStorage` that is required for write operations.

---

## Out of Scope for v1

- Authentication / user accounts
- Push notifications
- Player profile pages
- Tournament brackets
- Match tiebreak / super tiebreak (third-set alternative)
- Analytics beyond the leaderboard (head-to-head, streaks, etc.)