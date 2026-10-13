import type { ThemeVars } from '@ndop/schema/theme';
import type { ThemeSummary } from '../src/app/themes/theme-data';
// Vite bundles this file with its config, and that bundler resolves
// neither tsconfig paths nor unbuilt workspace packages, so the shared
// reader type is imported by path, as in `block-docs.ts`.
// eslint-disable-next-line @nx/enforce-module-boundaries
import type {
  BuiltItem,
  RegistryReader,
} from '../../../packages/metadata/src/lib/markdown';

/** A built theme item with the fields the gallery reads. */
type ThemeItem = BuiltItem & { author?: string; cssVars?: Partial<ThemeVars> };

/**
 * The theme gallery's themes, in the registry's order, from the built
 * registry (ADR-0023): every `registry:theme` item there is.
 *
 * @param read - Reads a built registry file.
 * @returns Every theme's summary.
 */
export function themeSummaries(read: RegistryReader): ThemeSummary[] {
  return read<{ items: BuiltItem[] }>('index.json')
    .items.filter((item) => item.type === 'registry:theme')
    .map((summary) => {
      const item = read<ThemeItem>(`${summary.name}.json`);
      return {
        name: item.name,
        title: item.title,
        description: item.description,
        ...(item.author ? { author: item.author } : {}),
        version: item.version,
        command: `npx @ndop/cli add ${item.name}`,
        vars: {
          theme: item.cssVars?.theme ?? {},
          light: item.cssVars?.light ?? {},
          dark: item.cssVars?.dark ?? {},
        },
      };
    });
}
