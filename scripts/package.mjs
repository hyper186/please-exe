import { readdir, readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { zip } from './assets.mjs';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));
async function files(root, dir = '') { const out = []; for (const entry of (await readdir(`${root}/${dir}`, { withFileTypes: true })).sort((a,b)=>a.name.localeCompare(b.name))) { const path = dir ? `${dir}/${entry.name}` : entry.name; if (entry.isDirectory()) out.push(...await files(root,path)); else if (entry.isFile()) out.push([path,await readFile(`${root}/${path}`)]); } return out; }
await mkdir('artifacts', { recursive: true }); await mkdir('dist/site/downloads', { recursive: true });
const extension = zip(await files('dist/extension'));
await writeFile('artifacts/please-exe-0.1.0.zip', extension);
await copyFile('artifacts/please-exe-0.1.0.zip','dist/site/downloads/please-exe-0.1.0.zip');
const site = zip(await files('dist/site')); await writeFile('artifacts/please-exe-playground-0.1.0.zip', site);
await writeFile('artifacts/SHA256SUMS.txt', [ ['please-exe-0.1.0.zip', extension], ['please-exe-playground-0.1.0.zip', site] ].map(([name,bytes]) => `${createHash('sha256').update(bytes).digest('hex')}  ${name}`).join('\n')+'\n');
console.log(`Extension: ${extension.length.toLocaleString()} bytes. Playground: ${site.length.toLocaleString()} bytes. Checksums written.`);
