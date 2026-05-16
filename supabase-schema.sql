-- BookBuddy — Supabase Schema
-- Run this in your Supabase Dashboard → SQL Editor

-- 1. Books table
create table if not exists user_books (
  id           text        primary key,
  user_id      uuid        references auth.users(id) on delete cascade not null,
  title        text        default '',
  genre        text        default '',
  cover_image  text,
  word_count   integer     default 0,
  chapter_count integer    default 0,
  data         jsonb       not null,
  created_at   timestamptz default now() not null,
  updated_at   timestamptz default now() not null
);

-- 2. Row Level Security — users can only see/edit their own books
alter table user_books enable row level security;

create policy "users_own_books"
  on user_books for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. Index for fast listing by user + recency
create index if not exists user_books_user_updated
  on user_books (user_id, updated_at desc);

-- 4. Auto-update updated_at on upsert
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_books_updated_at
  before update on user_books
  for each row execute function update_updated_at();
