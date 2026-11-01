import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { hash } from './lib.mjs';

const version = '1.26.0';
const systems = {
  'darwin-arm64': ['darwin_arm64', 'ba1a14e0eb220fb9c7d4dc90af462e7f7178a313cdb1299a17aafbb37838a458'],
  'darwin-x64': ['darwin_amd64', '9a1a4dc8a6901ccd9724b3b9b5ec1354e5038b1b1aa4dceef65976f6462ac7d2'],
  'linux-x64': ['linux_amd64', 'eab168c8287a6e91912e1c02e5260911232d945bfd3c89d8a0e1ace6bb7b6161'],
  'linux-arm64': ['linux_arm64', 'ec1e542014b5134f1cf86b3a12e86d566ab5ec9bd3901bf66f42a09cd9865b6e'],
};
const system = systems[`${process.platform}-${process.arch}`];
if (!system) throw new Error('This demo installer supports macOS and Linux. Install Changie 1.26.0 manually on other systems.');
const destination = resolve('.tools/changie');
mkdirSync(resolve('.tools'), { recursive: true });
const staging = mkdtempSync(join(tmpdir(), 'changie-download-'));
try {
  const url = `https://github.com/miniscruff/changie/releases/download/v${version}/changie_${version}_${system[0]}.tar.gz`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Changie download returned ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (hash(bytes) !== system[1]) throw new Error('Changie download checksum mismatch.');
  writeFileSync(join(staging, 'archive.tar.gz'), bytes);
  execFileSync('tar', ['-xzf', join(staging, 'archive.tar.gz'), '-C', staging, 'changie']);
  writeFileSync(destination, readFileSync(join(staging, 'changie')));
  chmodSync(destination, 0o755);
  console.log(`Installed verified Changie ${version} at .tools/changie`);
} finally { rmSync(staging, { recursive: true, force: true }); }
