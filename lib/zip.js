/**
 * A minimal streaming ZIP writer (store method, no compression).
 *
 * Exists instead of a zip dependency because an export contains every photo a
 * couple ever uploaded, and the usual libraries build the whole archive in
 * memory before handing it over — hundreds of megabytes on a small Railway
 * instance. This yields each file as soon as it's written, so only one photo is
 * ever held at once.
 *
 * Photos are JPEG/PNG and already compressed; storing them costs almost nothing
 * in size and saves the deflate pass entirely.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** ZIP stores timestamps in MS-DOS format: 2-second resolution, epoch 1980. */
function dosDateTime(date) {
  const year = Math.max(1980, date.getFullYear());
  return {
    time:
      (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

/**
 * Build a ZIP as a ReadableStream.
 *
 * `files` is an async iterable of { name, data, date } where data is a
 * Uint8Array. Yielding lazily is the point — pull each photo from R2 as its
 * turn comes rather than gathering them all up front.
 */
export function createZipStream(files) {
  return new ReadableStream({
    async start(controller) {
      const entries = [];
      let offset = 0;

      const push = (bytes) => {
        controller.enqueue(bytes);
        offset += bytes.length;
      };

      try {
        for await (const file of files) {
          const nameBytes = new TextEncoder().encode(file.name);
          const data = file.data;
          const crc = crc32(data);
          const { time, date } = dosDateTime(file.date || new Date());
          const localOffset = offset;

          const header = new Uint8Array(30 + nameBytes.length);
          const view = new DataView(header.buffer);
          view.setUint32(0, 0x04034b50, true); // local file header
          view.setUint16(4, 20, true); // version needed
          view.setUint16(6, 0, true); // flags
          view.setUint16(8, 0, true); // method: store
          view.setUint16(10, time, true);
          view.setUint16(12, date, true);
          view.setUint32(14, crc, true);
          view.setUint32(18, data.length, true); // compressed size
          view.setUint32(22, data.length, true); // uncompressed size
          view.setUint16(26, nameBytes.length, true);
          view.setUint16(28, 0, true); // extra length
          header.set(nameBytes, 30);

          push(header);
          push(data);

          entries.push({ nameBytes, crc, size: data.length, localOffset, time, date });
        }

        // Central directory — the index a reader actually uses to find files.
        const centralStart = offset;
        for (const entry of entries) {
          const record = new Uint8Array(46 + entry.nameBytes.length);
          const view = new DataView(record.buffer);
          view.setUint32(0, 0x02014b50, true);
          view.setUint16(4, 20, true); // version made by
          view.setUint16(6, 20, true); // version needed
          view.setUint16(8, 0, true);
          view.setUint16(10, 0, true);
          view.setUint16(12, entry.time, true);
          view.setUint16(14, entry.date, true);
          view.setUint32(16, entry.crc, true);
          view.setUint32(20, entry.size, true);
          view.setUint32(24, entry.size, true);
          view.setUint16(28, entry.nameBytes.length, true);
          view.setUint16(30, 0, true); // extra
          view.setUint16(32, 0, true); // comment
          view.setUint16(34, 0, true); // disk number
          view.setUint16(36, 0, true); // internal attrs
          view.setUint32(38, 0, true); // external attrs
          view.setUint32(42, entry.localOffset, true);
          record.set(entry.nameBytes, 46);
          push(record);
        }

        const end = new Uint8Array(22);
        const endView = new DataView(end.buffer);
        endView.setUint32(0, 0x06054b50, true);
        endView.setUint16(4, 0, true);
        endView.setUint16(6, 0, true);
        endView.setUint16(8, entries.length, true);
        endView.setUint16(10, entries.length, true);
        endView.setUint32(12, offset - centralStart, true);
        endView.setUint32(16, centralStart, true);
        endView.setUint16(20, 0, true);
        push(end);

        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

export function textFile(name, contents, date = new Date()) {
  return { name, data: new TextEncoder().encode(contents), date };
}
