-- Quiz 2026 - Supabase schema
-- Run this in Supabase SQL Editor

create table if not exists public.quizzes (
  id uuid primary key,
  title text not null default 'Untitled Quiz',
  description text default '',
  questions jsonb not null default '[]'::jsonb,
  round_titles jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS but allow service-role/anon-key access (we use anon key from server)
alter table public.quizzes enable row level security;

-- Allow read for everyone (anon)
drop policy if exists "quizzes_select_all" on public.quizzes;
create policy "quizzes_select_all" on public.quizzes
  for select using (true);

-- Allow write for everyone (anon) — adjust if you add auth later
drop policy if exists "quizzes_write_all" on public.quizzes;
create policy "quizzes_write_all" on public.quizzes
  for all using (true) with check (true);

-- Optional: trigger to keep updated_at fresh on update
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_quizzes_updated_at on public.quizzes;
create trigger trg_quizzes_updated_at
before update on public.quizzes
for each row execute function public.set_updated_at();
