# Sorry with Love — Google Analytics 4 setup (Hindi)

## 1. GA4 property aur web stream banayein
1. https://analytics.google.com/ par apne Google account se sign in karein.
2. Admin > Create property par jaakar property name `Sorry with Love` rakhein. Reporting time zone `India` aur currency apni zarurat ke mutabik select karein.
3. Property ke andar Data streams > Add stream > Web select karein.
4. Apni live website ka exact domain enter karein (jaise `https://sorry-withlove.vercel.app`) aur stream banayein.
5. Web stream ke details se Measurement ID copy karein. ID `G-` se shuru hoti hai.

## 2. Vercel par Measurement ID set karein
1. Vercel Dashboard > Sorry with Love project > Settings > Environment Variables kholein.
2. Name: `VITE_GA_MEASUREMENT_ID`
3. Value: aapki GA4 Measurement ID, jaise `G-XXXXXXXXXX` (example ko apni asli ID se badlein).
4. Production environment select karein; agar Preview deployments par bhi test karna hai to Preview mein bhi set karein.
5. Save karein aur Deployments se latest deployment ko redeploy karein. Vite `VITE_` variables ko build ke waqt embed karta hai.

## 3. Local development
Project root mein `.env.local` banayein:

```env
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

Is file ko public repository mein commit na karein. Measurement ID secret nahi hoti, phir bhi project settings mein hi manage karein.

## 4. Consent aur privacy
- GA tag default roop se load nahi hota. Visitor ke `Allow analytics` chunne ke baad hi load hota hai.
- `Reject optional analytics` chunne par GA load nahi hota.
- Footer ke `Privacy choices` button se visitor apni choice badal sakta hai.
- `/privacy` aur `/cookies` pages par GA4 ka disclosure diya gaya hai.
- GA ko sender/recipient names, email, ya apology message text na bhejein. Is project ka page-view tracker query string nahi bhejta, kyunki shared-card URLs mein naam ho sakte hain.
- Agar future mein AdSense, ads personalization, consent requirements, ya koi naya tracker add ho, to privacy/consent implementation dobara review karein. Ye code legal advice ya har region ke liye full CMP compliance ki guarantee nahi hai.

## 5. Installation verify karein
1. Deployment complete hone ke baad website ko incognito/private window mein kholein.
2. Pehle analytics consent ko reject karein; Google Analytics tag request load nahi honi chahiye.
3. Privacy choices kholkar `Allow analytics` select karein, phir page reload ya doosra page kholein.
4. GA4 > Reports > Realtime mein apni visit dekhein. Data aane mein 30 minute tak lag sakte hain.
5. GA4 mein DebugView/Realtime aur browser DevTools > Network mein `gtag/js?id=G-...` request verify karein.
6. Agar data nahi aata: ID mein typo, Vercel env var missing, deployment purana, consent rejected, ad blocker, ya browser privacy settings check karein.

## 6. Kaunse reports dekhein?
- Reports > Realtime: abhi site par maujood visitors aur recent events.
- Reports > Acquisition > Traffic acquisition: traffic source/medium.
- Reports > Engagement > Pages and screens: kaunse pages dekhe ja rahe hain.
- Events: page_view jaise events.

GA4 mein data turant historical reports mein poori tarah nahi dikhta; processing mein samay lag sakta hai.

## 7. Zaroori caveats
- Google Analytics, Google Search Console ka replacement nahi hai. Search impressions, clicks aur indexing ke liye Search Console alag connect karein.
- `VITE_GA_MEASUREMENT_ID` configure na ho to code GA ko load nahi karega.
- Google Analytics se Google ranking badhne ki guarantee nahi hoti.
