# SHIFTED — Launch checklist

The app is built and deployed. These are the remaining **dashboard-only** steps
(they can't be done in code) to make it production-ready for real users.

## 1. Supabase — Auth URL configuration ⚠️ (fixes login redirects)
Authentication → **URL Configuration**:
- **Site URL:** `https://shiftedth.com`
- **Redirect URLs:** add
  - `https://shiftedth.com/auth/callback`
  - `https://www.shiftedth.com/auth/callback`
  - `https://www.shiftedth.com/auth/confirm`
  - `http://localhost:3000/auth/callback` (dev)

> Without this, magic links redirect to `localhost`. This is the root cause of
> the earlier login failures.

## 2. Supabase — Custom SMTP (lifts the email rate limit)
Project Settings → Authentication → **SMTP Settings** (sending from the
Greenstead Private Email mailbox):
- Sender email: `nisarat@greenstead-th.com` · Sender name: `SHIFTED`
- Host: `mail.privateemail.com` · Port: `465` (or `587`)
- Username: `nisarat@greenstead-th.com` · Password: *(mailbox password)*

Then paste [`docs/email/magic-link.html`](email/magic-link.html) into
Authentication → Emails → **Magic Link** template.

## 3. Google login (optional)
- Google Cloud Console → Credentials → OAuth client (Web):
  - JS origins: `https://shiftedth.com`, `https://www.shiftedth.com`
  - Redirect URI: `https://zradcsybgyqkmhescava.supabase.co/auth/v1/callback`
- Supabase → Authentication → Providers → **Google** → enable → paste Client
  ID + Secret.

## 4. Verification reviewer
The `boyasapiens@gmail.com` account is an admin (`profiles.is_admin = true`) and
can review verification at `/admin/verifications`. Grant additional reviewers by
setting `is_admin = true` on their profile.

## Already done (in code)
- ✅ Favicon / app icon (S-monogram) and Open Graph share image
- ✅ PDPA-aware Privacy & Terms at `/legal` + consent checkbox at signup
- ✅ `/auth/confirm` route for token-based sign-in links
- ✅ Deployed to `shiftedth.com` with auto-deploy on push to `main`

## Before real users (recommended follow-ups)
- Have a Thai lawyer review `/legal` (we collect national IDs — PDPA applies).
- Replace seed/demo data with real accounts; the seed data stays gitignored.
- Decide real billing (Stripe) to replace the monetization preview.
