import { articles } from '../src/data/blogArticles.js';
import { homeContent } from '../src/data/homeContent.js';
import { seoPages } from '../src/data/seoPages.js';

const words = (value) => (String(value).match(/\b[\p{L}\p{N}’'-]+\b/gu) || []).length;
const fail = [];
const slugs = new Set();
for (const article of articles) {
  if (slugs.has(article.slug)) fail.push(`Duplicate article slug: ${article.slug}`);
  slugs.add(article.slug);
  const count = words([article.title, article.description, article.intro, ...article.sections.flat(), article.takeaway].join(' '));
  console.log(`${count} words: ${article.slug}`);
  if (count < 1000) fail.push(`Article below 1,000 words: ${article.slug} (${count})`);
  if (!article.title || !article.description || !article.intro || article.sections.length < 8) fail.push(`Missing article structure: ${article.slug}`);
}
const homeWords = words(homeContent.flatMap(section => [section.heading, ...section.paragraphs]).join(' '));
console.log(`Homepage editorial: ${homeWords} words`);
if (homeWords < 700) fail.push(`Homepage editorial below 700 words (${homeWords})`);
for (const page of seoPages) {
  if (!page.title || !page.description || !page.intro || !page.sections?.length) fail.push(`Incomplete SEO landing page: ${page.slug}`);
}
if (fail.length) {
  console.error('\nContent checks failed:\n- ' + fail.join('\n- '));
  process.exit(1);
}
console.log(`\nPASS: ${articles.length} articles, homepage content, and ${seoPages.length} landing pages meet content-structure checks.`);
