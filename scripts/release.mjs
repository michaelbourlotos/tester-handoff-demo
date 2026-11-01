import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderHandoff, writeBuildPackage } from './handoff.mjs';
import { resolveCommit } from './lib.mjs';

const { values } = parseArgs({ options: { tag: { type: 'string', default: 'v0.2.0' }, previous: { type: 'string', default: 'v0.1.0' }, target: { type: 'string', default: 'HEAD' }, publish: { type: 'boolean', default: false } } });
const repository = process.env.GITHUB_REPOSITORY || 'michaelbourlotos/tester-handoff-demo';
const target = resolveCommit(process.cwd(), values.target);
const result = renderHandoff({ repository, baseline: values.previous, targetRef: target, version: values.tag, runUrl: process.env.GITHUB_RUN_ID ? `https://github.com/${repository}/actions/runs/${process.env.GITHUB_RUN_ID}` : undefined });
if (!result.notes.length) throw new Error('No new change notes in this release.');
const directory = resolve('.output', `station-desk-${values.tag}`);
writeBuildPackage(process.cwd(), result, directory, `release-${values.tag}`);
const archive = resolve('.output', `station-desk-${values.tag}.tar.gz`);
execFileSync('tar', ['-czf', archive, '-C', directory, '.']);
const notesPath = resolve('.output', `${values.tag}-TESTER-HANDOFF.md`);
writeFileSync(notesPath, result.markdown);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, result.markdown);
if (values.publish) {
  const gh = args => execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  let existing;
  try { existing = JSON.parse(gh(['api', `repos/${repository}/releases/tags/${values.tag}`])); }
  catch (error) { if (!error.stderr?.includes('404')) throw error; }
  if (existing) {
    if (resolveCommit(process.cwd(), `refs/tags/${values.tag}`) !== target) throw new Error('Existing release tag points to different code.');
    const start = '<!-- tester-handoff:start -->';
    const end = '<!-- tester-handoff:end -->';
    const section = `${start}\n${result.markdown}\n${end}`;
    const body = existing.body || '';
    if (body.includes(start) !== body.includes(end)) throw new Error('Incomplete handoff markers in existing release.');
    const updated = body.includes(start) ? body.slice(0, body.indexOf(start)) + section + body.slice(body.indexOf(end) + end.length) : `${body}\n\n${section}`;
    writeFileSync(notesPath, updated);
    gh(['release', 'edit', values.tag, '--repo', repository, '--notes-file', notesPath]);
    gh(['release', 'upload', values.tag, archive, '--repo', repository, '--clobber']);
    console.log(`Updated tester handoff: ${existing.html_url}`);
  } else {
    writeFileSync(notesPath, `<!-- previous-release: ${values.previous} -->\n<!-- tester-handoff:start -->\n${result.markdown}\n<!-- tester-handoff:end -->\n`);
    console.log(gh(['release', 'create', values.tag, archive, '--repo', repository, '--target', target, '--title', `Station Desk ${values.tag} · Tester handoff`, '--notes-file', notesPath, '--draft']));
  }
} else console.log(`Preview ready: ${notesPath}`);
