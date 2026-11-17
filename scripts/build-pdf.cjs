const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'node_modules/pdfjs-dist');
const target = path.join(root, 'vendor/pdfjs');
fs.mkdirSync(target, { recursive: true });
for (const [input, output] of [['pdf.mjs', 'pdf.js'], ['pdf.worker.mjs', 'pdf.worker.js']]) {
  esbuild.buildSync({ entryPoints: [path.join(source, 'build', input)], bundle: true, format: 'iife', minify: true, outfile: path.join(target, output) });
}
for (const folder of ['cmaps', 'standard_fonts', 'wasm']) fs.cpSync(path.join(source, folder), path.join(target, folder), { recursive: true });
fs.copyFileSync(path.join(source, 'LICENSE'), path.join(target, 'LICENSE'));
console.log('PDF.js browser assets built.');
