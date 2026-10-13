# Sorry with Love — Supabase setup (Hindi)

Is project mein Supabase Auth (email/password login + registration), page analytics, card views, share-link-specific message views aur private admin dashboard ka code hai. **Database tabhi connect hoga jab aap apne Supabase project ki URL/key set karke SQL chalayein.** ZIP mein aapke account ki secret credentials nahi ho sakti.

## 1. Supabase project banayein

1. https://supabase.com/dashboard par login karein aur `New project` banayein.
2. Project ready hone ke baad **Project Settings / Connect** se Project URL aur **Publishable key** (ya legacy `anon` key) copy karein.
3. `sorry-with-love/.env.example` ko copy karke `.env.local` banayein. Ismein ye values bharein:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

**Service role / secret key kabhi `.env.local` mein bhi na daalein.** Frontend mein sirf publishable/anon key use hoti hai; RLS policies database ko protect karti hain.

## 2. Database SQL chalayein

1. Supabase Dashboard → **SQL Editor** → New query kholein.
2. `supabase/schema.sql` ki poori file copy-paste karke Run karein.
3. Agar koi SQL error aaye to dashboard ka exact error dekhein; success ke baad Table Editor mein `profiles` aur `site_events` tables dikhni chahiye.

SQL tables mein page path, event type, card style, random share ID aur timestamp record hote hain. Sender/receiver ke naam aur message text analytics table mein save nahi hote. Share URL mein naam ho sakte hain, isliye link trusted person ko hi bhejein.

## 3. Vercel environment variables

1. Vercel → apna `sorry-with-love` project → **Settings → Environment Variables**.
2. `VITE_SUPABASE_URL` aur `VITE_SUPABASE_PUBLISHABLE_KEY` add karein (Production + Preview, jahan zaroorat ho).
3. **Redeploy** karein. Sirf local `.env.local` se live Vercel site connect nahi hoti.

## 4. Auth URL settings

Supabase → Authentication → URL Configuration mein:

- Site URL: `https://sorry-withlove.vercel.app`
- Redirect URLs mein add karein: `https://sorry-withlove.vercel.app/**`
- Agar custom domain use karein to us domain ko bhi add karein.

Agar Email confirmation enabled hai, registration ke baad inbox verify karna hoga. Supabase email templates / SMTP settings bhi check karein.

## 5. Apne account ko admin banayein

1. Live website par `Login / Register` se apna account register karein.
2. Supabase → Authentication → Users mein apna account kholein aur **User UID** copy karein.
3. SQL Editor mein ye query chalayein, `YOUR_AUTH_USER_UUID` ko apne exact UID se replace karein:

```sql
update public.profiles
set role = 'admin'
where id = 'YOUR_AUTH_USER_UUID';
```

4. Sign out karke phir login karein, phir `https://sorry-withlove.vercel.app/admin/analytics` kholein.
5. Jis Bhubaneswar wale vyakti ko dashboard dekhna hai, uske account ko bhi register karayein aur sirf uske UID ko admin banayein. Admin permission dene ka matlab hai use analytics dekhne ka adhikar milna.

Admin route login aur database role dono verify karta hai. Normal user ko dashboard data nahi milega. Admin role browser se set nahi kiya ja sakta; SQL Editor se owner ko dena hota hai.

## 6. Dashboard kya dikhata hai?

- Total page views, page-wise views, card views aur share-button clicks.
- Shared apology link ke random ID ke hisaab se message views aur last viewed time.
- Recent 100 tracked events.

Shared message ki ginti usi `shareId` wale link ko kholne par badhegi. Har alag share link ka apna ID hota hai. Counts setup/deploy ke baad hi start honge; purane visits retroactively nahi milenge. Bots, repeated refreshes aur ad blockers ki wajah se counts exact human analytics ke barabar zaroori nahi.

## 7. Local run / deploy

```bash
npm install
npm run dev
npm run build
npm run preview
```

Vercel par Git repository ka **project folder ke andar ka content** upload karein: `package.json`, `index.html`, `src/`, `public/`, `api/`, `scripts/`, `supabase/` etc. `node_modules/`, `dist/`, aur `.env.local` upload na karein.


## User Panel, saved cards, shared-link views aur recipient response

1. `supabase/schema.sql` ki **poori file** Supabase SQL Editor mein run karein. Agar pehle purana schema run kiya tha, tab bhi updated file dobara run karein; ismein new tables/functions ke `if not exists`/`create or replace` setup hain.
2. Website par email se register/login karein.
3. Card banane ke baad final screen par **Save to My Cards** dabayein. Saved cards `/account` par milenge; title rename aur card delete kar sakte hain.
4. Login ke baad card share karenge to share URL aapke account ke `My Shared Links` mein register hoga. Link ko recipient kholega to view count badhega.
5. Recipient agar shared card par **Yes, let’s be okay** ya **Not yet** dabata hai, to User Panel mein dono choices ke counts aayenge. Yeh feature regular sorry-story page ke response buttons ko track karta hai. `Sorry, My Girl` iframe ka internal response button is site ke control mein nahi hai; uske page views/share-link views track ho sakte hain, lekin iframe ke andar ke buttons ka response tabhi track hoga jab external `sorry-my-girl.vercel.app` project mein bhi integration add ki jaye.
6. User Panel: `https://sorry-withlove.vercel.app/account`. Admin-only analytics: `https://sorry-withlove.vercel.app/admin/analytics`.

**Privacy:** My Cards aur My Shared Links mein user ne jo names aur URL personalize kiya hai woh usi signed-in account ke records mein store hota hai. Anonymous aggregate `site_events` mein sender/recipient names ya message text store nahi hote.
