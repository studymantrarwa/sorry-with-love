import { seoPages } from '../src/data/seoPages.js';

const site = 'https://sorry-withlove.vercel.app';
const publicPaths = [
  '/', '/blog',
  '/blog/how-to-apologize-sincerely',
  '/blog/sorry-message-for-girlfriend',
  '/blog/sorry-message-for-boyfriend',
  '/blog/sorry-message-for-wife',
  '/blog/sorry-message-for-husband',
  '/blog/sorry-message-for-best-friend',
  '/blog/what-not-to-say-in-an-apology',
  '/blog/rebuild-trust-after-an-argument',
  '/blog/apology-message-examples',
  '/sorry-my-girl', '/about', '/contact', '/privacy', '/terms', '/disclaimer',
  ...seoPages.map((page) => `/${page.slug}`),
];

export default function handler(req, res) {
  const urls = publicPaths.map((route) => `  <url><loc>${site}${route}</loc></url>`).join('\n');
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
}
