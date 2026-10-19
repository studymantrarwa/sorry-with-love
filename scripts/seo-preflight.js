const fs = require('fs');
const path = require('path');
const base = 'https://bhavishya-gyani.vercel.app';
const pub = path.join(__dirname, '..', 'public');
const fail = [];
const sitemapPath = path.join(pub, 'sitemap.xml');
const sitemap = fs.readFileSync(sitemapPath, 'utf8');
if (!sitemap.startsWith('<?xml')) fail.push('Sitemap must begin with an XML declaration');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
if (!urls.length) fail.push('Sitemap contains no URLs');
if (new Set(urls).size !== urls.length) fail.push('Sitemap contains duplicate URLs');
for (const url of urls) {
  if (!url.startsWith(base)) fail.push(`Non-canonical host in sitemap: ${url}`);
  const pathname = new URL(url).pathname;
  const file = path.join(pub, pathname === '/' ? 'index.html' : pathname.replace(/^\//, '') + '.html');
  if (!fs.existsSync(file)) fail.push(`Sitemap URL has no matching HTML file: ${url}`);
  else {
    const html = fs.readFileSync(file, 'utf8');
    if (!html.includes(`rel="canonical" href="${url}"`)) fail.push(`Missing/mismatched canonical for ${url}`);
    if (!/<meta\s+name="description"\s+content=".{40,}"/i.test(html)) fail.push(`Missing/short description: ${url}`);
    if (/<meta\s+name="robots"[^>]*noindex/i.test(html)) fail.push(`Noindex page included in sitemap: ${url}`);
    if (!html.includes('application/ld+json')) fail.push(`Missing JSON-LD on public page: ${url}`);
    if ((html.match(/rel="canonical"/g) || []).length !== 1) fail.push(`Expected one canonical tag: ${url}`);
    if ((html.match(/application\/ld\+json/g) || []).length !== 1) fail.push(`Expected one JSON-LD block: ${url}`);
    const jsonMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
    if (jsonMatch) { try { JSON.parse(jsonMatch[1]); } catch (e) { fail.push(`Invalid JSON-LD: ${url}`); } }
  }
}
for (const name of fs.readdirSync(pub).filter(n => n.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(pub, name), 'utf8');
  const slug = name.replace(/\.html$/, '');
  if (['account','activity','admin-login','admin-panel-entry','admin-panel','admin-register','astrologer-dashboard','astrologer-login','astrologer-register','auth','call-history','call','chat','my-kundlis','referral','reset-password','settings','shared-kundli','upgrade','astrologer-profile','feedback','kundli'].includes(slug)) {
    if (!/<meta\s+name="robots"\s+content="noindex,nofollow,noarchive"\s*>/i.test(html)) fail.push(`Private/result-only page must be noindex: ${name}`);
  }
}
if (!/Sitemap:\s*https:\/\/bhavishya-gyani\.vercel\.app\/sitemap\.xml/i.test(fs.readFileSync(path.join(pub, 'robots.txt'), 'utf8'))) fail.push('robots.txt missing sitemap declaration');
if (fail.length) { console.error('SEO PREFLIGHT FAIL'); fail.forEach(x => console.error('- ' + x)); process.exit(1); }
console.log(`SEO PREFLIGHT PASS: ${urls.length} canonical public URLs, descriptions, JSON-LD, sitemap and noindex rules checked.`);
