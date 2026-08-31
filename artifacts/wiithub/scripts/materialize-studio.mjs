import { readdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'studio.html');
const parts = (await readdir(root)).filter((name) => name.startsWith('studio.rev-')).sort();

if (parts.length === 0) {
  await access(output);
  process.exit(0);
}

let reversed = '';
for (const part of parts) reversed += await readFile(path.join(root, part), 'utf8');
const encoded = reversed.split('').reverse().join('');
await writeFile(output, Buffer.from(encoded, 'base64'));
