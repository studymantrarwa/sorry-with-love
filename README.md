# Sorry with Love 💗

A mobile-friendly romantic apology-story builder made with React + Vite. Choose one of four cards, add sender and receiver names, step through a gentle story, then share the experience using the device share sheet or a copied message. Includes a custom logo/favicon and About, Contact, Privacy Policy, Terms, and Disclaimer pages.

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

## GitHub + Vercel

1. Create a GitHub repository such as `sorry-with-love`.
2. Upload the **contents** of this folder to the repository root (not the enclosing folder). `package.json`, `src/`, `index.html`, and `vercel.json` should be at the root.
3. Commit to `main`, then import the repository at https://vercel.com/new.
4. Build command: `npm run build`; output directory: `dist`. `vercel.json` includes SPA rewrites for the information pages.

## AdSense

Read `ADSENSE_SETUP.md`. Replace the contact email placeholder and policy text as needed, publish original helpful content, and add only the exact AdSense code/ads.txt record from your own account. No ZIP can guarantee approval.

Names are personalised in the browser and are not sent to a backend by this demo. Sharing uses the browser's native share sheet where available; fallback copies a share message and current page URL. For a recipient to see the same names and card on another device, a server-side or encoded share-link feature would need to be added.
