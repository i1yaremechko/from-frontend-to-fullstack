import { pipeline } from 'node:stream/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { createGzip } from 'node:zlib';

await pipeline(
  createReadStream('big.log'),
  createGzip(),
  createWriteStream('big.log.gz'),
);