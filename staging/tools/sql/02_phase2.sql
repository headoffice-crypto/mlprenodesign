-- =====================================================
-- MLP Reno & Design — Phase 2 CRM schema
-- Adds: projects, invoices, project_photos, customer notes
-- Safe to re-run.
-- =====================================================

-- Extend customers with a notes field (if not present)
alter table public.customers add column if not exists notes text;

-- =====================================================
-- PROJECTS (1:1 with signed quotes)
-- =====================================================
create table if not exists public.projects (
  id             uuid primary key default gen_random_uuid(),
  quote_id       uuid not null unique references public.quotes(id) on delete cascade,
  customer_id    uuid references public.customers(id) on delete set null,

  status         text not null default 'planning',
    -- planning | active | on_hold | completed | cancelled
  start_date     date,
  end_date       date,

  action_items   jsonb not null default '[]'::jsonb,
    -- [{ id, text, done, done_at }]

  notes          text,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists projects_customer_idx on public.projects (customer_id);
create index if not exists projects_quote_idx    on public.projects (quote_id);
create index if not exists projects_status_idx   on public.projects (status);

-- =====================================================
-- INVOICES (N per project, driven by payment schedule)
-- =====================================================
create table if not exists public.invoices (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references public.projects(id) on delete cascade,
  quote_id           uuid references public.quotes(id),
  customer_id        uuid references public.customers(id),

  invoice_number     text unique not null,
  sequence           int not null,

  label              text,                -- 'Dépôt', 'Avant début', 'Mi-parcours', 'Fin'
  pct_of_total       numeric(6,3),        -- 10.000, 40.000 etc.

  amount_before_tax  numeric(12,2) not null default 0,
  gst                numeric(12,2) not null default 0,
  qst                numeric(12,2) not null default 0,
  amount_total       numeric(12,2) not null default 0,

  status             text not null default 'pending',
    -- pending | sent | paid | overdue | cancelled

  due_date           date,
  sent_at            timestamptz,
  paid_at            timestamptz,
  paid_amount        numeric(12,2),
  payment_method     text,                -- cheque | interac | card | cash | other

  share_token        text unique,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists invoices_project_idx on public.invoices (project_id);
create index if not exists invoices_status_idx  on public.invoices (status);
create index if not exists invoices_share_token_idx on public.invoices (share_token);

-- =====================================================
-- PROJECT PHOTOS (stored in Supabase Storage, metadata here)
-- =====================================================
create table if not exists public.project_photos (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  storage_path text not null,              -- path inside 'project-photos' bucket
  category     text not null default 'during', -- before | during | after
  caption      text,
  uploaded_at  timestamptz not null default now()
);

create index if not exists project_photos_project_idx on public.project_photos (project_id, category, uploaded_at);

-- =====================================================
-- AUTO-CREATE PROJECT WHEN QUOTE TRANSITIONS TO SIGNED
-- =====================================================
create or replace function public.auto_create_project_on_sign()
returns trigger language plpgsql as $$
begin
  if new.status = 'signed' and (old.status is distinct from 'signed') then
    insert into public.projects (quote_id, customer_id)
    values (new.id, new.customer_id)
    on conflict (quote_id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists quotes_auto_create_project on public.quotes;
create trigger quotes_auto_create_project
  after update on public.quotes
  for each row execute function public.auto_create_project_on_sign();

-- updated_at triggers
drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

drop trigger if exists invoices_updated_at on public.invoices;
create trigger invoices_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

-- =====================================================
-- RLS (staging = permissive, same as Phase 1)
-- =====================================================
alter table public.projects       enable row level security;
alter table public.invoices       enable row level security;
alter table public.project_photos enable row level security;

drop policy if exists "staging_projects_all" on public.projects;
create policy "staging_projects_all" on public.projects
  for all to anon using (true) with check (true);

drop policy if exists "staging_invoices_all" on public.invoices;
create policy "staging_invoices_all" on public.invoices
  for all to anon using (true) with check (true);

drop policy if exists "staging_project_photos_all" on public.project_photos;
create policy "staging_project_photos_all" on public.project_photos
  for all to anon using (true) with check (true);

-- =====================================================
-- BACKFILL: create projects for quotes that were signed before the trigger existed
-- =====================================================
insert into public.projects (quote_id, customer_id)
select id, customer_id from public.quotes
where status = 'signed'
on conflict (quote_id) do nothing;
