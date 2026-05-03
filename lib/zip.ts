/**
 * Minimal in-memory ZIP encoder, "stored" (no compression).
 * Sufficient for small JSON/CSV bundles. Single Buffer output, no streaming.
 */

import { crc32 } from "node:zlib";

interface Entry {
  name: string;
  data: Buffer;
}

function dosTime(d: Date) {
  const time =
    ((d.getHours() & 31) << 11) |
    ((d.getMinutes() & 63) << 5) |
    Math.floor(d.getSeconds() / 2);
  const date =
    (((d.getFullYear() - 1980) & 127) << 9) |
    ((d.getMonth() + 1) << 5) |
    d.getDate();
  return { time, date };
}

export function buildZip(files: { name: string; content: string | Buffer }[]): Buffer {
  const now = new Date();
  const { time, date } = dosTime(now);
  const entries: Entry[] = files.map((f) => ({
    name: f.name,
    data: Buffer.isBuffer(f.content) ? f.content : Buffer.from(f.content, "utf8"),
  }));

  const localHeaders: Buffer[] = [];
  const centralHeaders: Buffer[] = [];
  let offset = 0;

  for (const e of entries) {
    const nameBuf = Buffer.from(e.name, "utf8");
    const crc = crc32(e.data);

    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);          // local file header signature
    lh.writeUInt16LE(20, 4);                  // version needed
    lh.writeUInt16LE(0, 6);                   // flags
    lh.writeUInt16LE(0, 8);                   // method = stored
    lh.writeUInt16LE(time, 10);
    lh.writeUInt16LE(date, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(e.data.length, 18);      // compressed size
    lh.writeUInt32LE(e.data.length, 22);      // uncompressed size
    lh.writeUInt16LE(nameBuf.length, 26);
    lh.writeUInt16LE(0, 28);                  // extra length
    localHeaders.push(lh, nameBuf, e.data);

    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);          // central directory signature
    ch.writeUInt16LE(20, 4);                  // version made by
    ch.writeUInt16LE(20, 6);                  // version needed
    ch.writeUInt16LE(0, 8);
    ch.writeUInt16LE(0, 10);
    ch.writeUInt16LE(time, 12);
    ch.writeUInt16LE(date, 14);
    ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(e.data.length, 20);
    ch.writeUInt32LE(e.data.length, 24);
    ch.writeUInt16LE(nameBuf.length, 28);
    ch.writeUInt16LE(0, 30);
    ch.writeUInt16LE(0, 32);
    ch.writeUInt16LE(0, 34);
    ch.writeUInt16LE(0, 36);
    ch.writeUInt32LE(0, 38);                  // external attrs
    ch.writeUInt32LE(offset, 42);
    centralHeaders.push(ch, nameBuf);

    offset += 30 + nameBuf.length + e.data.length;
  }

  const localBuf = Buffer.concat(localHeaders);
  const centralBuf = Buffer.concat(centralHeaders);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);          // EOCD signature
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(localBuf.length, 16);
  eocd.writeUInt16LE(0, 20);                  // comment length

  return Buffer.concat([localBuf, centralBuf, eocd]);
}
