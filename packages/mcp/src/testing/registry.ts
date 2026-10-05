import type { Fetcher } from '@ndop/cli/registry';
import type { Metadata } from '@ndop/metadata';
import type { RegistryItem } from '@ndop/schema';

/** Where the fixture registry lives; its files are served from memory. */
export const REGISTRY_URL = 'https://registry.test/r/{name}.json';

const dialog: RegistryItem = {
  name: 'dialog',
  type: 'registry:ui',
  version: '0.2.0',
  title: 'Dialog',
  description: 'A window overlaid on the page.',
  dependencies: ['@ndop/primitives'],
  registryDependencies: ['utils'],
  files: [
    {
      path: 'ui/dialog/dialog.ts',
      type: 'registry:ui',
      target: '{ui}/dialog/dialog.ts',
      content: 'export class DialogContent {}\n',
    },
  ],
  angular: {
    minVersion: '21.0.0',
    exports: ['DialogContent'],
    zoneless: true,
    ssr: true,
  },
  ndop: { metadata: 'metadata/dialog.json', examples: ['dialog-demo'] },
};

const separator: RegistryItem = {
  name: 'separator',
  type: 'registry:ui',
  version: '0.1.0',
  title: 'Separator',
  description: 'Visually or semantically separates content.',
  files: [
    {
      path: 'ui/separator/separator.ts',
      type: 'registry:ui',
      target: '{ui}/separator/separator.ts',
      content: 'export class Separator {}\n',
    },
  ],
  angular: {
    minVersion: '21.0.0',
    exports: ['Separator'],
    zoneless: true,
    ssr: true,
  },
  ndop: { metadata: 'metadata/separator.json', examples: [] },
};

const utils: RegistryItem = {
  name: 'utils',
  type: 'registry:lib',
  version: '0.1.0',
  title: 'Utils',
  description: 'cn() and variants().',
  dependencies: ['@ndop/core'],
  files: [
    {
      path: 'lib/utils.ts',
      type: 'registry:lib',
      target: '{lib}/utils.ts',
      content: "export { cn } from '@ndop/core';\n",
    },
  ],
};

const dialogDemo: RegistryItem = {
  name: 'dialog-demo',
  type: 'registry:primitive-usage',
  version: '0.1.0',
  title: 'Edit profile dialog',
  description: 'A dialog with a form.',
  registryDependencies: ['dialog'],
  files: [
    {
      path: 'examples/dialog-demo.ts',
      type: 'registry:primitive-usage',
      target: '{ui}/examples/dialog-demo.ts',
      content: 'export class DialogDemo {}\n',
    },
  ],
  angular: {
    minVersion: '21.0.0',
    exports: ['DialogDemo'],
    zoneless: true,
    ssr: true,
  },
};

const theme: RegistryItem = {
  name: 'default',
  type: 'registry:theme',
  version: '0.1.0',
  title: 'Default',
  description: 'The default theme.',
  cssVars: {
    theme: { 'font-sans': 'Geist' },
    light: { primary: 'oklch(0.2 0 0)', 'primary-foreground': 'white' },
    dark: { primary: 'oklch(0.9 0 0)', 'primary-foreground': 'black' },
  },
};

const block: RegistryItem = {
  name: 'settings-form',
  type: 'registry:block',
  version: '0.1.0',
  title: 'Settings form',
  description: 'A profile settings form.',
  categories: ['forms'],
  registryDependencies: ['dialog', 'separator'],
  files: [
    {
      path: 'blocks/settings-form.ts',
      type: 'registry:block',
      target: '{blocks}/settings-form.ts',
      content: 'export class SettingsForm {}\n',
    },
  ],
  angular: {
    minVersion: '21.0.0',
    exports: ['SettingsForm'],
    zoneless: true,
    ssr: true,
  },
};

/**
 * Metadata for a fixture component.
 *
 * @param name - Component name.
 * @param overrides - Fields to change.
 * @returns Valid metadata.
 */
function metadata(name: string, overrides: Partial<Metadata>): Metadata {
  return {
    name,
    title: name,
    description: `The ${name}.`,
    intro: `A ${name}.`,
    agentNotes: { do: ['Use it.'], dont: ['Misuse it.'] },
    parts: [
      {
        name: 'Part',
        selector: `[nd${name}]`,
        description: 'The part.',
        inputs: [],
        models: [],
        outputs: [],
      },
    ],
    keyboard: [],
    focus: [],
    examples: [],
    ...overrides,
  };
}

/** Every file of the fixture registry, by name without `.json`. */
export const REGISTRY_FILES: Readonly<Record<string, unknown>> = {
  index: {
    name: 'test',
    homepage: 'https://registry.test',
    items: [dialog, separator, utils, dialogDemo, theme, block],
  },
  dialog,
  separator,
  utils,
  'dialog-demo': dialogDemo,
  default: theme,
  'settings-form': block,
  'metadata/dialog': metadata('dialog', {
    title: 'Dialog',
    keywords: ['modal', 'popup'],
    intro: 'Asks for a decision.',
    parts: [
      {
        name: 'DialogContent',
        selector: '[ndDialogContent]',
        description: 'The panel.',
        requires: ['[ndDialog]'],
        inputs: [],
        models: [],
        outputs: [],
      },
    ],
    examples: ['dialog-demo'],
    usage: {
      imports: "import { DialogContent } from '@/ui/dialog/dialog';",
      template: '<div ndDialogContent></div>',
    },
  }),
  'metadata/separator': metadata('separator', { title: 'Separator' }),
};

/**
 * A fetcher serving {@link REGISTRY_FILES}, recording each location asked
 * for.
 *
 * @param files - The files to serve; the fixture registry by default.
 * @returns The fetcher and the locations it was asked for.
 */
export function registryFetcher(
  files: Readonly<Record<string, unknown>> = REGISTRY_FILES,
): { fetcher: Fetcher; requests: string[] } {
  const requests: string[] = [];
  const fetcher: Fetcher = async (location) => {
    requests.push(location);
    const name = /^https:\/\/registry\.test\/r\/(.+)\.json$/.exec(
      location,
    )?.[1];
    if (name === undefined || !(name in files)) {
      throw new Error(`${location} answered 404 Not Found.`);
    }
    return JSON.stringify(files[name]);
  };
  return { fetcher, requests };
}
