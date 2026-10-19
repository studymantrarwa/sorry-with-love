# Bhavishya Gyani — deployment and scale readiness

## Included in this revision
- Enables Vercel Fluid Compute in `vercel.json` (actual capacity depends on plan, configuration, region, quotas, and billing).
- Updates sitemap to list public, useful pages and exclude account/admin/chat/call/wallet pages.
- Adds canonical URLs/descriptions to key legal/contact pages.
- Removes duplicate footer/cache script tags from Ram Prashnavali.
- Disables the misleading Premium selection until payment integration is actually active.
- Makes `npm test` run the available astrology/matching regression tests.
- Replaces the stale preflight checklist (which referenced absent `lib/api/*` paths) with checks against this archive.

## Important: 20,000 concurrent users
This ZIP is **not certified for 20,000 simultaneous users**. No source-only change can guarantee that. Capacity must be demonstrated with load tests against the actual Vercel plan, Supabase compute/pool limits, realtime usage, push provider, and payment configuration. Static CDN pages can scale differently from authenticated APIs, database reads/writes, realtime chat, and WebRTC calls.

Before announcing a 20k-user launch:
1. Use an appropriate Vercel plan and confirm current function concurrency, burst limits, spend limits, and observability.
2. Use Supabase connection pooling (Supavisor/PgBouncer as appropriate), inspect database compute and max connections, and ensure indexes exist for every hot query. Never open a direct database connection per user.
3. Run staged load tests at 100, 500, 1,000, 5,000 and then 20,000 virtual users against a staging deployment; test read-heavy browsing separately from chat polling, realtime, wallet writes, and login. Record p95/p99 latency, error rate, CPU, DB connections, pool wait time and cost.
4. Add rate limits and abuse protection at the API boundary; use idempotency keys/atomic SQL settlement for wallet and payment actions.
5. Configure and verify `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_AUTH_SECRET` (32+ random characters), Razorpay keys/webhook secret, Firebase service credentials, and TURN credentials in Vercel environment settings. Never put service-role or payment secrets in public JavaScript.
6. Submit `https://bhavishya-gyani.vercel.app/sitemap.xml` in Google Search Console and inspect important URLs. Sitemap inclusion is a discovery hint, not a guarantee of indexing.
7. Do not run `supabase/FINAL_SUPABASE_SETUP.sql` against any production project until its destructive statements have been reviewed and a restorable backup is confirmed.

## Validation commands
- `npm test` — local regression tests
- `npm run test:production` — static preflight only
- Deploy a staging copy and run browser, payment sandbox, Supabase, push, WebRTC, and load tests before production rollout.

## Environment and live-service caveat
The archive was inspected locally only. No production Vercel deploy, Supabase mutation, payment, FCM push, TURN test, or 20k-user load test was run as part of this build.

## Staged public-page load test
A k6 script is included at `scripts/load-test.js`. Run it only on staging with `BASE_URL` and `TARGET_VUS` set. It tests public read-only pages; it does **not** validate 20k simultaneous chat, WebRTC, login, database writes, wallet billing, or payment webhooks. For those, create separate test scenarios with test accounts and sandbox payment credentials, and coordinate test load with the hosting/database providers.

## SEO checks in this package

The automated test suite validates the canonical sitemap, public-page metadata, structured data syntax, and noindex rules. Search Console indexing and live rendered-page behavior must still be checked after deployment.
