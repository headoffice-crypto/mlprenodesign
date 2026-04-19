-- =====================================================
-- MLP Reno & Design — Quote & CRM schema (Phase 1 rebuild)
-- Safe to RE-RUN: drops and recreates in staging.
-- Project: MLP reno quotes and crm
-- =====================================================

-- Reset (staging only — no real data yet)
drop table if exists public.quote_events cascade;
drop table if exists public.quotes       cascade;
drop table if exists public.customers    cascade;

create extension if not exists "pgcrypto";

-- =====================================================
-- CUSTOMERS
-- =====================================================
create table public.customers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text,
  phone      text,
  address    text,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_email_idx on public.customers (lower(email));
create index customers_name_idx  on public.customers (lower(name));

-- =====================================================
-- QUOTES (multi-option)
-- =====================================================
create table public.quotes (
  id                     uuid primary key default gen_random_uuid(),
  customer_id            uuid references public.customers(id) on delete set null,

  quote_number           text unique not null,
  status                 text not null default 'draft',
    -- draft | sent | viewed | signed | declined | expired
  language               text not null default 'fr',

  -- Client snapshot at time of quote
  client_name            text,
  client_address         text,
  client_email           text,
  client_phone           text,
  quote_date             date,

  -- Project
  project_title          text,
  duration_weeks         int,

  -- AI chat transcript (for audit / continuation)
  ai_conversation        jsonb not null default '[]'::jsonb,

  -- Multi-option draft. Each option:
  --   { key, title, scope_summary, duration_weeks, materials_included,
  --     materials_budget, line_items[], subtotal, gst, qst, total }
  options                jsonb not null default '[]'::jsonb,
  accepted_option_key    text,

  -- Terms
  payment_option         text default 'A',   -- A | B | C (the payment schedule option)
  payment_methods        text,
  notes                  text,

  -- Signatures (base64 PNG data URLs)
  contractor_signature   text,
  contractor_signer_name text,
  contractor_signed_at   timestamptz,

  customer_signature     text,
  customer_signer_name   text,
  customer_signed_at     timestamptz,
  customer_signer_ip     text,

  -- Sharing
  share_token            text unique,
  sent_at                timestamptz,
  viewed_at              timestamptz,

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index quotes_customer_idx    on public.quotes (customer_id);
create index quotes_status_idx      on public.quotes (status);
create index quotes_share_token_idx on public.quotes (share_token);
create index quotes_created_idx     on public.quotes (created_at desc);

-- =====================================================
-- QUOTE EVENTS (audit log)
-- =====================================================
create table public.quote_events (
  id         uuid primary key default gen_random_uuid(),
  quote_id   uuid not null references public.quotes(id) on delete cascade,
  event_type text not null,
  payload    jsonb,
  created_at timestamptz not null default now()
);

create index quote_events_quote_idx on public.quote_events (quote_id, created_at desc);

-- =====================================================
-- updated_at trigger
-- =====================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger customers_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

create trigger quotes_updated_at
  before update on public.quotes
  for each row execute function public.set_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (Phase 1 staging — permissive)
-- Tighten before production: gate the builder behind auth.
-- =====================================================
alter table public.customers    enable row level security;
alter table public.quotes       enable row level security;
alter table public.quote_events enable row level security;

create policy "staging_customers_all" on public.customers
  for all to anon
  using (true) with check (true);

create policy "staging_quotes_all" on public.quotes
  for all to anon
  using (true) with check (true);

create policy "staging_quote_events_all" on public.quote_events
  for all to anon
  using (true) with check (true);
