import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { stringify } from 'yaml';
import { NOTE_PREFIX, appFiles, changedFiles, isAncestor, readAt, resolveCommit } from './lib.mjs';
import { validateNote } from './validate-notes.mjs';

export function selectNotes(repo, baseRef, targetRef, { build = false } = {}) {
  const base = resolveCommit(repo, baseRef);
  const target = resolveCommit(repo, targetRef);
  if (!isAncestor(repo, base, target)) throw new Error('The baseline must be an ancestor of the selected build/release. Choose its actual earlier build or release.');
  const changes = changedFiles(repo, base, target);
  const notes = changes.filter(({ path }) => path.startsWith(NOTE_PREFIX) && path.endsWith('.yaml'));
  if (notes.some(({ status }) => status !== 'A' && !(build && status === 'M'))) throw new Error('A previously included note was changed/deleted. Review the range before generating a release.');
  if (!notes.length && changes.some(({ path }) => path.startsWith('app/'))) throw new Error('App sources changed without a new/updated note in this range. Complete the PR change note first.');
  return { base, target, notes: notes.map(({ path }) => ({ path, note: validateNote(repo, target, path) })) };
}

export function renderHandoff({ repo = process.cwd(), repository, baseline, targetRef, version, build = false, buildLabel, runUrl }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error('Provide GITHUB_REPOSITORY as owner/repo.');
  if (!/^v\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(version)) throw new Error('Use a semantic version such as v0.2.0.');
  const selection = selectNotes(repo, baseline, targetRef, { build });
  const staging = mkdtempSync(join(tmpdir(), 'tester-handoff-'));
  let formatted;
  try {
    mkdirSync(join(staging, '.changes/unreleased'), { recursive: true });
    cpSync(resolve(repo, '.changie.yaml'), join(staging, '.changie.yaml'));
    cpSync(resolve(repo, '.changes/header.tpl.md'), join(staging, '.changes/header.tpl.md'));
    for (const { path, note } of selection.notes) {
      const rendered = structuredClone(note);
      for (const key of ['BeforeImage', 'AfterImage']) {
        if (rendered.custom[key]) rendered.custom[key] = `https://github.com/${repository}/blob/${selection.target}/${rendered.custom[key]}?raw=true`;
      }
      writeFileSync(join(staging, path), stringify(rendered));
    }
    const binary = resolve(repo, '.tools/changie');
    execFileSync(binary, ['batch', version], { cwd: staging, stdio: 'pipe' });
    execFileSync(binary, ['merge'], { cwd: staging, stdio: 'pipe' });
    formatted = readFileSync(join(staging, 'CHANGELOG.md'), 'utf8');
  } finally { rmSync(staging, { recursive: true, force: true }); }
  const compareUrl = `https://github.com/${repository}/compare/${selection.base}...${selection.target}`;
  const intro = build
    ? `> **TEST BUILD — ${buildLabel}.** This is a preview for testing, not a published release. Notes describe intended behavior; they do not mean testing has passed.`
    : '> **RELEASE HANDOFF.** Reviewed change descriptions and suggested checks. A developer/lead still confirms completeness, especially reverted or superseded changes.';
  const identity = `**Compared with:** ${baseline} (${selection.base.slice(0, 8)})  \n**Code version:** [${selection.target.slice(0, 8)}](https://github.com/${repository}/commit/${selection.target})  \n**Included change notes:** ${selection.notes.length} · [View comparison](${compareUrl})${runUrl ? ` · [Build/workflow](${runUrl})` : ''}`;
  const markdown = `${intro}\n\n${identity}\n\n---\n\n${formatted}\n${selection.notes.length ? '' : 'No new tester-facing change notes were added or updated in this range.\n'}\n---\n\nPrepared from the selected code version, not the latest branch contents. Screenshots show the versions recorded with each PR; they are not necessarily the final screen after all later changes.\n`;
  return { ...selection, markdown };
}

export function writeBuildPackage(repo, result, directory, label) {
  mkdirSync(directory, { recursive: true });
  for (const path of appFiles(repo, result.target)) {
    mkdirSync(join(directory, path, '..'), { recursive: true });
    writeFileSync(join(directory, path), readAt(repo, result.target, path));
  }
  mkdirSync(join(directory, 'scripts'), { recursive: true });
  cpSync(resolve(repo, 'scripts/server.mjs'), join(directory, 'scripts/server.mjs'));
  const localMarkdown = result.markdown.replace(/https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/blob\/[a-f0-9]{40}\/(docs\/change-images\/[^\s)]+)\?raw=true/g, '$1');
  writeFileSync(join(directory, 'TESTER-HANDOFF.md'), localMarkdown);
  writeFileSync(join(directory, 'START-HERE.md'), `# Station Desk ${label}\n\nFictional simulation; no hardware connection.\n\nRead TESTER-HANDOFF.md for changes and suggested checks. With Node 22 or later installed, run:\n\n\`\`\`sh\nnode scripts/server.mjs\n\`\`\`\n\nThen open http://127.0.0.1:4178.\n`);
  writeFileSync(join(directory, 'build.json'), JSON.stringify({ label, commit: result.target, baseline: result.base, changes: result.notes.map(({ path }) => path) }, null, 2) + '\n');
  for (const { note } of result.notes) {
    for (const key of ['BeforeImage', 'AfterImage', 'Capture']) {
      const path = note.custom[key];
      if (!path) continue;
      mkdirSync(join(directory, path, '..'), { recursive: true });
      writeFileSync(join(directory, path), readAt(repo, result.target, path));
    }
  }
}
