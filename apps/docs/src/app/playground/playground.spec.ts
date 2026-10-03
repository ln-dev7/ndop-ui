import type { PartData } from '../components/component-data';
import {
  controlsFor,
  defaultValues,
  queryFromValues,
  snippetFor,
  tokenizeTemplate,
  valuesFromQuery,
} from './playground';

/** A part shaped like the metadata gives it. */
const part: PartData = {
  name: 'PopoverContent',
  selector: '[ndPopoverContent]',
  descriptionHtml: '',
  source: 'item',
  ariaAttributes: [],
  inputs: [
    {
      name: 'side',
      type: "'bottom' | 'top'",
      default: "'bottom'",
      values: ['bottom', 'top'],
      descriptionHtml: '',
    },
    { name: 'sideOffset', type: 'number', default: '4', descriptionHtml: '' },
    { name: 'label', type: 'string | undefined', descriptionHtml: '' },
    { name: 'class', type: 'string', default: "''", descriptionHtml: '' },
    { name: 'when', type: '() => void', descriptionHtml: '' },
  ],
  models: [
    { name: 'open', type: 'boolean', default: 'false', descriptionHtml: '' },
    { name: 'modal', type: 'boolean', default: 'true', descriptionHtml: '' },
  ],
  outputs: [],
  dataAttributes: [],
};

const controls = controlsFor(part, {
  exclude: ['open'],
  ranges: { sideOffset: [0, 24, 2] },
});

describe('controlsFor', () => {
  it('maps each editable input to its control, in order', () => {
    expect(controls).toEqual([
      expect.objectContaining({
        kind: 'enum',
        name: 'side',
        options: ['bottom', 'top'],
        default: 'bottom',
      }),
      expect.objectContaining({
        kind: 'number',
        name: 'sideOffset',
        default: 4,
        min: 0,
        max: 24,
        step: 2,
      }),
      expect.objectContaining({ kind: 'string', name: 'label', default: '' }),
      expect.objectContaining({
        kind: 'boolean',
        name: 'modal',
        default: true,
      }),
    ]);
  });
});

describe('URL state', () => {
  it('keeps only changed values, and reads them back', () => {
    const values = { ...defaultValues(controls), side: 'top', modal: false };
    const query = queryFromValues(controls, values);
    expect(query.toString()).toBe('side=top&modal=false');
    expect(valuesFromQuery(controls, query)).toEqual(values);
  });

  it('ignores parameters a control cannot take', () => {
    expect(
      valuesFromQuery(
        controls,
        new URLSearchParams('side=left&sideOffset=99&modal=maybe&other=1'),
      ),
    ).toEqual(defaultValues(controls));
  });
});

describe('snippetFor', () => {
  it('writes the attributes that differ from the defaults', () => {
    const host = { snippet: '<div ndPopoverContent%attrs%>Hi</div>' };
    expect(snippetFor(host, controls, defaultValues(controls))).toBe(
      '<div ndPopoverContent>Hi</div>',
    );
    expect(
      snippetFor(host, controls, {
        ...defaultValues(controls),
        side: 'top',
        sideOffset: 8,
        label: 'Say "hi"',
        modal: false,
      }),
    ).toBe(
      '<div ndPopoverContent side="top" [sideOffset]="8" label="Say &quot;hi&quot;" [modal]="false">Hi</div>',
    );
  });
});

describe('tokenizeTemplate', () => {
  it('colors a template the way Shiki does', () => {
    const markup =
      '<button ndButton variant="outline" [disabled]="true">\n  Go\n</button>';
    const tokens = tokenizeTemplate(markup);
    expect(tokens.map((token) => token.text).join('')).toBe(markup);
    expect(tokens).toEqual([
      { text: '<', kind: 'plain' },
      { text: 'button', kind: 'tag' },
      { text: ' ', kind: 'plain' },
      { text: 'ndButton', kind: 'attribute' },
      { text: ' ', kind: 'plain' },
      { text: 'variant', kind: 'attribute' },
      { text: '=', kind: 'plain' },
      { text: '"outline"', kind: 'string' },
      { text: ' ', kind: 'plain' },
      { text: '[disabled]', kind: 'attribute' },
      { text: '=', kind: 'plain' },
      { text: '"true"', kind: 'string' },
      { text: '>\n  Go\n</', kind: 'plain' },
      { text: 'button', kind: 'tag' },
      { text: '>', kind: 'plain' },
    ]);
  });
});
