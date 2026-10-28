#!/usr/bin/env node
/**
 * Export the Up-4ever account file list to up4ever-files.json.
 * Runs on GitHub Actions (real network) — the key comes ONLY from the
 * UP4EVER_API_KEY Actions secret (server-side secret only; never printed,
 * never placed in URLs, never written to disk).
 *
 * Failures are reported as a GitHub Actions ::error:: annotation so the
 * reason is visible through the API (raw logs are not reachable from the
 * sandbox).
 */
import { writeFileSync } from 'node:fs';
import { listAccountFiles, Up4everAuthError, Up4everRateError, UpstreamError } from '../server/up4ever.mjs';

const apiKey = process.env.UP4EVER_API_KEY;
if (!apiKey || apiKey.length < 20) {
  console.error('::error title=Up-4ever export failed::UP4EVER_API_KEY missing or too short — check the repository secret.');
  process.exit(1);
}

try {
  const { items, stats } = await listAccountFiles({ apiKey });

  writeFileSync('up4ever-files.json', JSON.stringify({ exportedAt: new Date().toISOString(), stats, items }, null, 2));

  // stats only — no key, no secrets
  console.log(`exported ${items.length} file(s) | pages=${stats.pages} folders=${stats.folders} excluded=${stats.excluded} apiTotal=${stats.filesTotal}`);
} catch (err) {
  let hint = '';
  if (err instanceof Up4everAuthError) {
    hint = ' — the API rejected the key (HTTP 401/403): open Up-4ever → API settings and make sure the key is ACTIVE with files_read + folders scopes.';
  } else if (err instanceof Up4everRateError) {
    hint = ' — rate limited by Up-4ever (429): retry in a few minutes.';
  } else if (err instanceof UpstreamError) {
    hint = ' — upstream/network problem talking to Up-4ever.';
  }
  const msg = `${err?.name || 'Error'}: ${err?.message || String(err)}${hint}`;
  console.error(`::error title=Up-4ever export failed::${msg}`);
  console.error(msg);
  process.exit(1);
}
