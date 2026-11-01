import { parseArgs } from 'node:util';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderHandoff, writeBuildPackage } from './handoff.mjs';

const { values } = parseArgs({ options: { baseline: { type: 'string', default: 'v0.1.0' }, target: { type: 'string', default: 'HEAD' }, number: { type: 'string', default: 'local' } } });
const number = values.number.replace(/[^a-zA-Z0-9.-]/g, '-');
const repository = process.env.GITHUB_REPOSITORY || 'michaelbourlotos/tester-handoff-demo';
const result = renderHandoff({ repository, baseline: values.baseline, targetRef: values.target, version: `v0.0.0-build.${number}`, build: true, buildLabel: `build-${number}`, runUrl: process.env.GITHUB_RUN_ID ? `https://github.com/${repository}/actions/runs/${process.env.GITHUB_RUN_ID}` : undefined });
const label = `station-desk-build-${number}-${result.target.slice(0, 8)}`;
writeBuildPackage(process.cwd(), result, resolve('.output', label), label);
mkdirSync('.output', { recursive: true });
writeFileSync('.output/BUILD-HANDOFF.md', result.markdown);
writeFileSync('.output/build-label.txt', label);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `label=${label}\n`);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, result.markdown);
console.log(`Built ${label} with ${result.notes.length} change note(s). Download includes the app, TESTER-HANDOFF.md and its images.`);
