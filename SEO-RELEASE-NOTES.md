# Bhavishya Gyani SEO release notes

## Included
- Unique, page-specific titles and meta descriptions for public pages.
- Canonical URLs on the preferred clean routes (`/kundli-form`, `/tarot`, etc.).
- Open Graph and Twitter preview metadata.
- Organization, WebSite and WebPage JSON-LD structured data; no fabricated reviews or ratings.
- Search-friendly contextual text and crawlable internal links on major feature pages.
- Updated sitemap containing only public, intended-to-index pages; private dashboards and account pages are excluded.
- `robots.txt` points to the sitemap and does not block crawlers from seeing `noindex` directives on private pages.
- Free Kundli form, result, PDF report, tools hub and About page are not blocked by a client-side login redirect. Kundli calculation API supports anonymous calculation and rate limits requests.
- Removed generic repeated `meta keywords` tags; Google Search does not use them for ranking. Target search phrases are instead reflected naturally in titles, descriptions and visible page content.

## Important limitations
- SEO changes improve crawlability and relevance; they cannot guarantee indexing, top ranking, or recommendations for misspelled/unrelated searches. Google selects results independently.
- Do not create hidden keyword blocks, competitor-brand stuffing, doorway pages, fake reviews or false structured data. These can harm ranking.
- Submit `https://bhavishya-gyani.vercel.app/sitemap.xml` in Google Search Console and use URL Inspection / Request indexing for the most important public pages. Recheck after deployment.
- Verify the live domain and all page routes after deployment. This archive has not been deployed to Vercel and cannot verify live crawler responses.
