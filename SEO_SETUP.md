# Sorry with Love — Technical SEO release

## Included
- The existing apology-card flow and `/sorry-my-girl` card are preserved.
- Blog and information routes are listed in the XML sitemap and linked internally.
- The build now prerenders indexable HTML for the homepage, blog listing, every article, and information pages. This gives crawlers meaningful content and route-specific title, description, canonical URL, Open Graph metadata, and structured data before the client app runs.
- Article routes include `BlogPosting` JSON-LD; the homepage and information pages use appropriate `WebSite` / `WebPage` JSON-LD.
- `robots.txt` allows public pages and points to the production sitemap.
- Canonical and sitemap origin is set to `https://sorry-withlove.vercel.app`.

## Deploy
1. Upload this project to the Vercel project for `sorry-withlove.vercel.app`.
2. Keep build command `npm run build` and output directory `dist`. The build command runs Vite and then `scripts/prerender-seo.mjs`.
3. After deployment, test `/`, `/blog`, each `/blog/<slug>`, `/about`, `/contact`, `/privacy`, `/terms`, `/disclaimer`, `/robots.txt`, `/sitemap.xml`, and the existing Google verification HTML.
4. In Google Search Console, inspect the homepage and sample article URLs, submit `https://sorry-withlove.vercel.app/sitemap.xml`, and request indexing for priority pages. Indexing is controlled by Google and is not guaranteed.
5. Use Search Console Performance data to see impressions, queries, clicks, CTR, and positions. Improve pages based on actual queries and user needs.

## Owner actions
- Add a real, monitored contact email to the Contact page and update the privacy wording to match the actual setup.
- Verify the Google Search Console HTML file belongs to the correct property.
- Add the exact `ads.txt` line provided by your own AdSense account if/when you receive it. Do not guess a publisher ID.
- Review all articles for factual accuracy, originality, usefulness, and your own practical perspective before publishing.
- Confirm that the third-party `/sorry-my-girl` site allows iframe embedding.

## Ranking expectations
No technical change can guarantee first position for every “sorry” keyword or instant indexing. Broad terms are highly competitive. Focus on a specific set of user intents, useful original content, clear internal links, a fast mobile experience, and earning genuine mentions/links. Avoid mass-producing near-identical keyword pages: Google's spam policies warn against scaled content and doorway pages created mainly to manipulate rankings.

## Build verification
The source release includes the prerender script, but this environment could not complete a dependency install, so a production build has not been verified here. Confirm that `npm run build` succeeds in Vercel after upload.

## Keyword coverage release
- Added 16 original, topic-specific landing pages for boyfriend/girlfriend sorry websites, partner messages, messages for him/her, heart-touching and short messages, romantic apologies, post-fight apologies, hurtful actions, ignoring a partner, broken trust, Hindi/Hinglish apology guidance, online sorry cards, misunderstandings, and message templates.
- The `/blog` page now links to these guides, and the prerender step includes their text, canonical metadata, structured data, and internal links in the static HTML.
- `seo/500-keyword-map.csv` contains 500 unique keyword candidates mapped to relevant existing or new URLs. Search volumes are deliberately marked unverified: validate them using Search Console, Google Keyword Planner, or another reputable keyword tool before prioritising them.
- Do not create one page for every keyword. Closely related phrases should be served by one genuinely useful page; expand only when search data and distinct user intent justify a new page.
- Existing card flow and the homepage section order are intended to remain unchanged; the additional topics are linked through the existing blog/guides area.
