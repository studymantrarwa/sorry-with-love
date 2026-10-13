# AdSense setup checklist

This project contains visible ad placeholders only; no ad-serving code has been added. The `public/ads.txt` file contains the publisher record supplied by the site owner. Confirm that it exactly matches the current AdSense account before deployment.

Before applying:
1. Deploy the website on a public HTTPS domain you control.
2. Add a real, monitored contact email to `/contact` and update the privacy contact wording.
3. Review `/privacy`, `/about`, `/terms`, and `/disclaimer` so they accurately describe your site.
4. Inspect the five original guide drafts under `/blog/`, edit them to reflect your expertise, and continue publishing useful content.
5. Confirm all routes work on mobile and desktop and that the target card iframe either loads or shows its fallback link.
6. Verify the website in Google Search Console and submit `/sitemap.xml`.
7. The current `public/ads.txt` contains `google.com, pub-8208123925033787, DIRECT, f08c47fec0942fa0`. Confirm that this publisher ID belongs to the AdSense account for this site before deployment; never use an ID you do not control.
8. Keep advertisements clearly separate from card controls, story buttons, and navigation. Do not add ads to pages where they could be mistaken for controls or where there is little or no content.

Official guidance:
- https://support.google.com/adsense/answer/9724
- https://support.google.com/adsense/answer/7299563
- https://support.google.com/adsense/answer/48182
- https://policies.google.com/technologies/partner-sites

AdSense approval is determined by Google and cannot be guaranteed by a code change.
