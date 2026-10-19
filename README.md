# Bhavishya Gyani — Production Web App

Bhavishya Gyani is a Vedic astrology web application with User, Astrologer and Admin panels, built for Vercel + Supabase with Vercel Blob for astrologer profile images.

## Project structure

```text
bhavishya-gyani-main/
├── public/                 # All website pages, browser JS/CSS, assets, sounds and PWA files
├── api/                    # Vercel serverless API entrypoints
├── lib/                    # Server-side application modules and API logic
├── scripts/                # Local/test/production validation scripts
├── supabase/               # One consolidated database setup SQL
│   └── FINAL_SUPABASE_SETUP.sql
├── package.json
├── vercel.json
└── README.md
```

## Deployment

1. Upload/push the complete project to GitHub.
2. Import the repository into Vercel.
3. Keep the required existing environment variables configured in Vercel.
4. Confirm the existing Supabase project and all environment variables before deployment. Do **not** run `supabase/FINAL_SUPABASE_SETUP.sql` against a database containing data you need to preserve; review it and take a backup first. Apply only the required, reviewed migrations.
5. Deploy from Vercel and verify the deployment on a staging URL with test accounts before switching production traffic.
6. Keep a private backup of the Supabase database before every schema/data migration.
7. Never commit Supabase service-role keys, APP_AUTH_SECRET, Razorpay secrets, Firebase private keys, TURN credentials, or the Vercel Blob write token to GitHub.

The consolidated SQL is intended for a fresh/reset Bhavishya Gyani database. Do not run it on a database containing data that must be preserved unless the reset behavior has been reviewed first.

## Storage

Astrologer profile photos use **Vercel Blob**. The resulting Blob URL is stored with the astrologer profile in Supabase. The application does not depend on Supabase Storage for astrologer profile photos.

Pooja image upload continues to use Vercel Blob where that feature is enabled and requires the configured `BLOB_READ_WRITE_TOKEN`.

## Main application areas

- User registration/login and persistent role-aware session
- Kundli, Kundli Milan, Panchang/Muhurat, numerology and other astrology tools
- Astrologer discovery, profiles, ratings, followers and availability
- Chat requests, acceptance/confirmation, permanent chat history and selected-Kundli sharing
- Separate audio-call flow and permanent call history
- Wallet, recharge, free minutes, billing, commission and payouts
- Astrologer dashboard with chat/call controls, boost and admin-controlled pricing/discounts
- Admin dashboard, astrologer approval, pricing, payments, reports, reviews, training and notifications
- Hindi/English language support
- Browser push notification support where configured

## Performance and navigation

The browser uses an account-safe IndexedDB chat cache for faster conversation rendering and an application service worker for static asset caching on slow connections. Pages are not intentionally force-reloaded during normal Back/Forward navigation; browser Back/Forward cache remains the primary mechanism for preserving page state.

API/auth responses are never cached. HTML navigation uses a short network-first timeout and falls back to a previously cached page when the connection is slow/offline. Static JS/CSS/images/audio assets use stale-while-revalidate caching. Navigation prefetch is connection-aware and is skipped on Save-Data/2G connections to avoid wasting mobile data.

Security headers are applied at Vercel/API level, including no-sniff, frame protection, referrer policy and a restrictive Permissions-Policy. API responses explicitly use no-store caching.

## SEO and Search Console

- Public feature pages have page-specific titles/descriptions, canonical clean URLs, social preview metadata and Organization/WebSite/WebPage structured data.
- `public/sitemap.xml` lists 29 public, intended-to-index URLs; account, login, dashboard and result-only pages are excluded or marked `noindex`.
- Major tools include contextual explanatory copy and crawlable links to related tools. The generic `meta keywords` tag was removed because Google does not use it for ranking.
- After deployment, submit `https://bhavishya-gyani.vercel.app/sitemap.xml` in Google Search Console and inspect priority URLs. Indexing and rankings are decided by search engines and cannot be guaranteed.
- See `SEO-KEYWORD-MAP.md` and `SEO-RELEASE-NOTES.md` for page-level search intent and deployment steps.

## Validation

Run:

```bash
npm test
npm run test:production
```

The production checks are static/pre-deployment checks. Live Supabase, Vercel Blob, Razorpay, FCM/push and WebRTC/TURN behavior must still be verified with the actual production environment variables and real test accounts.

## Version

37.3.0 — security-hardened package with SEO metadata, crawlable public feature pages, canonical sitemap, structured data, security preflight and SEO preflight.
