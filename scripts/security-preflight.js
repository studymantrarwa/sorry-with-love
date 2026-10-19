const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const fail = [];
function check(ok, message) { if (ok) console.log('PASS:', message); else { console.error('FAIL:', message); fail.push(message); } }
const vercel = JSON.parse(read('vercel.json'));
const headers = vercel.headers?.find(x => x.source === '/(.*)')?.headers || [];
const headerMap = Object.fromEntries(headers.map(h => [h.key.toLowerCase(), h.value]));
check(Boolean(headerMap['strict-transport-security']?.includes('max-age=31536000')), 'HSTS is configured');
check(Boolean(headerMap['content-security-policy']?.includes("object-src 'none'")), 'CSP blocks plugin/object content');
check(Boolean(headerMap['content-security-policy']?.includes("frame-ancestors 'none'")), 'CSP blocks framing');
check(Boolean(headerMap['x-content-type-options'] === 'nosniff'), 'MIME sniffing protection is configured');
const api = read('api/index.js');
check(api.includes('"language": require("../lib/api/language")'), 'Language API route is registered');
check(api.includes('Strict-Transport-Security') && api.includes('Content-Security-Policy'), 'API gateway adds security headers');
const health = read('lib/api/health.js');
check(!health.includes('pythonEphemerisUrl:process.env.EPHEMERIS_URL') && health.includes('ephemerisConfigured:!!process.env.EPHEMERIS_URL'), 'Health API reports configuration status without exposing the raw URL');
const admin = read('lib/api/admin-register.js');
check(admin.includes("rateLimitRequest(req,'admin-register',3,3600)"), 'Admin registration is rate-limited');
check(admin.includes('crypto.timingSafeEqual') && admin.includes('sameSecret(code,required)'), 'Admin registration code comparison is timing-safe');
check(admin.includes('password.length<12'), 'Admin account creation enforces a 12-character minimum password');
for (const [file, marker] of [
  ['lib/api/kundli.js', 'rateLimitRequest(req,"kundli",20,60)'],
  ['lib/api/advanced.js', "rateLimitRequest(req,'advanced',20,60)"],
  ['lib/api/matching.js', 'rateLimitRequest(req,"matching",30,60)'],
  ['lib/api/muhurat.js', "rateLimitRequest(req,\"muhurat\",8,60)"],
  ['lib/api/numerology.js', 'rateLimitRequest(req,"numerology",60,60)'],
  ['lib/api/panchang.js', 'rateLimitRequest(req,"panchang",90,60)'],
  ['lib/api/horoscope.js', "rateLimitRequest(req,'horoscope',60,60)"],
  ['lib/api/places.js', "rateLimitRequest(req,'places',40,60)"]
]) check(read(file).includes(marker), `${file} has a server-side request limit`);
const publicDir = path.join(root, 'public');
const secretPatterns = [/SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*['"][^'"]{12,}/i, /RAZORPAY_KEY_SECRET\s*[:=]\s*['"][^'"]{8,}/i, /RAZORPAY_WEBHOOK_SECRET\s*[:=]\s*['"][^'"]{8,}/i, /APP_AUTH_SECRET\s*[:=]\s*['"][^'"]{12,}/i];
let leaks = [];
function walk(dir) { for (const ent of fs.readdirSync(dir, {withFileTypes:true})) { const full = path.join(dir, ent.name); if (ent.isDirectory()) walk(full); else if (/\.(?:js|html|json|css)$/i.test(ent.name)) { const body = fs.readFileSync(full,'utf8'); if (secretPatterns.some(re => re.test(body))) leaks.push(path.relative(root,full)); } } }
walk(publicDir);
check(leaks.length===0, leaks.length ? `No server secret literals in public files (suspects: ${leaks.join(', ')})` : 'No obvious hard-coded server secrets in public source files');
if (fail.length) { console.error(`Security static preflight failed: ${fail.length} check(s)`); process.exit(1); }
console.log('Security static preflight passed. Live auth/DB/payment/WebRTC penetration and load tests are not performed by this script.');
