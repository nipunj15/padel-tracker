-- Padel Tracker — Supabase Migration
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- 1. Players table
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz default now()
);

-- 2. Matches table
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  format text not null check (format in ('1v1', '2v2')),
  team1_player_ids uuid[] not null default '{}',
  team2_player_ids uuid[] not null default '{}',
  team1_name text not null,
  team2_name text not null,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  is_deleted boolean not null default false,
  winner_team integer check (winner_team in (1, 2)),
  sets jsonb not null default '[]',
  current_set integer not null default 1,
  current_point_team1 integer not null default 0,
  current_point_team2 integer not null default 0,
  is_tiebreak boolean not null default false,
  tiebreak_point_team1 integer not null default 0,
  tiebreak_point_team2 integer not null default 0,
  point_history jsonb not null default '[]',
  game_history jsonb not null default '[]',
  created_at timestamptz default now(),
  started_at timestamptz,
  completed_at timestamptz
);

-- 3. Enable Row Level Security
alter table players enable row level security;
alter table matches enable row level security;

-- 4. RLS policies — allow anonymous access for all operations (v1, no auth)
create policy "Allow anonymous read on players"
  on players for select
  to anon
  using (true);

create policy "Allow anonymous insert on players"
  on players for insert
  to anon
  with check (true);

create policy "Allow anonymous update on players"
  on players for update
  to anon
  using (true)
  with check (true);

create policy "Allow anonymous read on matches"
  on matches for select
  to anon
  using (true);

create policy "Allow anonymous insert on matches"
  on matches for insert
  to anon
  with check (true);

create policy "Allow anonymous update on matches"
  on matches for update
  to anon
  using (true)
  with check (true);
