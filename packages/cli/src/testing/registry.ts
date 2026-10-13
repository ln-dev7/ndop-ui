import type { Metadata } from '@ndop/metadata';
import type { RegistryItem } from '@ndop/schema';
import { CliError } from '../lib/errors';
import type { Fetcher } from '../lib/registry/client';
import {
  testEnvironment,
  type TestEnvironment,
  type TestEnvironmentOptions,
} from './environment';

/** Where the fixture registry is served from; files are read from memory. */
export const REGISTRY_URL = 'mem://{name}';

/** Where the fixture `@acme` registry is served from. */
export const ACME_URL = 'mem://acme/{name}';

const angular = (exports: string[]) => ({
  minVersion: '21.0.0',
  exports,
  zoneless: true,
  ssr: true,
});

const utils: RegistryItem = {
  name: 'utils',
  type: 'registry:lib',
  version: '1.0.0',
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

const button: RegistryItem = {
  name: 'button',
  type: 'registry:ui',
  version: '1.0.0',
  title: 'Button',
  description: 'Displays a button or a component that looks like a button.',
  categories: ['inputs'],
  dependencies: ['@ndop/primitives'],
  registryDependencies: ['utils'],
  files: [
    {
      path: 'ui/button/button.ts',
      type: 'registry:ui',
      target: '{ui}/button/button.ts',
      content: 'export class Button {}\n',
    },
  ],
  angular: angular(['Button']),
  ndop: {
    metadata: 'metadata/button.json',
    examples: ['button-demo', 'button-link'],
  },
};

const dialog: RegistryItem = {
  name: 'dialog',
  type: 'registry:ui',
  version: '1.0.0',
  title: 'Dialog',
  description: 'A window overlaid on the page.',
  categories: ['overlays'],
  registryDependencies: ['button'],
  files: [
    {
      path: 'ui/dialog/dialog.ts',
      type: 'registry:ui',
      target: '{ui}/dialog/dialog.ts',
      content: 'export class Dialog {}\n',
    },
  ],
  angular: angular(['Dialog']),
  ndop: { metadata: 'metadata/dialog.json', examples: [] },
};

/**
 * An example item of the fixture registry.
 *
 * @param name - Item name.
 * @param title - Display title.
 * @param description - One sentence.
 * @returns The item.
 */
function example(
  name: string,
  title: string,
  description: string,
): RegistryItem {
  const exported = title.replace(/(?:^|\s+)(\w)/g, (_match, letter: string) =>
    letter.toUpperCase(),
  );
  return {
    name,
    type: 'registry:primitive-usage',
    version: '1.0.0',
    title,
    description,
    registryDependencies: ['button'],
    files: [
      {
        path: `examples/${name}.ts`,
        type: 'registry:primitive-usage',
        target: `{ui}/examples/${name}.ts`,
        content: `@Component({ template: '<button ndButton>Save</button>' })\nexport class ${exported} {}\n`,
      },
    ],
    angular: angular([exported]),
  };
}

const block: RegistryItem = {
  name: 'login-01',
  type: 'registry:block',
  version: '1.0.0',
  title: 'Login 01',
  description: 'A sign-in form in a card, with email and password.',
  categories: ['auth'],
  registryDependencies: ['button'],
  files: [
    {
      path: 'blocks/login-01/login-01.ts',
      type: 'registry:block',
      target: '{blocks}/login-01/login-01.ts',
      content: 'export class Login01Block {}\n',
    },
  ],
  angular: angular(['Login01Block']),
  docs: "Route to it, for example: { path: 'login', loadComponent: () => import('./blocks/login-01/login-01').then((m) => m.Login01Block) }",
};

const theme: RegistryItem = {
  name: 'default',
  type: 'registry:theme',
  version: '1.0.0',
  title: 'Default theme',
  description: "shadcn's neutral palette, in light and dark.",
  cssVars: {
    light: { primary: 'oklch(0.2 0 0)' },
    dark: { primary: 'oklch(0.9 0 0)' },
  },
};

const dataTable: RegistryItem = {
  name: 'data-table',
  type: 'registry:ui',
  version: '2.1.0',
  title: 'Data table',
  description: 'Sortable rows of data.',
  registryDependencies: ['@ndop/button'],
  angular: angular(['DataTable']),
  files: [
    {
      path: 'ui/data-table.ts',
      type: 'registry:ui',
      target: '{ui}/data-table/data-table.ts',
      content: 'export class DataTable {}\n',
    },
  ],
};

const buttonMetadata: Metadata = {
  name: 'button',
  title: 'Button',
  description: button.description,
  intro:
    'Buttons start actions.\n`ndButton` styles a native `button`, or an `a`\nwhen the action navigates.',
  agentNotes: {
    do: ['Use one default button per view.'],
    dont: ["Don't put `ndButton` on a `div`."],
  },
  pattern: {
    name: 'Button',
    url: 'https://www.w3.org/WAI/ARIA/apg/patterns/button/',
  },
  bundleSize: { gzip: 991 },
  keyboard: [
    {
      keys: ['Enter'],
      action:
        'Activates the button, or follows the link; does nothing while disabled.',
    },
    { keys: ['Space'], action: 'Activates a `button`.' },
  ],
  focus: ['A disabled `button` is removed from the tab order.'],
  rtl: 'Nothing mirrors.',
  examples: ['button-demo', 'button-link'],
  usage: {
    imports: "import { Button } from '@/ui/button/button';",
    template: '<button ndButton>Save</button>',
  },
  parts: [
    {
      name: 'Button',
      selector: 'button[ndButton], a[ndButton]',
      description:
        'Styled button for a native `button` or an `a`, with\nthe {@link NdButton} behavior.',
      source: 'item',
      role: 'native (button / link)',
      inputs: [
        {
          name: 'variant',
          type: "'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'",
          default: "'default'",
          description: 'Visual style.',
        },
        {
          name: 'disabled',
          type: 'boolean',
          default: 'false',
          description: 'Whether the button or link is disabled.',
        },
      ],
      models: [],
      outputs: [],
      dataAttributes: [
        { name: 'data-slot', values: ['button'] },
        { name: 'data-variant' },
      ],
    },
  ],
};

const dialogMetadata: Metadata = {
  name: 'dialog',
  title: 'Dialog',
  description: dialog.description,
  intro: 'Asks for a decision.',
  agentNotes: { do: ['Label it.'], dont: ['Nest dialogs.'] },
  keyboard: [{ keys: ['Escape'], action: 'Closes the dialog.' }],
  focus: [],
  examples: [],
  parts: [
    {
      name: 'DialogTrigger',
      selector: '[ndDialogTrigger]',
      description: 'The button that opens its dialog.',
      requires: ['[ndDialog]'],
      inputs: [],
      models: [{ name: 'open', type: 'boolean', description: 'Open state.' }],
      outputs: [
        { name: 'closed', type: 'void', description: 'After it closes.' },
      ],
    },
  ],
};

/**
 * An item as `index.json` lists it: without its files' content.
 *
 * @param item - A built item.
 * @returns Its index entry.
 */
function entry(item: RegistryItem): RegistryItem {
  return {
    ...item,
    ...(item.files
      ? {
          files: item.files.map(({ path, type, target }) => ({
            path,
            type,
            target,
          })),
        }
      : {}),
  };
}

const ndopItems = [
  utils,
  button,
  dialog,
  example('button-demo', 'Button demo', 'The six button variants.'),
  example('button-link', 'Button link', 'A link that looks like a button.'),
  block,
  theme,
];

/**
 * Every file of the fixture registries, by name without `.json`: Ndop's,
 * with `index`, items and `metadata/<name>`, and `@acme`'s under `acme/`.
 */
export const REGISTRY_FILES: Readonly<Record<string, unknown>> = {
  index: {
    name: 'ndop',
    homepage: 'https://ndop.dev',
    items: ndopItems.map(entry),
  },
  ...Object.fromEntries(ndopItems.map((item) => [item.name, item])),
  'metadata/button': buttonMetadata,
  'metadata/dialog': dialogMetadata,
  'acme/index': {
    name: 'acme',
    homepage: 'https://ui.acme.dev',
    items: [entry(dataTable)],
  },
  'acme/data-table': dataTable,
};

/**
 * A fetcher serving {@link REGISTRY_FILES} at `mem://<name>`, recording
 * each location asked for.
 *
 * @param files - The files to serve; the fixture registries by default.
 * @returns The fetcher and the locations it was asked for.
 */
export function registryFetcher(
  files: Readonly<Record<string, unknown>> = REGISTRY_FILES,
): { fetcher: Fetcher; requests: string[] } {
  const requests: string[] = [];
  const fetcher: Fetcher = async (location) => {
    requests.push(location);
    const name = location.replace(/^mem:\/\//, '');
    if (!(name in files)) {
      throw new CliError(`${location} answered 404 Not Found.`);
    }
    return JSON.stringify(files[name]);
  };
  return { fetcher, requests };
}

/**
 * A test environment whose registries are the fixture ones: Ndop's as the
 * default, and `@acme`'s for projects that list it in `ndop.json`.
 *
 * @param files - Project files; none, outside a project, by default.
 * @param options - As {@link testEnvironment} takes them.
 * @returns The environment.
 */
export function registryEnvironment(
  files: Record<string, string> = {},
  options: TestEnvironmentOptions = {},
): TestEnvironment {
  const { fetcher } = registryFetcher();
  return {
    ...testEnvironment(files, options),
    fetcher: () => fetcher,
  };
}
