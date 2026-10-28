#!/usr/bin/env node
/**
 * Export the Up-4ever account file list to up4ever-files.json.
 * Runs on GitHub Actions (real network) — the key comes ONLY from the
 * UP4EVER_API_KEY environment variable (Actions secret), is never printed,
 * never placed in URLs, and never written to disk.
 */
import { writeFileSync } from 'node:fs';
import { listAccountFiles } from '../server/up4ever.mjs';

const apiKey = process.env.UP4EVER_API_KEY;
if (!apiKey || apiKey.length < 20) {
  console.error('UP4EVER_API_KEY missing or too short — aborting (fail closed).');
  process.exit(1);
}

const { items, stats } = await listAccountFiles({ apiKey });

writeFileSync('up4ever-files.json', JSON.stringify({ exportedAt: new Date().toISOString(), stats, items }, null, 2));

// stats only — no key, no secrets
console.log(`exported ${items.length} file(s) | pages=${stats.pages} folders=${stats.folders} excluded=${stats.excluded} apiTotal=${stats.filesTotal}`);
