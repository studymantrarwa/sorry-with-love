# Bhavishya Gyani — Security Hardening Notes

## Changes in this release
- Added site-wide HSTS, Content Security Policy, MIME-sniffing protection, framing protection, referrer policy, Permissions Policy, and cross-domain policy headers. The CSP retains inline scripts/eval and HTTPS third-party resources for legacy integrations; this is a compatibility compromise, not a strict nonce-based CSP.
- Removed the raw `EPHEMERIS_URL` value from the public health response; only a configured/not-configured boolean is returned.
- Added a server-side rate limit to admin registration (3 attempts/IP/hour), constant-time registration-code comparison, a 12-character minimum for newly created admin passwords, and generic infrastructure errors.
- Added rate limits to expensive/public calculation endpoints (Kundli, advanced astrology, matching, muhurat, numerology, panchang, horoscope, place lookup). These use the existing Supabase `consume_api_rate_limit` RPC and fail closed with HTTP 503 if the limiter is unavailable. Ensure the rate-limit table and RPC from the approved Supabase schema are deployed before using these endpoints.
- Registered the missing `/api/language` route and registered existing `astrologer-apply` and `finance` handlers.
- Added `npm run`-compatible static security preflight into the normal `npm test` sequence.

## Required deployment configuration
- Set `APP_AUTH_SECRET` to a long random secret (at least 32 random bytes recommended).
- Set a long, random `ADMIN_REGISTRATION_CODE` in Vercel Environment Variables; do not place it in frontend code or send it to anyone. Use a new unique code before public deployment.
- Keep `SUPABASE_SERVICE_ROLE_KEY`, Razorpay secret/webhook secret, and any TURN credentials only in server-side environment variables. Never put them in `public/` files.
- Apply the approved, non-destructive database migration for the API rate limiter if `consume_api_rate_limit` and its backing table are not already installed. Do not run a destructive full setup SQL against production without a backup and explicit review.

## Test limits
The automated checks are static checks and regression tests. They do **not** prove live Supabase Row Level Security, authorization for every role, payment webhook authenticity, CSRF behavior, account enumeration resistance, Firebase push security, WebRTC/TURN connectivity, or capacity for 20,000 simultaneous users. Verify these on a staging deployment with test accounts and test payment credentials, then perform an authorized load/penetration test before making capacity or security guarantees.
