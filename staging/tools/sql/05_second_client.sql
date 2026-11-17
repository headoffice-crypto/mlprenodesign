-- =====================================================
-- MLP Reno & Design — Co-client (second name on bill)
-- Adds a co-client ("second person") name so couples or
-- joint owners appear on the "Billed to" block of every
-- quote, invoice, and payment receipt.
--
--   quotes.client_name_2      — snapshot on each quote
--   customers.name_2          — customer-level default,
--                               propagated to all their quotes
-- Safe to re-run.
-- =====================================================

alter table public.quotes
  add column if not exists client_name_2 text;

alter table public.customers
  add column if not exists name_2 text;
