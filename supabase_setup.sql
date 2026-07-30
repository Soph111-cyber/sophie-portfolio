create extension if not exists pgcrypto;

create table if not exists public.portfolio_entries (
  id uuid primary key default gen_random_uuid(),
  description text not null default '',
  media_urls jsonb not null default '[]'::jsonb,
  media_types jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.portfolio_entries enable row level security;

create policy "Public can read portfolio entries"
on public.portfolio_entries for select
using (true);

-- This simple portfolio uses the anon key for writes after app-level password login.
-- Keep the Supabase project dedicated to this site and do not store sensitive data.
create policy "App can insert portfolio entries"
on public.portfolio_entries for insert
with check (true);

create policy "App can delete portfolio entries"
on public.portfolio_entries for delete
using (true);

insert into storage.buckets (id, name, public)
values ('portfolio-media', 'portfolio-media', true)
on conflict (id) do update set public = true;

create policy "Public can view portfolio media"
on storage.objects for select
using (bucket_id = 'portfolio-media');

create policy "App can upload portfolio media"
on storage.objects for insert
with check (bucket_id = 'portfolio-media');
