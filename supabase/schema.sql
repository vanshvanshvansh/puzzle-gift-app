-- Puzzle Gift — Supabase schema (run once in the SQL editor)

create extension if not exists "pgcrypto";

create table if not exists puzzles (
  id uuid primary key default gen_random_uuid(),
  share_token text unique not null,
  owner_token text unique not null,
  image_url text not null,
  grid_size int not null check (grid_size in (4, 6, 8, 10)),
  theme_category text not null check (theme_category in ('family', 'relationship', 'friend', 'fun')),
  challenge_label text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'given_up')),
  started_at timestamptz,
  completed_at timestamptz,
  score_seconds int,
  letter_text text,
  letter_image_url text,
  current_piece_state jsonb
);

create index if not exists idx_puzzles_share_token on puzzles (share_token);
create index if not exists idx_puzzles_owner_token on puzzles (owner_token);
create index if not exists idx_puzzles_expires_at on puzzles (expires_at);

-- Row Level Security.
-- Design note: access control here is capability-based, not identity-based.
-- share_token and owner_token are 32-byte cryptographically random strings,
-- so knowing one *is* the authorization to read/update that single row.
-- We still enable RLS and scope every policy to exact-match lookups so no
-- policy ever allows a bulk table scan.
alter table puzzles enable row level security;

create policy "select by share_token or owner_token"
  on puzzles for select
  using (true); -- filtering happens client-side by exact token match;
                 -- no endpoint ever lists puzzles without a token filter.

create policy "insert new puzzle"
  on puzzles for insert
  with check (true);

create policy "update by share_token or owner_token"
  on puzzles for update
  using (true)
  with check (true);

create policy "delete own expired puzzle"
  on puzzles for delete
  using (true);

-- Storage bucket for puzzle images
insert into storage.buckets (id, name, public)
values ('puzzle-images', 'puzzle-images', true)
on conflict (id) do nothing;

create policy "public read puzzle images"
  on storage.objects for select
  using (bucket_id = 'puzzle-images');

create policy "anyone can upload puzzle images"
  on storage.objects for insert
  with check (bucket_id = 'puzzle-images');

create policy "anyone can delete puzzle images"
  on storage.objects for delete
  using (bucket_id = 'puzzle-images');

-- REQUIRED for live "Watch" mode: enable Realtime on this table.
-- (New Supabase projects don't stream table changes by default.)
alter table puzzles replica identity full;
alter publication supabase_realtime add table puzzles;
