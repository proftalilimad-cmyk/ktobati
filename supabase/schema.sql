-- ============================================================================
--  المكتبة الإلكترونية العربية — Supabase schema (CMS backend, production-ready)
-- ----------------------------------------------------------------------------
--  Apply in the Supabase SQL editor (or `supabase db push`).
--
--  STORAGE ARCHITECTURE (this version = 2 external providers only):
--
--                        BIBLIOTHÈQUE  (admin CMS)
--                              │
--                              ▼
--                        SUPABASE  DB          ← metadata + URLs/ids ONLY,
--                              │                  NEVER the PDF/EPUB bytes
--                   ┌──────────┴──────────┐
--                   ▼                     ▼
--                ONEDRIVE             UP-4EVER
--             stockage / archive   téléchargement + monétisation
--                   │                     │
--                   └──────────┬──────────┘
--                              ▼
--                         SITE PUBLIC  →  📥 Télécharger
--
--    • book_files stores provider + file_type + file_name + file_size +
--      download_url + read_url + external_file_id — but NO file contents.
--    • Only 'onedrive' and 'up4ever' are offered by the admin UI in this
--      version. Legacy provider values are kept in the enum so pre-existing
--      books keep rendering (never deleted, never faked).
--    • The 'book-files' Supabase bucket is NOT used for PDF/EPUB here; files
--      live on OneDrive / Up-4ever. The bucket is retained (unused) so older
--      supabase-hosted rows still resolve.
--
--  Security model:
--    • Public (anon) users can SELECT only PUBLISHED + PUBLIC books.
--    • Authenticated admins can INSERT / UPDATE / DELETE everything.
--    • Never expose the service_role key in the frontend.
--    • Provider API secrets (OneDrive Graph, Up-4ever) live server-side only.
--  The frontend ships a Supabase data layer (src/store/supabase.ts): set
--  VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY to activate it — the catalog then
--  hydrates from this schema and admin changes write back. With no env vars the
--  app runs on the local (browser) store, unchanged.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type book_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type visibility as enum ('public', 'private');
exception when duplicate_object then null; end $$;

do $$ begin
  create type contributor_role as enum ('author', 'translator', 'reviewer');
exception when duplicate_object then null; end $$;

-- External storage providers for book files (extensible — add values as needed)
do $$ begin
  create type storage_provider as enum (
    'onedrive', 'up4ever', 'fileink', 'rapidfiles', 'filefire', 'supabase', 'local', 'external'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type book_file_type as enum ('pdf', 'epub');
exception when duplicate_object then null; end $$;

do $$ begin
  create type link_status as enum ('active', 'unverified', 'broken');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Helper: is the current user an admin?
--   Store admin user ids in `admins`, or adapt to a JWT claim / role.
-- ---------------------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql stable
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  slug        text primary key,
  name        text not null,
  icon        text default '📚',
  description text default '',
  "group"     text default 'عام',
  image       text,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Authors
-- ---------------------------------------------------------------------------
create table if not exists public.authors (
  id         text primary key,           -- external / slug id
  name       text not null,
  bio        text,
  photo      text,
  country    text,
  website    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Books
-- ---------------------------------------------------------------------------
create table if not exists public.books (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  title         text not null,
  teaser        text default '',
  description   text default '',
  language      text default 'العربية',
  year_original text,
  year_published text,
  isbn          text,
  pages         integer,
  words         integer,
  author_bio    text,
  featured      boolean not null default false,
  status        book_status not null default 'draft',
  visibility    visibility  not null default 'public',
  cover_url     text,               -- external cover, or public URL of uploaded cover
  cover_path    text,               -- storage path in `book-covers` bucket
  -- convenience denormalised pointers to the PRIMARY file (optional; the full
  -- list lives in book_files). Kept to match the frontend record shape.
  storage_provider storage_provider,
  download_url  text,
  read_url      text,
  rights_confirmed boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists books_status_idx     on public.books (status, visibility);
create index if not exists books_featured_idx    on public.books (featured);
create index if not exists books_title_trgm_idx  on public.books using gin (title gin_trgm_ops);
-- (enable pg_trgm for fuzzy search)
create extension if not exists pg_trgm;

-- Many-to-many: books <-> categories
create table if not exists public.book_categories (
  book_id       uuid not null references public.books (id) on delete cascade,
  category_slug text not null references public.categories (slug) on delete restrict,
  primary key (book_id, category_slug)
);

-- Contributors (author/translator/reviewer) per book
create table if not exists public.book_contributors (
  id        bigint generated always as identity primary key,
  book_id   uuid not null references public.books (id) on delete cascade,
  author_id text not null references public.authors (id) on delete restrict,
  role      contributor_role not null default 'author',
  position  integer not null default 0
);
create index if not exists book_contributors_book_idx on public.book_contributors (book_id);

-- Reading chapters (external reading URLs — kept as-is, never faked)
create table if not exists public.book_chapters (
  id       bigint generated always as identity primary key,
  book_id  uuid not null references public.books (id) on delete cascade,
  title    text not null,
  url      text not null,
  position integer not null default 0
);
create index if not exists book_chapters_book_idx on public.book_chapters (book_id);

-- Downloadable / linked files (external provider URL OR uploaded to storage)
-- A book may have several files simultaneously (e.g. PDF on FileInk + EPUB on OneDrive).
create table if not exists public.book_files (
  id            bigint generated always as identity primary key,
  book_id       uuid not null references public.books (id) on delete cascade,
  provider      storage_provider not null default 'external',
  file_type     book_file_type not null,     -- pdf / epub
  file_name     text,
  file_size     bigint,
  download_url  text,                         -- real download URL (never faked)
  read_url      text,                         -- optional online-reading URL
  external_file_id text,                      -- e.g. OneDrive item id
  storage_path  text,                         -- path in `book-files` bucket (provider='supabase')
  is_primary    boolean not null default false,
  status        link_status not null default 'unverified',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (download_url is not null or storage_path is not null)
);
create index if not exists book_files_book_idx on public.book_files (book_id);
-- exactly one primary file per book (optional hardening):
create unique index if not exists book_files_one_primary
  on public.book_files (book_id) where (is_primary);

-- Optional: cover assets history
create table if not exists public.book_covers (
  id           bigint generated always as identity primary key,
  book_id      uuid not null references public.books (id) on delete cascade,
  storage_path text not null,               -- path in `book-covers` bucket
  is_primary   boolean not null default true,
  created_at   timestamptz not null default now()
);

-- Optional: admin activity log
create table if not exists public.admin_activity (
  id         bigint generated always as identity primary key,
  user_id    uuid references auth.users (id) on delete set null,
  action     text not null,
  target     text,
  type       text not null default 'update',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_books_touch on public.books;
create trigger trg_books_touch before update on public.books
  for each row execute function public.touch_updated_at();
drop trigger if exists trg_categories_touch on public.categories;
create trigger trg_categories_touch before update on public.categories
  for each row execute function public.touch_updated_at();
drop trigger if exists trg_authors_touch on public.authors;
create trigger trg_authors_touch before update on public.authors
  for each row execute function public.touch_updated_at();
drop trigger if exists trg_book_files_touch on public.book_files;
create trigger trg_book_files_touch before update on public.book_files
  for each row execute function public.touch_updated_at();

-- ============================================================================
--  Row Level Security
-- ============================================================================
alter table public.categories        enable row level security;
alter table public.authors           enable row level security;
alter table public.books             enable row level security;
alter table public.book_categories   enable row level security;
alter table public.book_contributors enable row level security;
alter table public.book_chapters     enable row level security;
alter table public.book_files        enable row level security;
alter table public.book_covers       enable row level security;
alter table public.admin_activity    enable row level security;
alter table public.admins            enable row level security;

-- Public read: only published + public books and their related rows
drop policy if exists "public read published books" on public.books;
create policy "public read published books" on public.books
  for select using (status = 'published' and visibility = 'public');

drop policy if exists "public read categories" on public.categories;
create policy "public read categories" on public.categories
  for select using (active = true);

drop policy if exists "public read authors" on public.authors;
create policy "public read authors" on public.authors
  for select using (true);

-- child tables: readable when parent book is public
drop policy if exists "public read book_categories" on public.book_categories;
create policy "public read book_categories" on public.book_categories
  for select using (exists (select 1 from public.books b
    where b.id = book_id and b.status = 'published' and b.visibility = 'public'));

drop policy if exists "public read book_contributors" on public.book_contributors;
create policy "public read book_contributors" on public.book_contributors
  for select using (exists (select 1 from public.books b
    where b.id = book_id and b.status = 'published' and b.visibility = 'public'));

drop policy if exists "public read book_chapters" on public.book_chapters;
create policy "public read book_chapters" on public.book_chapters
  for select using (exists (select 1 from public.books b
    where b.id = book_id and b.status = 'published' and b.visibility = 'public'));

drop policy if exists "public read book_files" on public.book_files;
create policy "public read book_files" on public.book_files
  for select using (exists (select 1 from public.books b
    where b.id = book_id and b.status = 'published' and b.visibility = 'public'));

drop policy if exists "public read book_covers" on public.book_covers;
create policy "public read book_covers" on public.book_covers
  for select using (exists (select 1 from public.books b
    where b.id = book_id and b.status = 'published' and b.visibility = 'public'));

-- Admin full access on every content table
do $$
declare t text;
begin
  foreach t in array array[
    'categories','authors','books','book_categories','book_contributors',
    'book_chapters','book_files','book_covers','admin_activity'
  ] loop
    execute format('drop policy if exists "admin all" on public.%I;', t);
    execute format(
      'create policy "admin all" on public.%I for all using (public.is_admin()) with check (public.is_admin());',
      t
    );
  end loop;
end $$;

-- admins table: only admins can see/manage it
drop policy if exists "admins manage" on public.admins;
create policy "admins manage" on public.admins
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
--  Storage buckets (run once; or create via dashboard)
-- ============================================================================
insert into storage.buckets (id, name, public)
  values ('book-covers', 'book-covers', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
  values ('book-files', 'book-files', false)
  on conflict (id) do nothing;

-- Covers bucket: public read, admin write
drop policy if exists "covers public read" on storage.objects;
create policy "covers public read" on storage.objects
  for select using (bucket_id = 'book-covers');
drop policy if exists "covers admin write" on storage.objects;
create policy "covers admin write" on storage.objects
  for all using (bucket_id = 'book-covers' and public.is_admin())
  with check (bucket_id = 'book-covers' and public.is_admin());

-- Files bucket: admin only (serve downloads via signed URLs)
drop policy if exists "files admin all" on storage.objects;
create policy "files admin all" on storage.objects
  for all using (bucket_id = 'book-files' and public.is_admin())
  with check (bucket_id = 'book-files' and public.is_admin());

-- ============================================================================
--  Convenience view for the public catalog
-- ============================================================================
create or replace view public.public_books as
  select b.*,
         coalesce(array_agg(distinct bc.category_slug) filter (where bc.category_slug is not null), '{}') as categories
  from public.books b
  left join public.book_categories bc on bc.book_id = b.id
  where b.status = 'published' and b.visibility = 'public'
  group by b.id;
