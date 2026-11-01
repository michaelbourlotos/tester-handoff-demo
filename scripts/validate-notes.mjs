import { parseDocument } from 'yaml';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { NOTE_PREFIX, appDigest, changedFiles, git, hash, isAncestor, readAt, resolveCommit } from './lib.mjs';

const required = ['Title', 'Area', 'Why', 'Before', 'Expected', 'Test', 'Visual', 'PullRequest'];
const guiPaths = new Set(['app/index.html', 'app/styles.css', 'app/ui.js', 'app/config.js']);
export function parseNote(bytes) {
  if (bytes.length > 24000) throw new Error('Keep each change note below 24 KB.');
  const document = parseDocument(bytes.toString());
  if (document.errors.length) throw new Error(`Invalid YAML: ${document.errors[0].message}`);
  const note = document.toJS({ maxAliasCount: 0 });
  if (!note || !['Added', 'Changed', 'Fixed'].includes(note.kind)) throw new Error('Choose kind: Added, Changed or Fixed.');
  const text = (value, name) => {
    if (typeof value !== 'string' || value.trim().length < 8 || /^(todo|tbd|placeholder|replace me)\b/i.test(value.trim())) throw new Error(`Complete ${name} in plain language.`);
  };
  text(note.body, 'body');
  if (typeof note.time !== 'string' || !Number.isFinite(Date.parse(note.time))) throw new Error('Provide an ISO timestamp in time.');
  if (!note.custom || typeof note.custom !== 'object') throw new Error('Provide the custom change-note fields.');
  for (const key of required.filter(key => !['Visual', 'PullRequest'].includes(key))) text(note.custom[key], key);
  if (!['yes', 'no'].includes(note.custom.Visual)) throw new Error('Visual must be the quoted string "yes" or "no".');
  if (!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/[1-9]\d*$/.test(note.custom.PullRequest || '')) throw new Error('Link PullRequest to this demo PR.');
  if (note.custom.Visual === 'no') text(note.custom.NoVisualReason, 'NoVisualReason');
  return note;
}

export function validateNote(repo, head, path, { base } = {}) {
  const note = parseNote(readAt(repo, head, path));
  const id = path.slice(NOTE_PREFIX.length).replace(/\.yaml$/, '');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error('Use a descriptive lowercase note filename ending in .yaml.');
  if (note.custom.Visual === 'yes') {
    for (const [key, file] of [['BeforeImage', 'before.png'], ['AfterImage', 'after.png'], ['Capture', 'capture.json']]) {
      if (note.custom[key] !== `docs/change-images/${id}/${file}`) throw new Error(`${key} must reference docs/change-images/${id}/${file}.`);
    }
    const capture = JSON.parse(readAt(repo, head, note.custom.Capture).toString());
    if (!/^[a-f0-9]{40}$/.test(capture.baseCommit || '') || !/^[a-f0-9]{40}$/.test(capture.headCommit || '')) throw new Error('Capture must record exact source commits.');
    if (!isAncestor(repo, capture.baseCommit, capture.headCommit) || !isAncestor(repo, capture.headCommit, head)) throw new Error('Captured commits must belong to this change history.');
    const expectedBefore = appDigest(repo, base || capture.baseCommit);
    const expectedAfter = appDigest(repo, base ? head : capture.headCommit);
    if (capture.beforeDigest !== expectedBefore || capture.afterDigest !== expectedAfter || capture.beforeDigest !== appDigest(repo, capture.baseCommit) || capture.afterDigest !== appDigest(repo, capture.headCommit)) throw new Error('Screenshots are stale or from different app sources. Recapture before and after.');
    for (const [side, key] of [['before', 'BeforeImage'], ['after', 'AfterImage']]) {
      const png = readAt(repo, head, note.custom[key]);
      if (png.length < 32 || png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error(`${key} must be an actual PNG.`);
      if (hash(png) !== capture.images?.[side]) throw new Error(`${key} differs from the captured image.`);
    }
  }
  return note;
}

export function validatePR(repo, baseRef, headRef, prUrl) {
  const head = resolveCommit(repo, headRef);
  const bases = git(repo, 'merge-base', '--all', resolveCommit(repo, baseRef), head).toString().trim().split('\n');
  if (bases.length !== 1 || !bases[0]) throw new Error('A unique PR merge base is required.');
  const base = bases[0];
  const changes = changedFiles(repo, base, head);
  const notes = changes.filter(change => change.path.startsWith(NOTE_PREFIX) && change.path.endsWith('.yaml'));
  if (notes.some(change => change.status !== 'A')) throw new Error('Do not edit or delete another merged PR’s change note. Add your own new note.');
  if (notes.length !== 1) throw new Error('This PR needs exactly one new .changes/unreleased/<descriptive-id>.yaml file. Explain what changed, expected behavior and what to test.');
  const note = validateNote(repo, head, notes[0].path, { base });
  if (prUrl && note.custom.PullRequest !== prUrl) throw new Error('PullRequest must link to this PR, not an older PR.');
  if (changes.some(change => guiPaths.has(change.path)) && note.custom.Visual !== 'yes') throw new Error('A screen source changed. Include before/after screenshots and capture.json.');
  return { note: notes[0].path, title: note.custom.Title, visual: note.custom.Visual, message: 'Change note and required evidence are present. Developer review still confirms accuracy and completeness.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const { values } = parseArgs({ options: { repo: { type: 'string', default: process.cwd() }, base: { type: 'string' }, head: { type: 'string', default: 'HEAD' }, 'pr-url': { type: 'string' } } });
    if (!values.base) throw new Error('Use --base <PR target commit> [--head HEAD].');
    console.log(JSON.stringify(validatePR(values.repo, values.base, values.head, values['pr-url']), null, 2));
  } catch (error) { console.error(`CHANGE NOTE REQUIRED: ${error.message}`); process.exitCode = 1; }
}
