/**
 * Gueltige PNGs fuer Foto-Uploads (F8950 T31: aus b5900-009 herausgeloest, damit Specs Seed-Items mit Foto anlegen
 * koennen). Jede `shade` erzeugt andere Pixel, sonst dedupliziert das Backend per SHA.
 */
import zlib from 'zlib'

function crc32(buf: Buffer): number {
  let c: number
  let crc = 0xffffffff
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = (crc >>> 8) ^ c
  }
  return (crc ^ 0xffffffff) >>> 0
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
/** Valid 64x64 RGB PNG; `shade` makes every file hash differently. */
export function makePng(shade: number): Buffer {
  const w = 64, h = 64
  const raw = Buffer.alloc((w * 3 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0
    for (let x = 0; x < w; x++) {
      const o = y * (w * 3 + 1) + 1 + x * 3
      raw[o] = (shade * 37) % 256; raw[o + 1] = (x * 4 + shade) % 256; raw[o + 2] = (y * 4 + shade * 3) % 256
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ])
}
export const png = (shade: number, name = `p${shade}.png`) => ({ name, mimeType: 'image/png', buffer: makePng(shade) })
