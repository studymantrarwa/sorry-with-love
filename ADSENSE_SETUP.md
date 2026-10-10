# Google AdSense readiness and setup

This project includes a Privacy Policy, About, Contact, Terms, and Disclaimer page, plus visible ad-slot placeholders. These help with transparency and navigation but **do not guarantee AdSense approval**. Google reviews original content, site usability, policy compliance, and the publisher/account details.

## Before applying

1. Deploy to a public HTTPS domain that you control.
2. Replace `your-email@example.com` in `src/App.jsx` on the Contact page with a real, monitored contact email. Update the contact note in the Privacy Policy too.
3. Review every policy page and edit it so it truthfully describes your actual site, data handling, and services.
4. Publish genuinely useful original content around the tool (for example, thoughtful apology message examples and guidance on apologising respectfully). A card generator alone may not provide enough original content for a review.
5. Check all links, mobile layouts, and pages; ensure no page is under construction.
6. Apply through Google AdSense and follow the site ownership/verification instructions shown in your account.

## Add live ads after getting your own code

1. Use the exact AdSense script and publisher ID supplied in your account; add it as instructed by Google.
2. Replace the `.ad-slot` placeholders in `src/App.jsx` with your own approved ad-unit code. Keep ads clearly separate from buttons and story controls. Do not put ads on a dead-end/low-content screen or where users may mistake them for navigation.
3. If your account provides an `ads.txt` record, replace the comments in `public/ads.txt` with that exact record. Never guess a publisher ID.
4. Follow Google's current consent/privacy requirements for your audience and region. Do not click your own ads or ask visitors to click ads.

Official references:
- https://support.google.com/adsense/answer/7299563
- https://support.google.com/adsense/answer/48182
- https://policies.google.com/technologies/partner-sites
