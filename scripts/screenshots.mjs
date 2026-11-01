import { chromium } from 'playwright';
import { parseArgs } from 'node:util';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { once } from 'node:events';
import { appServer } from './server.mjs';
import { appDigest, appFiles, readAt, resolveCommit, hash } from './lib.mjs';

const { values } = parseArgs({ options: { base: { type: 'string' }, head: { type: 'string', default: 'HEAD' }, change: { type: 'string' } } });
if (!values.base || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.change || '')) throw new Error('Use --base <commit> --head <commit> --change <descriptive-id>');
const repo = process.cwd();
const base = resolveCommit(repo, values.base);
const head = resolveCommit(repo, values.head);
const output = resolve(repo, 'docs/change-images', values.change);
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const manifest = { baseCommit: base, headCommit: head, beforeDigest: appDigest(repo, base), afterDigest: appDigest(repo, head), viewport: { width: 1280, height: 900 }, browser: browser.version(), platform: process.platform, state: 'Initial idle screen, pump stopped, valve closed; no hardware or external data.', images: {} };
try {
  for (const [side, ref] of [['before', base], ['after', head]]) {
    const files = new Map(appFiles(repo, ref).map(path => [path.slice(4), readAt(repo, ref, path)]));
    const server = appServer(name => files.get(name));
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const url = `http://127.0.0.1:${server.address().port}`;
    const context = await browser.newContext({ viewport: manifest.viewport, deviceScaleFactor: 1, locale: 'en-US', timezoneId: 'UTC', colorScheme: 'light', reducedMotion: 'reduce' });
    try {
      await context.route('**/*', route => new URL(route.request().url()).origin === url ? route.continue() : route.abort());
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.locator('#valveLabel').filter({ hasText: /\S/ }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      if (errors.length) throw new Error(errors.join('\n'));
      const screenshot = await page.screenshot({ animations: 'disabled', fullPage: true });
      writeFileSync(join(output, `${side}.png`), screenshot);
      manifest.images[side] = hash(screenshot);
      console.log(`${side}: ${ref} → docs/change-images/${values.change}/${side}.png`);
    } finally { await context.close(); server.close(); }
  }
  writeFileSync(join(output, 'capture.json'), `${JSON.stringify(manifest, null, 2)}\n`);
} finally { await browser.close(); }
