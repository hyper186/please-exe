import { deflateSync, deflateRawSync } from 'node:zlib';
export function crc32(bytes) { let crc = 0xffffffff; for (const b of bytes) { crc ^= b; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); } return (crc ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const t = Buffer.from(type); const out = Buffer.alloc(12 + data.length); out.writeUInt32BE(data.length, 0); t.copy(out, 4); data.copy(out, 8); out.writeUInt32BE(crc32(Buffer.concat([t, data])), 8 + data.length); return out; }
export function icon(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const nx = (x + .5) / size, ny = (y + .5) / size; let color = [248,246,239,255];
    if ((nx < .16 || nx > .84) && (ny < .16 || ny > .84) && Math.hypot(nx < .5 ? nx-.16 : nx-.84, ny < .5 ? ny-.16 : ny-.84) > .16) color = [0,0,0,0];
    for (let i = 0; i < 3; i++) { const left = .23 + .2 * i; const top = .57 - .16 * i; if (nx >= left && nx <= left+.12 && ny >= top && ny <= .77) color = [200,80,53,255]; }
    const offset = y * (size * 4 + 1) + 1 + x * 4; color.forEach((v,i) => raw[offset+i] = v);
  }
  const header = Buffer.alloc(13); header.writeUInt32BE(size,0); header.writeUInt32BE(size,4); header[8]=8; header[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
export function zip(entries) {
  const local = [], central = []; let offset = 0;
  for (const [name, data] of entries) {
    const filename = Buffer.from(name); const body = deflateRawSync(data); const crc = crc32(data);
    const l = Buffer.alloc(30); l.writeUInt32LE(0x04034b50,0); l.writeUInt16LE(20,4); l.writeUInt16LE(0x800,6); l.writeUInt16LE(8,8); l.writeUInt16LE(0x21,12); l.writeUInt32LE(crc,14); l.writeUInt32LE(body.length,18); l.writeUInt32LE(data.length,22); l.writeUInt16LE(filename.length,26);
    local.push(l,filename,body);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50,0); c.writeUInt16LE(20,4); c.writeUInt16LE(20,6); c.writeUInt16LE(0x800,8); c.writeUInt16LE(8,10); c.writeUInt16LE(0x21,14); c.writeUInt32LE(crc,16); c.writeUInt32LE(body.length,20); c.writeUInt32LE(data.length,24); c.writeUInt16LE(filename.length,28); c.writeUInt32LE(offset,42); central.push(c,filename);
    offset += l.length + filename.length + body.length;
  }
  const directory = Buffer.concat(central); const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50,0); end.writeUInt16LE(entries.length,8); end.writeUInt16LE(entries.length,10); end.writeUInt32LE(directory.length,12); end.writeUInt32LE(offset,16);
  return Buffer.concat([...local,directory,end]);
}
