import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node count-lines.mjs <file>');
  process.exit(1);
}

const rl = createInterface({
  input: createReadStream(file, { encoding: 'utf8' }),
  crlfDelay: Infinity,
});

let lines = 0;
for await (const line of rl) {
  if (line.trim()) lines++;
}
console.log(`Non-empty lines: ${lines}`);