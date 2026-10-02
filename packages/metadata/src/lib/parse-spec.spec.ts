import { parseSpec } from './parse-spec';

const complete = `# DialogTrigger: accessibility contract

Intro.

## WAI-ARIA pattern

[Dialog (Modal)](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)

## Parts, roles and attributes

| Part | Selector | Role | ARIA attributes | Data attributes |
| ---- | -------- | ---- | --------------- | --------------- |
| DialogTrigger | \`[ndDialogTrigger]\` | | \`aria-haspopup\`, \`aria-expanded\` | \`data-state\` |
| DialogContent | \`[ndDialogContent]\` | \`dialog\` | \`aria-modal\` | \`data-state\` |

## Keyboard map

| Key | Action |
| --- | ------ |
| \`Enter\`, \`Space\` | Opens the dialog from the trigger. |
| \`Escape\` | Closes the dialog. |
| \`Shift + Tab\` | Moves focus to the previous element, wrapping inside the dialog. |

## Focus behavior

- On open or activation: focus moves to the first focusable element.
- On close or deactivation:

## RTL behavior

Nothing mirrors.
`;

describe('parseSpec', () => {
  it('parses every section of a complete contract', () => {
    expect(parseSpec(complete)).toEqual({
      title: 'DialogTrigger',
      pattern: {
        name: 'Dialog (Modal)',
        url: 'https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/',
      },
      parts: [
        {
          name: 'DialogTrigger',
          selector: '[ndDialogTrigger]',
          role: '',
          ariaAttributes: ['aria-haspopup', 'aria-expanded'],
          dataAttributes: ['data-state'],
        },
        {
          name: 'DialogContent',
          selector: '[ndDialogContent]',
          role: 'dialog',
          ariaAttributes: ['aria-modal'],
          dataAttributes: ['data-state'],
        },
      ],
      keyboard: [
        {
          keys: ['Enter', 'Space'],
          action: 'Opens the dialog from the trigger.',
        },
        { keys: ['Escape'], action: 'Closes the dialog.' },
        {
          keys: ['Shift + Tab'],
          action:
            'Moves focus to the previous element, wrapping inside the dialog.',
        },
      ],
      focus: [
        'On open or activation: focus moves to the first focusable element.',
      ],
      rtl: 'Nothing mirrors.',
    });
  });

  it('accepts a primitive with no keyboard interaction', () => {
    const [before = '', rest = ''] = complete.split('## Keyboard map');
    const after = rest.slice(rest.indexOf('## Focus behavior'));
    const spec = `${before}## Keyboard map\n\n| Key | Action |\n| --- | ------ |\n\n${after}`;
    expect(parseSpec(spec).keyboard).toEqual([]);
  });

  it('rejects a spec without a keyboard map section', () => {
    expect(() =>
      parseSpec(complete.replace('## Keyboard map', '## Keys')),
    ).toThrow('missing the "## Keyboard map" section');
  });

  it('rejects a keyboard row without a key', () => {
    expect(() =>
      parseSpec(complete.replace('| `Escape` | Closes', '| Escape | Closes')),
    ).toThrow('lists no key');
  });

  it('rejects a document without the contract title', () => {
    expect(() =>
      parseSpec(complete.replace(': accessibility contract', '')),
    ).toThrow('must start with');
  });
});
