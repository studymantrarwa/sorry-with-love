'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const failures = [];
const warnings = [];
const required = ['api/index.js','api/payment-webhook.js','vercel.json','package.json','public/index.html','public/robots.txt','public/sitemap.xml','supabase/FINAL_SUPABASE_SETUP.sql'];
for (const f of required) if (!fs.existsSync(path.join(root,f))) failures.push(`Missing required file: ${f}`);
// Ensure every API handler referenced by the gateway actually exists.
const api = fs.readFileSync(path.join(root,'api/index.js'),'utf8');
for (const m of api.matchAll(/require\(["'](\.\.\/lib\/api\/[^"']+)["']\)/g)) {
  const target = path.resolve(root,'api',m[1]);
  if (!fs.existsSync(target+'.js') && !fs.existsSync(target) && !fs.existsSync(path.join(target,'index.js'))) failures.push(`API gateway references missing handler: ${m[1]}`);
}
// Check package entry points and static SEO files.
const pkg = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
if (!pkg.scripts || !pkg.scripts.test) failures.push('package.json test script is missing');
const sitemap = fs.readFileSync(path.join(root,'public/sitemap.xml'),'utf8');
if (!sitemap.includes('<urlset') || !sitemap.includes('https://bhavishya-gyani.vercel.app/')) failures.push('Sitemap XML is missing expected site URLs');
for (const forbidden of ['/admin-panel','/admin-login','/wallet','/chat','/call','/auth']) if (sitemap.includes(`<loc>https://bhavishya-gyani.vercel.app${forbidden}</loc>`)) failures.push(`Private URL must not be in sitemap: ${forbidden}`);
const robots = fs.readFileSync(path.join(root,'public/robots.txt'),'utf8');
if (!robots.includes('Sitemap: https://bhavishya-gyani.vercel.app/sitemap.xml')) failures.push('robots.txt does not point to sitemap');
const env = ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','APP_AUTH_SECRET'];
for (const key of env) if (!process.env[key]) warnings.push(`Runtime environment not supplied to local preflight: ${key}`);
if (process.env.APP_AUTH_SECRET && process.env.APP_AUTH_SECRET.trim().length < 32) failures.push('APP_AUTH_SECRET should be at least 32 characters');
if (!process.env.RAZORPAY_WEBHOOK_SECRET) warnings.push('RAZORPAY_WEBHOOK_SECRET not supplied; live Razorpay webhook cannot be verified here.');
if (!(process.env.TURN_URLS && process.env.TURN_USERNAME && process.env.TURN_PASSWORD)) warnings.push('TURN credentials absent; restrictive-network WebRTC calls need a configured TURN service.');
const sql = fs.readFileSync(path.join(root,'supabase/FINAL_SUPABASE_SETUP.sql'),'utf8');
if (!sql.includes('BEGIN;') || !sql.includes('COMMIT;')) failures.push('Supabase installer is not visibly transactional');
console.log('Bhavishya Gyani production preflight');
console.log(`Required files checked: ${required.length}`);
for (const w of warnings) console.log(`WARN: ${w}`);
for (const f of failures) console.error(`FAIL: ${f}`);
if (failures.length) process.exitCode=1;
else console.log('Static preflight passed. This does not prove live payment, Supabase, push, WebRTC or 20,000-user load capacity.');
