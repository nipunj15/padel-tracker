-- Add game_history column to matches table
-- Run this in Supabase SQL Editor if you already have the table created
alter table matches add column if not exists game_history jsonb not null default '[]';
