export default function handler(req, res) {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  res.status(200).send('User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: https://sorry-withlove.vercel.app/sitemap.xml\n');
}
