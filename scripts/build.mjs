import { build } from 'esbuild';
import { mkdir, copyFile, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { icon } from './assets.mjs';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));
await rm('dist', { recursive: true, force: true });
for (const name of ['extension', 'site', 'server']) await mkdir(`dist/${name}`, { recursive: true });
const browser = { bundle: true, target: 'chrome116', minify: true, sourcemap: false, legalComments: 'none', logLevel: 'info' };
await Promise.all([
  build({ ...browser, entryPoints: ['src/extension/content.ts'], outfile: 'dist/extension/content.js', format: 'iife' }),
  build({ ...browser, entryPoints: ['src/extension/background.ts'], outfile: 'dist/extension/background.js', format: 'esm' }),
  build({ ...browser, entryPoints: ['src/extension/options.ts'], outfile: 'dist/extension/options.js', format: 'iife' }),
  build({ ...browser, entryPoints: ['src/site/main.ts'], outfile: 'dist/site/site.js', format: 'iife' }),
  build({ entryPoints: ['src/server/main.ts'], bundle: true, platform: 'node', target: 'node22', format: 'esm', outfile: 'dist/server/main.js', logLevel: 'info' }),
]);
for (const folder of ['extension', 'site']) {
  await mkdir(`dist/${folder}/icons`);
  for (const size of [16,32,48,128]) await writeFile(`dist/${folder}/icons/icon${size}.png`, icon(size));
  await copyFile('LICENSE', `dist/${folder}/LICENSE.txt`);
  await copyFile('public/styles.css', `dist/${folder}/styles.css`);
  await copyFile('public/options.html', `dist/${folder}/options.html`);
}
await copyFile('dist/extension/options.js', 'dist/site/options.js');
await copyFile('public/manifest.json', 'dist/extension/manifest.json');
await copyFile('public/index.html', 'dist/site/index.html');
await writeFile('dist/extension/INSTALL.txt', 'Please.exe 0.1.0 beta\n\nOpen chrome://extensions, enable Developer mode, select Load unpacked and choose this folder. Reload Claude and ChatGPT. Click the extension icon for settings.\n\nLocal mode needs no key. For optional Jev setup and privacy details: https://github.com/hyper186/please-exe\n\nNo automatic sending or editing. Tone estimates may be wrong.\n');
