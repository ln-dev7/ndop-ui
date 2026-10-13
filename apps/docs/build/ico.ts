/** One image of an icon: a square PNG and its side in pixels. */
export interface IcoImage {
  /** Width and height, in pixels; 1 to 256. */
  size: number;
  /** The PNG file. */
  png: Uint8Array;
}

/** Bytes of the ICO header (`ICONDIR`). */
const HEADER = 6;
/** Bytes of each directory entry (`ICONDIRENTRY`). */
const ENTRY = 16;

/**
 * Packs PNG images into one `.ico` file, as browsers without SVG favicons
 * read it: a header, a directory entry per image, then the PNGs as they
 * are. Every browser that reads ICO files reads PNG entries, so nothing is
 * converted to bitmaps.
 *
 * @param images - The images, usually 16, 32 and 48 px.
 * @returns The ICO file.
 */
export function icoFromPngs(images: readonly IcoImage[]): Uint8Array {
  const directory = HEADER + ENTRY * images.length;
  const total = images.reduce((sum, image) => sum + image.png.length, 0);
  const file = new Uint8Array(directory + total);
  const view = new DataView(file.buffer);
  // Reserved, then type 1 (icon), then the image count; little-endian, as
  // every field of the format.
  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, images.length, true);
  let offset = directory;
  images.forEach((image, index) => {
    if (!Number.isInteger(image.size) || image.size < 1 || image.size > 256) {
      throw new RangeError(`An ICO image is 1 to 256 px, not ${image.size}.`);
    }
    const entry = HEADER + ENTRY * index;
    // A side of 256 is written as 0, since the field is a single byte.
    view.setUint8(entry, image.size % 256);
    view.setUint8(entry + 1, image.size % 256);
    // No palette, a reserved byte, one color plane, 32 bits per pixel.
    view.setUint8(entry + 2, 0);
    view.setUint8(entry + 3, 0);
    view.setUint16(entry + 4, 1, true);
    view.setUint16(entry + 6, 32, true);
    view.setUint32(entry + 8, image.png.length, true);
    view.setUint32(entry + 12, offset, true);
    file.set(image.png, offset);
    offset += image.png.length;
  });
  return file;
}
