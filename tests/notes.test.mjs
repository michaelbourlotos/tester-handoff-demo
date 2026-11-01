import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { stringify } from 'yaml';
import { git } from '../scripts/lib.mjs';
import { parseNote, validatePR } from '../scripts/validate-notes.mjs';
import { selectNotes } from '../scripts/handoff.mjs';

const valid = () => ({ kind: 'Changed', body: 'Pump events now include a readable timestamp.', time: '2026-11-01T12:00:00Z', custom: { Title: 'See when the pump was started', Area: 'Downloaded activity logs', Why: 'Make it easier to investigate the sequence of events.', Before: 'Events had no timestamp.', Expected: 'Each event includes the time in UTC.', Test: '- Download a log and check each event has a time.', Visual: 'no', NoVisualReason: 'The screen is unchanged; this affects downloaded text.', PullRequest: 'https://github.com/michaelbourlotos/tester-handoff-demo/pull/1' } });
function fixture(t) {
  const repo = mkdtempSync(join(tmpdir(), 'handoff-test-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  git(repo, 'init', '-b', 'main');
  git(repo, 'config', 'user.name', 'Test fixture');
  git(repo, 'config', 'user.email', 'test@example.invalid');
  function write(path, text) { mkdirSync(join(repo, path, '..'), { recursive: true }); writeFileSync(join(repo, path), text); }
  function commit(message) { git(repo, 'add', '.'); git(repo, 'commit', '-m', message); return git(repo, 'rev-parse', 'HEAD').toString().trim(); }
  write('app/logging.js', 'export const timestamp = false;');
  const base = commit('Baseline');
  return { repo, write, commit, base };
}
test('requires expected behavior and concrete testing guidance', () => {
  const note = valid(); delete note.custom.Expected;
  assert.throws(() => parseNote(Buffer.from(stringify(note))), /Complete Expected/);
});
test('rejects a PR without its own new note', t => {
  const f = fixture(t); f.write('app/logging.js', 'export const timestamp = true;'); const head = f.commit('Logging change');
  assert.throws(() => validatePR(f.repo, f.base, head), /exactly one new/);
});
test('accepts a complete nonvisual note and rejects a different PR link', t => {
  const f = fixture(t); f.write('.changes/unreleased/timestamp.yaml', stringify(valid())); f.write('app/logging.js', 'export const timestamp = true;'); const head = f.commit('Logging change and note');
  assert.equal(validatePR(f.repo, f.base, head, valid().custom.PullRequest).visual, 'no');
  assert.throws(() => validatePR(f.repo, f.base, head, 'https://github.com/michaelbourlotos/tester-handoff-demo/pull/2'), /this PR/);
});
test('a changed screen cannot be passed off as nonvisual', t => {
  const f = fixture(t); f.write('app/config.js', 'export const label = "PBS";'); f.write('.changes/unreleased/pbs.yaml', stringify(valid())); const head = f.commit('Screen change');
  assert.throws(() => validatePR(f.repo, f.base, head), /screen source changed/);
});
test('a visual note must include matching capture paths', t => {
  const f = fixture(t); const note = valid(); note.custom.Visual = 'yes'; f.write('.changes/unreleased/pbs.yaml', stringify(note)); const head = f.commit('Incomplete images');
  assert.throws(() => validatePR(f.repo, f.base, head), /BeforeImage/);
});
test('a PR cannot reuse or alter a previously merged note', t => {
  const f = fixture(t); f.write('.changes/unreleased/old.yaml', stringify(valid())); const base = f.commit('Previous PR');
  const note = valid(); note.body = 'A different change is being described.'; f.write('.changes/unreleased/old.yaml', stringify(note)); const head = f.commit('Reuse an old note');
  assert.throws(() => validatePR(f.repo, base, head), /another merged PR/);
});
test('release selection excludes already released notes and later commits', t => {
  const f = fixture(t); f.write('.changes/unreleased/first.yaml', stringify(valid())); const previous = f.commit('Previously released');
  f.write('.changes/unreleased/second.yaml', stringify(valid())); const selected = f.commit('Selected release');
  f.write('.changes/unreleased/later.yaml', stringify(valid())); f.commit('Later work');
  const result = selectNotes(f.repo, previous, selected);
  assert.deepEqual(result.notes.map(entry => entry.path), ['.changes/unreleased/second.yaml']);
  assert.equal(result.target, selected);
});
test('build comparison can include an updated draft note from an earlier build', t => {
  const f = fixture(t); f.write('.changes/unreleased/draft.yaml', stringify(valid())); const earlierBuild = f.commit('Earlier build');
  const note = valid(); note.custom.Test += '\n- Stop the pump and check the second event.'; f.write('.changes/unreleased/draft.yaml', stringify(note)); const nextBuild = f.commit('Updated draft');
  assert.equal(selectNotes(f.repo, earlierBuild, nextBuild, { build: true }).notes.length, 1);
  assert.throws(() => selectNotes(f.repo, earlierBuild, nextBuild), /previously included note/);
});
