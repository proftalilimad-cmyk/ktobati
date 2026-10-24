// Generates public/sitemap.xml from the book & category data.
import { readFileSync, writeFileSync } from 'node:fs';

const ORIGIN = 'https://maktaba.example';
const raw = readFileSync(new URL('../src/data/books.raw.ts', import.meta.url), 'utf8');
const cats = readFileSync(new URL('../src/data/categories.ts', import.meta.url), 'utf8');

const bookIds = [...raw.matchAll(/id:\s*'(\d+)',\s*\n\s*title:/g)].map((m) => m[1]);
const authorMatches = [...raw.matchAll(/id:\s*'(\d+)',\s*name:\s*'[^']*',\s*role:\s*'author'/g)].map((m) => m[1]);
const uniqAuthors = [...new Set(authorMatches)];
const slugs = [...cats.matchAll(/slug:\s*'([^']+)'/g)].map((m) => m[1]);

const staticRoutes = ['/', '/books', '/books/new', '/books/popular', '/categories', '/authors', '/search'];
const urls = [
  ...staticRoutes,
  ...slugs.map((s) => `/category/${s}`),
  ...bookIds.map((id) => `/book/${id}`),
  ...uniqAuthors.map((id) => `/author/${id}`),
];

const today = new Date().toISOString().slice(0, 10);
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${ORIGIN}${u}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>${u === '/' ? '1.0' : '0.7'}</priority></url>`,
  )
  .join('\n')}
</urlset>
`;
writeFileSync(new URL('../public/sitemap.xml', import.meta.url), xml);
console.log(`sitemap.xml written: ${urls.length} URLs (${bookIds.length} books, ${uniqAuthors.length} authors, ${slugs.length} categories)`);
