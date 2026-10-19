# Sorry with Love 💗

Mobile-friendly React + Vite apology-card website. The home card flow and four existing styles remain in place. Includes SEO landing pages and blog guides, shareable cards, email/password registration/login, Supabase page/card/message analytics, and an admin-only analytics dashboard.

## Quick start

1. Install Node.js LTS.
2. Copy `.env.example` to `.env.local` and fill in the Supabase project URL and publishable/anon key (optional for local UI; required for authentication/analytics).
3. Follow [`docs/SUPABASE_SETUP_HI.md`](docs/SUPABASE_SETUP_HI.md) and run [`supabase/schema.sql`](supabase/schema.sql) in Supabase SQL Editor.
4. Run `npm install`, then `npm run dev`.
5. Test production output using `npm run build` and `npm run preview`.

## Folder map

- `src/` — React app, UI components, story assets and SEO page data.
- `public/` — public files served directly by Vite, including social-share image.
- `api/` — Vercel sitemap and robots endpoints.
- `scripts/` — static SEO prerendering during build.
- `docs/seo/` — SEO editorial policy; no bulk keyword spreadsheet.
- `supabase/` — database schema, RLS policies and admin analytics function.
- `docs/` — Supabase, SEO and AdSense setup guides; `docs/seo/` contains the SEO editorial policy.

## Admin dashboard

After Supabase setup, register an account and assign its profile `role = 'admin'` using the steps in the Hindi setup guide. Then open `/admin/analytics`. Do not expose a Supabase service-role key in frontend files.

## Deploy to Vercel

Import the contents of this project folder into a Git repository and import it in Vercel. Build command: `npm run build`; output directory: `dist`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in Vercel Environment Variables, then redeploy.

## Important

The analytics database must be configured in your own Supabase account; this ZIP cannot create a project or insert your private credentials automatically. Search ranking, indexing and AdSense approval are not guaranteed. Replace placeholder contact information before publishing.


## User Panel
- `/account` is the signed-in user's private dashboard: saved cards, share-link views, page-wise views, and recipient Yes/Not yet response counts.
- Run the complete `supabase/schema.sql` in Supabase SQL Editor before deploying these features.
- Signed-in users can save cards from the story's final screen. Share links are associated with the user who is signed in when sharing.
- The response tracking applies to the in-site story buttons. The embedded third-party Sorry, My Girl iframe cannot report its internal button click unless that separate project is also updated.
