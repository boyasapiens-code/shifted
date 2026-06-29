-- ===========================================================================
-- 0028 — Payments (real charges for boosted listings)
-- ---------------------------------------------------------------------------
-- The Phase-1 revenue wedge (CLAUDE.md): boosting a job is now a real, paid
-- action via Stripe-hosted Checkout. This adds the ledger + the paywall.
--
-- Security model — the boost must only be granted after money actually moves:
--   * payments: employers can read + insert their OWN rows, but have NO update
--     policy. Status only advances to 'paid' from the webhook (service_role,
--     which bypasses RLS) — an employer can never mark their own payment paid.
--   * jobs_guard_boost(): a trigger that lets ONLY service_role change a job's
--     boosted_until. Without it, the jobs UPDATE policy would let an employer
--     set their own boost for free. With it, the Stripe webhook is the single
--     path to a live boost. Employers' normal job edits leave boosted_until
--     untouched, so they pass the guard unaffected.
-- ===========================================================================

create type payment_status as enum ('pending', 'paid', 'failed', 'canceled');
-- Extendable: add 'plan_starter' / 'plan_growth' when subscriptions go paid.
create type payment_kind as enum ('boost');

create table payments (
  id                      uuid primary key default gen_random_uuid(),
  employer_id             uuid not null references employer_profiles (id) on delete cascade,
  kind                    payment_kind not null,
  job_id                  uuid references jobs (id) on delete set null,
  amount_thb              int not null,
  currency                text not null default 'thb',
  status                  payment_status not null default 'pending',
  provider                text not null default 'stripe',
  provider_session_id     text,   -- Stripe Checkout Session id (cs_...)
  provider_payment_intent text,   -- Stripe PaymentIntent id (pi_...)
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  paid_at                 timestamptz
);

create index payments_employer_idx on payments (employer_id, created_at desc);
create unique index payments_session_idx
  on payments (provider_session_id) where provider_session_id is not null;

create trigger payments_set_updated_at
  before update on payments
  for each row execute function set_updated_at();

alter table payments enable row level security;

create policy "pay: employer read own"
  on payments for select using (auth.uid() = employer_id);
create policy "pay: employer insert own"
  on payments for insert to authenticated with check (auth.uid() = employer_id);
create policy "pay: admin all"
  on payments for all using (is_admin()) with check (is_admin());
-- Deliberately NO employer UPDATE policy — fulfilment is service_role only.

grant all on payments to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Paywall guard: only the payment webhook (service_role) may extend a boost.
-- ---------------------------------------------------------------------------
create or replace function jobs_guard_boost()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.boosted_until is distinct from old.boosted_until
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'boosted_until can only be changed by the payment webhook';
  end if;
  return new;
end;
$$;

create trigger jobs_guard_boost_trg
  before update on jobs
  for each row execute function jobs_guard_boost();
