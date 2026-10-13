export default function handler(req, res) {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  res.status(200).send(
    '# Public discovery resources\n' +
    '# AI-readable site guide: https://sorry-withlove.vercel.app/llms.txt\n' +
    'User-agent: *\n' +
    'Allow: /\n' +
    'Disallow: /api/\n' +
    'Sitemap: https://sorry-withlove.vercel.app/sitemap.xml\n'
  );
}
