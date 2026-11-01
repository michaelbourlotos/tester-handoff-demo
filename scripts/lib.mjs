import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

export const NOTE_PREFIX = '.changes/unreleased/';
export function git(repo, ...args) {
  return execFileSync('git', ['-C', repo, ...args], { maxBuffer: 20 * 1024 * 1024 });
}
export function resolveCommit(repo, ref) {
  return git(repo, 'rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`).toString().trim();
}
export function readAt(repo, ref, path) {
  if (path.startsWith('/') || path.split('/').includes('..')) throw new Error('Unsafe repository path');
  return git(repo, 'show', `${resolveCommit(repo, ref)}:${path}`);
}
export function appFiles(repo, ref) {
  return git(repo, 'ls-tree', '-r', '--name-only', resolveCommit(repo, ref), '--', 'app/').toString().trim().split('\n').filter(Boolean);
}
export function hash(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
export function appDigest(repo, ref) {
  return hash(JSON.stringify(appFiles(repo, ref).sort().map(path => [path, hash(readAt(repo, ref, path))])));
}
export function changedFiles(repo, base, head) {
  return git(repo, 'diff', '--name-status', '--no-renames', resolveCommit(repo, base), resolveCommit(repo, head), '--')
    .toString().trim().split('\n').filter(Boolean).map(line => {
      const [status, path] = line.split('\t');
      return { status, path };
    });
}
export function isAncestor(repo, before, after) {
  try { git(repo, 'merge-base', '--is-ancestor', resolveCommit(repo, before), resolveCommit(repo, after)); return true; }
  catch { return false; }
}
