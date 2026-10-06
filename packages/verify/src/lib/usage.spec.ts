import type { Metadata } from '@ndop/metadata';
import { checkUsage } from './usage';
import type { ComponentDoc } from './types';

const part = (
  name: string,
  selector: string,
  extra: Partial<Metadata['parts'][number]> = {},
): Metadata['parts'][number] => ({
  name,
  selector,
  description: name,
  inputs: [],
  models: [],
  outputs: [],
  ...extra,
});

const doc = (name: string, parts: Metadata['parts']): ComponentDoc => ({
  name,
  metadata: { parts } as Metadata,
});

const dialog = doc('dialog', [
  part('NdDialog', '[ndDialog]', {
    inputs: [{ name: 'closeOnEscape', type: 'boolean', description: 'x' }],
  }),
  part('DialogContent', '[ndDialogContent]', { requires: ['[ndDialog]'] }),
  part('DialogTitle', '[ndDialogTitle]', { requires: ['[ndDialog]'] }),
]);
const button = doc('button', [
  part('Button', 'button[ndButton], a[ndButton]', {
    inputs: [
      {
        name: 'variant',
        type: "'default' | 'ghost'",
        values: ['default', 'ghost'],
        description: 'x',
      },
      { name: 'label', type: 'string', required: true, description: 'x' },
    ],
  }),
]);
const card = doc('card', [part('Card', '[ndCard]')]);

const check = (text: string) =>
  checkUsage(
    [{ text, file: 'src/app/page.ts', start: { line: 9, column: 14 } }],
    [dialog, button],
    [dialog, button, card],
  ).map(({ rule, line, column, message, fix }) => ({
    rule,
    line,
    column,
    message,
    ...(fix ? { fix } : {}),
  }));

describe('checkUsage', () => {
  it('accepts correct usage, nested through templates and blocks', () => {
    expect(
      check(
        '<ng-container ndDialog [closeOnEscape]="false"><ng-template>@if (x) {<div ndDialogContent><h2 ndDialogTitle>T</h2></div>}</ng-template></ng-container><button ndButton variant="ghost" [label]="l"><svg ndIcon="x"></svg></button>',
      ),
    ).toEqual([]);
  });

  it('reports uninstalled and unknown selectors, with fixes', () => {
    expect(check('<div ndCard></div>\n<div ndDialogTitel></div>')).toEqual([
      {
        rule: 'usage/not-installed',
        line: 10,
        column: 15,
        message: "ndCard is part of the card component, which isn't installed.",
        fix: 'npx ndop add card',
      },
      expect.objectContaining({
        rule: 'usage/unknown-selector',
        line: 11,
        column: 1,
        fix: 'Rename ndDialogTitel to ndDialogTitle.',
      }),
    ]);
  });

  it('reports missing inputs, invalid values and misspelled inputs', () => {
    expect(
      check('<button ndButton variant="primary" lable="x"></button>').map(
        (problem) => problem.rule,
      ),
    ).toEqual([
      'usage/missing-input',
      'usage/invalid-value',
      'usage/unknown-input',
    ]);
    expect(
      check('<button ndButton variant="primary" [label]="l"></button>')[0]
        ?.message,
    ).toBe(
      'variant="primary" isn\'t a Button variant. Use one of: default, ghost.',
    );
  });

  it('reports parts outside the part they must sit in', () => {
    expect(check('<h2 ndDialogTitle>Lost</h2>')).toEqual([
      {
        rule: 'usage/wrong-nesting',
        line: 10,
        column: 15,
        message: 'DialogTitle must be inside [ndDialog].',
      },
    ]);
  });

  it('ignores HTML attributes and non-Ndop directives', () => {
    expect(
      check(
        '<button ndButton type="submit" routerLink="/" formControlName="x" [label]="l"></button>',
      ),
    ).toEqual([]);
  });
});
