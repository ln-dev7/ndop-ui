import type { PreviewSnapshots } from './changelog-data';
import { previewUpdate } from './update-preview-merge';

const TARGET = '{ui}/sizes/sizes.ts';
const V1 = "export const sizes = {\n  sm: 'h-8',\n  lg: 'h-10',\n};\n";
const V2 =
  "// Sizes.\nexport const sizes = {\n  sm: 'h-8',\n  lg: 'h-11',\n};\n";
const snapshots: PreviewSnapshots = {
  versions: [
    { version: '0.2.0', files: [{ target: TARGET, content: V2 }] },
    { version: '0.1.0', files: [{ target: TARGET, content: V1 }] },
  ],
};
const request = {
  snapshots,
  installed: '0.1.0',
  latest: '0.2.0',
  target: TARGET,
};

describe('previewUpdate', () => {
  it("merges upstream's changes into the user's edits", async () => {
    const result = await previewUpdate({
      ...request,
      local: `${V1}// Mine.\n`,
    });
    expect(result).toEqual(
      expect.objectContaining({
        status: 'merged',
        content: `${V2}// Mine.\n`,
        conflictLines: [],
      }),
    );
  });

  it('replaces a file the user never edited, and lists what changes', async () => {
    const result = await previewUpdate({ ...request, local: V1 });
    expect(result).toEqual(
      expect.objectContaining({
        status: 'replaced',
        changes: [
          { line: 1, removed: [], added: ['// Sizes.'] },
          { line: 3, removed: ["  lg: 'h-10',"], added: ["  lg: 'h-11',"] },
        ],
      }),
    );
  });

  it('reports conflicts with their lines', async () => {
    const result = await previewUpdate({
      ...request,
      local: V1.replace("'h-10'", "'h-12'"),
    });
    expect(result).toEqual(
      expect.objectContaining({ status: 'conflict', conflictLines: [4] }),
    );
  });

  it('formats both versions the way the user says their project does', async () => {
    const doubled = V1.replace(/'/g, '"');
    const result = await previewUpdate({
      ...request,
      local: doubled,
      format: { singleQuote: false, printWidth: 80 },
    });
    expect(result).toEqual(expect.objectContaining({ status: 'replaced' }));
    expect(await previewUpdate({ ...request, local: doubled })).toEqual(
      expect.objectContaining({ status: 'conflict' }),
    );
  });

  it('explains what it cannot preview', async () => {
    expect(await previewUpdate({ ...request, local: ' ' })).toEqual({
      error: 'Paste your copy of the file first.',
    });
    expect(
      await previewUpdate({ ...request, target: '{ui}/x.ts', local: V1 }),
    ).toEqual({ error: "{ui}/x.ts isn't part of 0.1.0." });
  });
});
