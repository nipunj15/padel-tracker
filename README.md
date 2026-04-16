# Padel Tracker

A mobile-first web app for tracking padel matches in real time, storing match history, and maintaining a leaderboard.

## Tech Stack

- React 19 + Vite
- Tailwind CSS v4
- React Router v7
- Supabase (database + API)
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
2. Run `supabase/migration.sql` in the SQL Editor
3. Copy your Project URL and Publishable key into `.env.local`

## Tests

```bash
npm test
```
