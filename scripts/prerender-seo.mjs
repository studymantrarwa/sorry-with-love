import { seoPages } from '../src/data/seoPages.js';
import { articles } from '../src/data/blogArticles.js';
import { homeContent } from '../src/data/homeContent.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const origin = 'https://sorry-withlove.vercel.app';
const staticPages = [
  { path:'/', title:'Sorry with Love | Personalised Apology Cards & Sorry Messages', description:'Sorry with Love helps you create a personalised apology card, write a heartfelt sorry message, and learn practical ways to apologise sincerely and rebuild trust.', h1:'Sorry with Love: Create a Heartfelt Apology Card', body:'Create a personal sorry card, explore thoughtful apology messages, and read practical advice for taking responsibility, respecting boundaries, and rebuilding trust.' },
  { path:'/blog', title:'Apology Advice & Relationship Communication | Sorry with Love', description:'Original apology message guides for a boyfriend, girlfriend, wife, husband, best friend, and better conversations.', h1:'Apology advice for honest conversations', body:'Explore practical guides about sincere apologies, relationship communication, friendship repair, and rebuilding trust without pressure.' },
  { path:'/about', title:'About Sorry with Love', description:'Learn about Sorry with Love, a creative website for personalised apology cards and thoughtful communication.', h1:'About Sorry with Love', body:'Sorry with Love helps people express apologies through personalised story cards and practical writing guides. Our aim is to encourage honest communication, patience, accountability, and respect for the other person’s feelings.' },
  { path:'/contact', title:'Contact Us | Sorry with Love', description:'Contact Sorry with Love with questions, feedback, or suggestions about the website.', h1:'Contact Sorry with Love', body:'For questions, feedback, or suggestions, please use the contact details published by the website owner. A real, monitored contact email should be configured before the site is promoted or used for advertising.' },
  { path:'/privacy', title:'Privacy Policy | Sorry with Love', description:'Read how Sorry with Love handles share links, technical data, cookies, and advertising disclosures.', h1:'Privacy Policy', body:'Sorry with Love may include sender and recipient names in shareable story URLs when users choose to share them. Hosting providers may process technical request and security data. This policy should reflect the actual services, analytics, cookies, and advertising tools enabled on the site.' },
  { path:'/cookies', title:'Cookie Policy | Sorry with Love', description:'Learn how Sorry with Love uses optional Google Analytics and browser storage, and how to change privacy choices.', h1:'Cookie Policy', body:'Optional Google Analytics is only loaded after a visitor chooses to allow analytics. Visitors can reject optional analytics or change their privacy choice. Review the full policy on this page for details.' },
  { path:'/terms', title:'Terms of Use | Sorry with Love', description:'Read the terms for using Sorry with Love apology cards and sharing personalised messages.', h1:'Terms of Use', body:'Use Sorry with Love lawfully and respectfully. You are responsible for the names and text you enter and for how you share generated experiences. Do not use the site to harass, pressure, threaten, or repeatedly contact anyone who has asked for no contact.' },
  { path:'/disclaimer', title:'Disclaimer | Sorry with Love', description:'Read the Sorry with Love disclaimer about apology templates and relationship outcomes.', h1:'Disclaimer', body:'Sorry with Love provides creative message templates and general communication suggestions, not professional counselling. No card or message can guarantee forgiveness or a particular relationship outcome.' },
  { path:'/sorry-my-girl', title:'Sorry, My Girl | Sorry with Love', description:'Open the Sorry, My Girl animated apology experience from Sorry with Love.', h1:'Sorry, My Girl', body:'Explore this special animated apology experience within Sorry with Love. If the embedded experience is unavailable, use the link on the page to open the original experience.' }
];
const esc = (s='') => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const allPublicPages = [
  ...staticPages.map(p => ({path:p.path,title:p.h1 || p.title,description:p.description})),
  ...articles.map(a => ({path:`/blog/${a.slug}`,title:a.title,description:a.description})),
  ...seoPages.map(p => ({path:`/${p.slug}`,title:p.title,description:p.description}))
];
const articleByPath = new Map(articles.map(a => [`/blog/${a.slug}`, a]));
const seoByPath = new Map(seoPages.map(p => [`/${p.slug}`, p]));
let builtIndex = '';
try { builtIndex = await fs.readFile(path.resolve('dist/index.html'), 'utf8'); } catch {}
const jsAsset = builtIndex.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/i)?.[1] || builtIndex.match(/<script[^>]+src="([^"]+\.js)"/i)?.[1] || '';
const cssAssets = [...builtIndex.matchAll(/<link[^>]+href="([^"]+\.css)"[^>]*>/gi)].map(m=>m[1]);
const style = `<style>body{margin:0;background:#fff8fb;color:#352431;font:17px/1.75 system-ui,-apple-system,Segoe UI,sans-serif}main{max-width:850px;margin:0 auto;padding:28px 22px}header,footer{padding:18px 0;border-bottom:1px solid #eadce5}footer{border-top:1px solid #eadce5;border-bottom:0;margin-top:40px}a{color:#9b315f}h1{font-size:clamp(2rem,5vw,3rem);line-height:1.15}h2{margin-top:2rem}p{max-width:75ch}.links{display:flex;gap:14px;flex-wrap:wrap}.notice{font-size:.9rem;color:#6d5966}</style>`;
function relatedPages(route) {
  let paths = [];
  if (route === '/') paths = ['/blog', '/blog/how-to-apologize-sincerely', '/blog/sorry-message-for-girlfriend', '/blog/sorry-message-for-boyfriend', '/online-sorry-card', '/sorry-website-for-girlfriend', '/sorry-website-for-boyfriend'];
  else if (route === '/blog') paths = [...articles.map(a=>`/blog/${a.slug}`), ...seoPages.slice(0,8).map(p=>`/${p.slug}`)];
  else if (route.startsWith('/blog/')) {
    const current = articleByPath.get(route);
    const preferred = current?.slug.includes('girlfriend') ? ['sorry-website-for-girlfriend','sorry-messages-for-her','romantic-apology-messages'] : current?.slug.includes('boyfriend') ? ['sorry-website-for-boyfriend','sorry-messages-for-him','romantic-apology-messages'] : current?.slug.includes('friend') ? ['sorry-message-for-partner','heart-touching-sorry-messages','apology-message-templates'] : ['sorry-message-for-partner','short-sorry-messages','apology-message-templates'];
    paths = ['/blog', ...articles.filter(a=>`/blog/${a.slug}`!==route).slice(0,3).map(a=>`/blog/${a.slug}`), ...preferred.map(slug=>`/${slug}`), '/online-sorry-card'];
  } else if (seoByPath.has(route)) {
    const current = seoByPath.get(route);
    const relatedSlugs = current.slug.includes('boyfriend') || current.slug.includes('him') ? ['sorry-website-for-boyfriend','sorry-messages-for-him','romantic-apology-messages'] : current.slug.includes('girlfriend') || current.slug.includes('her') ? ['sorry-website-for-girlfriend','sorry-messages-for-her','romantic-apology-messages'] : ['sorry-message-for-partner','short-sorry-messages','apology-message-templates'];
    paths = ['/blog', '/blog/how-to-apologize-sincerely', ...relatedSlugs.map(slug=>`/${slug}`), '/online-sorry-card'];
  } else paths = ['/','/blog'];
  const seen = new Set([route]);
  return paths.map(p=>allPublicPages.find(item=>item.path===p)).filter(item=>item && !seen.has(item.path) && seen.add(item.path)).slice(0,12);
}
function titleFor(route, page, isArticle, isSeoPage) {
  if (route === '/') return page.title;
  if (route === '/blog') return 'Apology Advice & Relationship Communication | Sorry with Love';
  if (route === '/sorry-my-girl') return 'Sorry, My Girl | Sorry with Love';
  if (isArticle || isSeoPage) return `${page.title} | Sorry with Love`;
  return page.title;
}
async function writeRoute(route, page, kind='page') {
  const canonical = `${origin}${route}`;
  const title = titleFor(route, page, kind === 'article', kind === 'seo');
  const isArticle = kind === 'article';
  const isSeoPage = kind === 'seo';
  const isHome = route === '/';
  const schema = isArticle ? {
    '@context':'https://schema.org','@type':'BlogPosting',headline:page.title,description:page.description,
    mainEntityOfPage:{'@type':'WebPage','@id':canonical},url:canonical,wordCount:[page.title,page.description,page.intro,...(page.sections||[]).flat()].join(' ').trim().split(/\s+/).length,
    author:{'@type':'Organization',name:'Sorry with Love',url:origin},
    publisher:{'@type':'Organization',name:'Sorry with Love',url:origin}
  } : isHome ? {
    '@context':'https://schema.org','@graph':[
      {'@type':'WebSite','@id':`${origin}/#website`,name:'Sorry with Love',alternateName:'Sorry With Love',url:`${origin}/`,description:page.description},
      {'@type':'Organization','@id':`${origin}/#organization`,name:'Sorry with Love',url:`${origin}/`,logo:{'@type':'ImageObject',url:`${origin}/logo.svg`}},
      {'@type':'WebApplication',name:'Sorry with Love',url:`${origin}/`,applicationCategory:'LifestyleApplication',operatingSystem:'Any',description:'Create and share personalised romantic apology cards and love stories.',offers:{'@type':'Offer',price:'0',priceCurrency:'USD'}}
    ]
  } : {
    '@context':'https://schema.org','@type':'WebPage',name:title,url:canonical,description:page.description,
    isPartOf:{'@type':'WebSite',name:'Sorry with Love',url:`${origin}/`}
  };
  let content = `<p>${esc(page.intro || page.body || page.description)}</p>`;
  if (Array.isArray(page.sections)) content += page.sections.map(([heading, body])=>`<section><h2>${esc(heading)}</h2><p>${esc(body)}</p></section>`).join('');
  if (page.takeaway) content += `<section><h2>Key takeaway</h2><p>${esc(page.takeaway)}</p></section>`;
  if (isSeoPage) content += `<section><h2>Create a personalised sorry card</h2><p>Choose a story style, add names, preview your message, and share it thoughtfully. A card can open a conversation, but it cannot guarantee forgiveness.</p><p><a href="/#stories">Create a sorry card</a></p></section>`;
  if (isHome) content += homeContent.map(section=>`<section><h2>${esc(section.heading)}</h2>${section.paragraphs.map(paragraph=>`<p>${esc(paragraph)}</p>`).join('')}</section>`).join('') + `<section><h2>Explore apology cards and guides</h2><p>Choose a story style, add the sender and recipient names, and preview your personalised apology. Read practical guidance for apologising after an argument, writing a message to someone you love, and rebuilding trust.</p><p><a href="/#stories">Choose a card</a> · <a href="/blog">Read apology guides</a></p></section>`;
  if (route === '/blog') content += `<section><h2>Apology message guides</h2><ul>${articles.map(a=>`<li><a href="/blog/${a.slug}">${esc(a.title)}</a> — ${esc(a.description)}</li>`).join('')}</ul><h2>More sorry-message topics</h2><ul>${seoPages.map(p=>`<li><a href="/${p.slug}">${esc(p.title)}</a> — ${esc(p.description)}</li>`).join('')}</ul></section>`;
  const related = relatedPages(route).map(item=>`<li><a href="${item.path}">${esc(item.title)}</a></li>`).join('');
  const nav = `<header><a href="/" aria-label="Sorry with Love home">Sorry with Love</a> · <a href="/blog">Blog &amp; Guides</a> · <a href="/#stories">Apology Cards</a></header>`;
  const footer = `<footer><nav class="links" aria-label="Information"><a href="/about">About</a><a href="/contact">Contact</a><a href="/privacy">Privacy</a><a href="/cookies">Cookies</a><a href="/terms">Terms</a><a href="/disclaimer">Disclaimer</a></nav><p class="notice">Sorry with Love · Thoughtful apologies and personal messages</p></footer>`;
  const html = `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#fff5fa"><meta name="robots" content="index,follow,max-image-preview:large"><meta name="googlebot" content="index,follow,max-image-preview:large"><meta name="description" content="${esc(page.description)}"><meta name="author" content="Sorry with Love"><link rel="canonical" href="${canonical}"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><meta property="og:type" content="${isArticle?'article':'website'}"><meta property="og:site_name" content="Sorry with Love"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(page.description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${origin}/images/img1.jpg"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(page.description)}"><title>${esc(title)}</title><script type="application/ld+json">${JSON.stringify(schema).replaceAll('<','\\u003c')}</script>${cssAssets.map(h=>`<link rel="stylesheet" href="${h}">`).join('')}${style}</head><body><div id="root"><main>${nav}<article><h1>${esc(page.h1 || page.title)}</h1>${content}<p class="notice">Use these guides as a starting point. Personalise messages honestly, respect boundaries, and avoid pressuring anyone to forgive or reply.</p></article>${related ? `<section><h2>Related guides</h2><ul>${related}</ul></section>` : ''}${footer}</main></div>${jsAsset ? `<script type="module" src="${jsAsset}"></script>` : ''}</body></html>`;
  const out = route === '/' ? path.resolve('dist/index.html') : path.resolve('dist', route.slice(1), 'index.html');
  await fs.mkdir(path.dirname(out), {recursive:true});
  await fs.writeFile(out, html, 'utf8');
}

for (const page of staticPages) await writeRoute(page.path, page, 'page');
for (const article of articles) await writeRoute(`/blog/${article.slug}`, {...article,h1:article.title}, 'article');
for (const page of seoPages) await writeRoute(`/${page.slug}`, {...page,h1:page.title}, 'seo');
console.log(`SEO prerender complete: ${staticPages.length + articles.length + seoPages.length} routes`);
