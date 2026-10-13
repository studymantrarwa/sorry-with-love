# Sorry with Love — Technical SEO setup

## Current public routes
The current route set includes the homepage, blog listing, 9 blog articles, 2 focused card-creation pages, the Sorry My Girl experience, and 5 information pages. The prerender script generates static HTML for these public routes during `npm run build`.

## Included technical setup
- Public pages have index/follow directives; private account and admin routes are marked noindex by the app.
- The sitemap is generated from the current article and landing-page data.
- `robots.txt` allows public pages, disallows `/api/`, and points to the production sitemap.
- Runtime AI/resource catalogues are restricted to current public routes so deleted landing-page URLs are not advertised.
- No bulk keyword spreadsheet is included. Keep page copy natural and useful; do not repeat keyword variants or create near-duplicate pages.

## Deploy and verify
1. Upload the contents of this project folder to the existing GitHub repository, replacing the previous project files. A ZIP upload that adds a new nested folder without replacing old files can leave obsolete files in the repository.
2. Keep the Vercel build command as `npm run build` and output directory as `dist`.
3. Confirm the deployment build succeeds.
4. Test `/`, `/blog`, all `/blog/<slug>` pages, both card-creation pages, `/sorry-my-girl`, `/about`, `/contact`, `/privacy`, `/terms`, `/disclaimer`, `/robots.txt`, and `/sitemap.xml`.
5. In Google Search Console, inspect a specific URL and read the exact indexing status/reason. Submit `https://sorry-withlove.vercel.app/sitemap.xml` and request indexing only after confirming the URL returns HTTP 200 and has the expected canonical URL.

## Owner actions
- Add a real, monitored contact email.
- Confirm the Google Search Console HTML verification file belongs to the correct property.
- Confirm the publisher ID in `public/ads.txt` matches the current AdSense account.
- Confirm the third-party Sorry My Girl site allows iframe embedding.

## Important limitations
This project source does not show a site-wide `noindex` directive or a robots rule blocking public pages. That does not prove the deployed site is serving the same files or that Google will index each URL. Search Console's URL Inspection / Page indexing reason is needed to distinguish a technical block from a crawl/discovery delay or Google's quality/canonical decisions. Indexing and ranking are not guaranteed.
