-- =====================================================
-- MLP Reno & Design — SMS quote-builder sessions
-- Tracks state of multi-message conversations the contractor has with the
-- inbound-sms edge function. Each session walks a small state machine:
--   collecting -> asking_schedule -> asking_promo -> ready (terminal)
-- or terminates via cancelled / failed.
-- Safe to re-run.
-- =====================================================

create table if not exists public.sms_sessions (
  id              uuid primary key default gen_random_uuid(),
  phone           text not null,            -- E.164 sender, e.g. +15145736443
  state           text not null,            -- collecting | asking_schedule | asking_promo | ready | failed | cancelled
  quote_id        uuid references public.quotes(id) on delete set null,
  language        text not null default 'fr',

  -- What Claude has extracted so far (merged across turns). Shape:
  --   { client_name, client_email, client_phone, client_address,
  --     project_title, scope_summary, base_price,
  --     duration_value, duration_unit, materials_included }
  extracted       jsonb not null default '{}'::jsonb,

  -- Filled as the user answers follow-up questions.
  payment_option  text,                     -- A | B | C (set in asking_schedule)
  promotions      jsonb not null default '[]'::jsonb,

  -- Audit / debugging.
  message_count   int  not null default 0,
  last_message_in text,
  last_message_out text,
  error           text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- The function looks up "active session for this phone" — the latest non-terminal row.
create index if not exists sms_sessions_phone_active_idx
  on public.sms_sessions (phone, updated_at desc)
  where state not in ('ready','failed','cancelled');

create index if not exists sms_sessions_phone_idx on public.sms_sessions (phone, created_at desc);

drop trigger if exists sms_sessions_updated_at on public.sms_sessions;
create trigger sms_sessions_updated_at
  before update on public.sms_sessions
  for each row execute function public.set_updated_at();

alter table public.sms_sessions enable row level security;

drop policy if exists "staging_sms_sessions_all" on public.sms_sessions;
create policy "staging_sms_sessions_all" on public.sms_sessions
  for all to anon
  using (true) with check (true);
