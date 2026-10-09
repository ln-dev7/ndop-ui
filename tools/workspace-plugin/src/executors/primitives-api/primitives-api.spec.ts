import { summaryOf } from './primitives-api';

describe('summaryOf', () => {
  it("titles a primitive from its spec's heading and names its pattern", () => {
    expect(
      summaryOf(
        {
          name: 'dialog',
          importPath: '@ndop/primitives/dialog',
          pattern: { name: 'Dialog (Modal)', url: 'https://example.com' },
          parts: [],
          keyboard: [],
          focus: [],
        },
        '# Dialog: accessibility contract\n\nWritten first.\n',
      ),
    ).toEqual({
      name: 'dialog',
      title: 'Dialog',
      description:
        'Headless Dialog: the behavior, keyboard support and ARIA of the WAI-ARIA Dialog (Modal) pattern, with no styles.',
    });
  });

  it('falls back to the folder name without a heading or pattern', () => {
    expect(
      summaryOf(
        {
          name: 'thing',
          importPath: '@ndop/primitives/thing',
          parts: [],
          keyboard: [],
          focus: [],
        },
        'No heading.\n',
      ).description,
    ).toBe(
      'Headless thing: the behavior, keyboard support and ARIA of its pattern, with no styles.',
    );
  });
});
