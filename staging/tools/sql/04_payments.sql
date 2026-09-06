-- =====================================================
-- MLP Reno & Design — Payments ledger
-- Adds: payments (money actually received from customers)
-- Safe to re-run.
-- =====================================================
--
-- A payment row = money actually received. Independent of invoices:
-- a payment may be linked to a specific invoice (installment payment)
-- or stand alone as an advance credited against the project balance.
-- Contract balance = sum(invoices.amount_total) − sum(payments.amount).
--
-- Receipts share the same `bill.html` chrome but render a payment
-- receipt when loaded with ?receipt=<share_token>.

create table if not exists public.payments (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references public.projects(id) on delete cascade,
  invoice_id         uuid references public.invoices(id) on delete set null,
  customer_id        uuid references public.customers(id),

  receipt_number     text unique not null,
  share_token        text unique not null,

  amount             numeric(12,2) not null check (amount > 0),
  method             text not null default 'other',
    -- interac | cheque | card | cash | other
  paid_at            date not null default current_date,
  note               text,

  receipt_sent_at    timestamptz,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists payments_project_idx     on public.payments (project_id, paid_at desc);
create index if not exists payments_invoice_idx     on public.payments (invoice_id);
create index if not exists payments_share_token_idx on public.payments (share_token);

-- updated_at
drop trigger if exists payments_updated_at on public.payments;
create trigger payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- RLS (staging = permissive, same as Phase 1)
alter table public.payments enable row level security;

drop policy if exists "staging_payments_all" on public.payments;
create policy "staging_payments_all" on public.payments
  for all to anon using (true) with check (true);
