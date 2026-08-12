-- ===========================================================================
-- 0031 — Real Stripe subscription billing for employer plan tiers
-- ---------------------------------------------------------------------------
-- Extends the Phase-1 payments model (0028_payments.sql) to cover recurring
-- subscriptions (Starter ฿990/mo, Growth ฿2,490/mo), not just one-time
-- boosts. Until now, `upgradeTo()` was a stub that flipped `plan` directly
-- with no charge — this closes that hole with the same security model
-- already proven for boosts:
--   * A paid plan can only be granted by the Stripe webhook (service_role),
--     never by the employer's own session — see employer_profiles_guard_plan().
--   * Downgrading yourself to 'free' stays self-service (no incentive to
--     abuse giving up your own paid features).
--
-- payment_kind gains 'plan_starter' / 'plan_growth' — the extension already
-- anticipated in 0028's comment. stripe_customer_id lets us reuse one Stripe
-- Customer across checkout attempts instead of creating duplicates, and lets
-- the webhook resolve `customer.subscription.*` events back to an employer.
-- ===========================================================================

alter type payment_kind add value if not exists 'plan_starter';
alter type payment_kind add value if not exists 'plan_growth';

alter table employer_profiles add column stripe_customer_id text;
alter table employer_profiles add column stripe_subscription_id text;
-- Stripe's own subscription status vocabulary (active, trialing, past_due,
-- canceled, unpaid, incomplete, incomplete_expired, paused) — stored as-is
-- rather than a Postgres enum so a new Stripe status doesn't need a migration.
alter table employer_profiles add column subscription_status text;

create unique index employer_profiles_stripe_customer_idx
  on employer_profiles (stripe_customer_id) where stripe_customer_id is not null;
create unique index employer_profiles_stripe_subscription_idx
  on employer_profiles (stripe_subscription_id) where stripe_subscription_id is not null;

-- ---------------------------------------------------------------------------
-- Paywall guard: only the Stripe webhook (service_role) may set `plan` to a
-- paid tier. Mirrors jobs_guard_boost() (0028) / profiles_guard_admin() (0030)
-- exactly — same pattern, same reasoning, third guard trigger in this app.
-- ---------------------------------------------------------------------------
create or replace function employer_profiles_guard_plan()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.plan is distinct from old.plan
     and new.plan in ('pro', 'growth')
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'plan can only be upgraded via a completed Stripe checkout';
  end if;
  return new;
end;
$$;

create trigger employer_profiles_guard_plan_trg
  before update on employer_profiles
  for each row execute function employer_profiles_guard_plan();
