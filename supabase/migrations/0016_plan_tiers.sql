-- SHIFTED — add the Growth subscription tier (per CLAUDE.md: Free / Starter
-- ฿990 / Growth ฿2,490). The existing 'pro' value is the Starter tier.
-- Run after 0001–0015.

alter type plan_tier add value if not exists 'growth';
