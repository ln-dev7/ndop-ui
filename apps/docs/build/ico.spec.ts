import { icoFromPngs } from './ico';

describe('icoFromPngs', () => {
  const images = [
    { size: 16, png: new Uint8Array([1, 2, 3]) },
    { size: 32, png: new Uint8Array([4, 5]) },
    { size: 256, png: new Uint8Array([6]) },
  ];
  const ico = icoFromPngs(images);
  const view = new DataView(ico.buffer);

  it('writes an icon header with the image count', () => {
    expect(view.getUint16(0, true)).toBe(0);
    expect(view.getUint16(2, true)).toBe(1);
    expect(view.getUint16(4, true)).toBe(3);
  });

  it('describes each image in a directory entry', () => {
    const entries = images.map((_, index) => {
      const at = 6 + 16 * index;
      return {
        width: view.getUint8(at),
        height: view.getUint8(at + 1),
        colors: view.getUint8(at + 2),
        planes: view.getUint16(at + 4, true),
        bits: view.getUint16(at + 6, true),
        bytes: view.getUint32(at + 8, true),
        offset: view.getUint32(at + 12, true),
      };
    });
    expect(entries).toEqual([
      {
        width: 16,
        height: 16,
        colors: 0,
        planes: 1,
        bits: 32,
        bytes: 3,
        offset: 54,
      },
      {
        width: 32,
        height: 32,
        colors: 0,
        planes: 1,
        bits: 32,
        bytes: 2,
        offset: 57,
      },
      // 256 is written as 0.
      {
        width: 0,
        height: 0,
        colors: 0,
        planes: 1,
        bits: 32,
        bytes: 1,
        offset: 59,
      },
    ]);
  });

  it('appends the PNGs as they are, in order', () => {
    expect(ico.length).toBe(6 + 16 * 3 + 6);
    expect([...ico.slice(54)]).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('refuses sizes the format cannot hold', () => {
    expect(() => icoFromPngs([{ size: 512, png: new Uint8Array() }])).toThrow(
      RangeError,
    );
  });
});
