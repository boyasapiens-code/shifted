-- SHIFTED — employer hiring-compliance self-attestation.
-- An employer works through the Thailand hiring document-trail checklist
-- (RD / SSO / DLPW / DOE) and self-attests which obligations they meet. The
-- ticked items + context flags drive a compliance score and a public,
-- clearly-labelled "self-attested" trust badge that workers can see.
-- Run after 0001–0017.

alter table employer_profiles
  add column if not exists compliance_items text[] not null default '{}',
  add column if not exists compliance_foreign_hires boolean not null default false,
  add column if not exists compliance_headcount_10plus boolean not null default false,
  add column if not exists compliance_attested_at timestamptz;

-- compliance_items holds the checklist keys the employer has marked done.
-- It lives on employer_profiles, which already has: public SELECT (workers
-- browse companies and see the badge) + owner-only UPDATE. No new policy needed.

comment on column employer_profiles.compliance_items is
  'Self-attested hiring-compliance checklist keys (see lib/compliance.ts COMPLIANCE_GROUPS).';
comment on column employer_profiles.compliance_attested_at is
  'When the employer last confirmed their compliance self-attestation.';
