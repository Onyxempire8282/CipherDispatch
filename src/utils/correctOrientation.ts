/**
 * Reads EXIF orientation from a JPEG blob and re-draws the image
 * onto a canvas with the correct transform so the pixels are upright.
 * Returns a new JPEG Blob with orientation baked into the pixels
 * (no EXIF orientation tag needed).
 *
 * For non-JPEG or blobs without EXIF data, returns the original blob unchanged.
 */

function readExifOrientation(buffer: ArrayBuffer): number {
  const view = new DataView(buffer);
  // Must start with JPEG SOI marker
  if (view.getUint16(0) !== 0xFFD8) return 1;

  let offset = 2;
  while (offset < view.byteLength - 2) {
    const marker = view.getUint16(offset);
    offset += 2;

    // SOS marker — stop scanning
    if (marker === 0xFFDA) break;

    const length = view.getUint16(offset);

    // APP1 marker (EXIF)
    if (marker === 0xFFE1) {
      // Check for "Exif\0\0"
      if (view.getUint32(offset + 2) !== 0x45786966) {
        offset += length;
        continue;
      }

      const tiffStart = offset + 8; // after marker length + "Exif\0\0"
      const endian = view.getUint16(tiffStart);
      const littleEndian = endian === 0x4949;

      const ifdOffset = view.getUint32(tiffStart + 4, littleEndian);
      const numEntries = view.getUint16(tiffStart + ifdOffset, littleEndian);

      for (let i = 0; i < numEntries; i++) {
        const entryOffset = tiffStart + ifdOffset + 2 + i * 12;
        if (entryOffset + 12 > view.byteLength) break;
        const tag = view.getUint16(entryOffset, littleEndian);
        if (tag === 0x0112) {
          // Orientation tag
          return view.getUint16(entryOffset + 8, littleEndian);
        }
      }
      return 1; // EXIF found but no orientation tag
    }

    offset += length;
  }

  return 1; // no EXIF
}

export async function correctOrientation(blob: Blob): Promise<Blob> {
  // Only process JPEG
  if (blob.type && !blob.type.includes('jpeg') && !blob.type.includes('jpg')) {
    // For non-JPEG (e.g. PNG from canvas), try to detect from bytes
    const header = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
    if (header[0] !== 0xFF || header[1] !== 0xD8) {
      return blob; // not a JPEG, return as-is
    }
  }

  const buffer = await blob.arrayBuffer();
  const orientation = readExifOrientation(buffer);

  // Orientation 1 = normal, no rotation needed
  if (orientation <= 1 || orientation > 8) return blob;

  // Load image
  const img = await createImageBitmap(blob);
  const { width, height } = img;

  // Determine canvas dimensions and transform
  const swap = orientation >= 5; // orientations 5-8 swap width/height
  const cw = swap ? height : width;
  const ch = swap ? width : height;

  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d')!;

  // Apply the correct transform for each EXIF orientation
  switch (orientation) {
    case 2: ctx.setTransform(-1, 0, 0, 1, cw, 0); break;          // flip H
    case 3: ctx.setTransform(-1, 0, 0, -1, cw, ch); break;         // rotate 180
    case 4: ctx.setTransform(1, 0, 0, -1, 0, ch); break;           // flip V
    case 5: ctx.setTransform(0, 1, 1, 0, 0, 0); break;             // transpose
    case 6: ctx.setTransform(0, 1, -1, 0, ch, 0); break;           // rotate 90 CW
    case 7: ctx.setTransform(0, -1, -1, 0, ch, cw); break;         // transverse
    case 8: ctx.setTransform(0, -1, 1, 0, 0, cw); break;           // rotate 90 CCW
  }

  ctx.drawImage(img, 0, 0);
  img.close();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))),
      'image/jpeg',
      0.92
    );
  });
}
