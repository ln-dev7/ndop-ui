import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { deriveCatalog, type CatalogMetadata } from './catalog';
import { CATALOG } from './catalog.generated';

const workspace = join(import.meta.dirname, '../../../..');

describe('deriveCatalog', () => {
  it('sorts parts into buttons, controls, hidden parts and titled dialogs', () => {
    expect(
      deriveCatalog(
        [
          {
            name: 'switch',
            parts: [{ name: 'Switch', selector: '[ndSwitch]', role: 'switch' }],
          },
          {
            name: 'popover',
            parts: [
              {
                name: 'PopoverContent',
                selector: '[ndPopoverContent]',
                role: 'dialog',
              },
              { name: 'PopoverTitle', selector: '[ndPopoverTitle]' },
            ],
          },
          {
            name: 'textarea',
            parts: [{ name: 'Textarea', selector: 'textarea[ndTextarea]' }],
          },
          {
            name: 'select',
            parts: [
              {
                name: 'SelectContent',
                selector: '[ndSelectContent]',
                role: 'listbox',
                ariaAttributes: ['aria-labelledby'],
              },
            ],
          },
          {
            name: 'combobox',
            parts: [
              {
                name: 'ComboboxTrigger',
                selector: 'button[ndComboboxTrigger]',
                ariaAttributes: ['aria-hidden', 'tabindex'],
              },
            ],
          },
          {
            name: 'mixed',
            parts: [
              { name: 'Mixed', selector: 'button[ndMixed], div[ndMixed]' },
            ],
          },
        ],
        ['.', './switch', './internal', './package.json'],
      ),
    ).toEqual({
      buttons: ['button[ndComboboxTrigger]'],
      controls: ['[ndSwitch]', 'textarea[ndTextarea]'],
      hidden: ['button[ndComboboxTrigger]'],
      dialogs: [],
      primitiveEntryPoints: ['@ndop/primitives', '@ndop/primitives/switch'],
    });
  });
});

describe('the generated catalog', () => {
  it("matches the built registry; run nx g @ndop/workspace-plugin:eslint-catalog if it doesn't", () => {
    const folder = join(workspace, 'dist/registry/r/metadata');
    const metadata = readdirSync(folder)
      .filter((file) => file.endsWith('.json'))
      .sort()
      .map(
        (file) =>
          JSON.parse(
            readFileSync(join(folder, file), 'utf-8'),
          ) as CatalogMetadata,
      );
    const exports = Object.keys(
      JSON.parse(
        readFileSync(
          join(workspace, 'dist/packages/primitives/package.json'),
          'utf-8',
        ),
      ).exports,
    );
    expect(CATALOG).toEqual(deriveCatalog(metadata, exports));
  });
});
