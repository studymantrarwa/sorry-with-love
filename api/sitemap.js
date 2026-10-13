import { seoPages } from '../src/data/seoPages.js';
import { articles } from '../src/data/blogArticles.js';

const site = 'https://sorry-withlove.vercel.app';
const publicPaths = [
  '/', '/blog',
  ...articles.map((article) => `/blog/${article.slug}`),
  ...seoPages.map((page) => `/${page.slug}`),
  '/sorry-my-girl', '/about', '/contact', '/privacy', '/terms', '/disclaimer'
];

const xmlEscape = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

export default function handler(req, res) {
  const urls = [...new Set(publicPaths)].map((route) => `  <url><loc>${xmlEscape(`${site}${route}`)}</loc></url>`).join('\n');
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
}
