import { parseSpec } from '@ndop/metadata';
import {
  test,
  type PlaywrightTestArgs,
  type PlaywrightTestOptions,
  type PlaywrightWorkerArgs,
  type PlaywrightWorkerOptions,
} from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * A keyboard test for one key of a primitive's keyboard map.
 */
export type KeyTest = (
  fixtures: PlaywrightTestArgs &
    PlaywrightTestOptions &
    PlaywrightWorkerArgs &
    PlaywrightWorkerOptions,
) => Promise<void>;

/**
 * Declares one Playwright test per key in a primitive's `spec.md` keyboard
 * map, and one more that fails when the map and the supplied tests differ,
 * so keyboard behavior is always tested against the written contract
 * (RFC-0001, "Accessibility contract per primitive").
 *
 * @param primitive - Primitive folder name, such as `dialog`.
 * @param tests - One test per key, keyed exactly as `spec.md` writes it.
 */
export function keyboardContract(
  primitive: string,
  tests: Record<string, KeyTest>,
): void {
  const spec = parseSpec(
    readFileSync(
      join(
        import.meta.dirname,
        '../../../packages/primitives',
        primitive,
        'spec.md',
      ),
      'utf-8',
    ),
  );
  const keys = spec.keyboard.flatMap((row) => row.keys);

  test.describe(`${spec.title} keyboard map (spec.md)`, () => {
    test('has a test for every key, and only those', () => {
      if ([...keys].sort().join('|') !== Object.keys(tests).sort().join('|')) {
        throw new Error(
          `spec.md keys [${keys.join(', ')}] differ from tested keys [${Object.keys(tests).join(', ')}].`,
        );
      }
    });

    for (const row of spec.keyboard) {
      for (const key of row.keys) {
        const run = tests[key];
        if (run) {
          test(`${key}: ${row.action}`, run);
        }
      }
    }
  });
}
