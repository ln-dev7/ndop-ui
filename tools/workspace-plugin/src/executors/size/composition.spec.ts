// @vitest-environment node

import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'esbuild';
import { compositionFiles } from './size';

it('keeps primitive trigger code after a styled item removes its forwarding export', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ndop-composition-size-'));
  const registry = join(root, 'registry');
  try {
    await mkdir(registry);
    await mkdir(join(root, 'packages/primitives/menu/src'), {
      recursive: true,
    });
    await writeFile(
      join(registry, 'styled.ts'),
      "export const Content = 'styled-content';",
    );
    await writeFile(
      join(root, 'packages/primitives/menu/src/index.ts'),
      "export function Trigger() { return 'required-native-trigger-code'; }",
    );
    const bundle = async (entries: string[]) => {
      const files = compositionFiles(
        [{ path: 'styled.ts' }],
        entries,
        root,
        registry,
      );
      const result = await build({
        stdin: {
          contents: files
            .map(
              (file) =>
                `export * from ${JSON.stringify(join(registry, file.path))};`,
            )
            .join('\n'),
          resolveDir: registry,
        },
        bundle: true,
        write: false,
        format: 'esm',
      });
      return result.outputFiles[0]?.text ?? '';
    };
    expect(await bundle([])).not.toContain('required-native-trigger-code');
    expect(await bundle(['menu'])).toContain('required-native-trigger-code');
    expect(
      compositionFiles(
        [{ path: 'styled.ts' }],
        ['menu', 'menu'],
        root,
        registry,
      ),
    ).toHaveLength(2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
