create table if not exists public.skillgap_enquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text,
  goal text,
  source text default 'website',
  created_at timestamptz not null default now()
);

create table if not exists public.skillgap_demo_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  source text default 'website',
  created_at timestamptz not null default now()
);

alter table public.skillgap_enquiries enable row level security;
alter table public.skillgap_demo_users enable row level security;

drop policy if exists "Allow public enquiry insert" on public.skillgap_enquiries;
create policy "Allow public enquiry insert"
on public.skillgap_enquiries
for insert
to anon
with check (true);

drop policy if exists "Allow public demo user insert" on public.skillgap_demo_users;
create policy "Allow public demo user insert"
on public.skillgap_demo_users
for insert
to anon
with check (true);

-- Reading all records should stay private.
-- Use the Supabase dashboard Table Editor to view enquiries safely.
