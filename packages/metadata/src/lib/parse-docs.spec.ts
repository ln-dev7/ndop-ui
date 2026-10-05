import { parseDocs } from './parse-docs';

describe('parseDocs', () => {
  it("reads the intro and the do and don't lists", () => {
    const markdown = `Use a dialog to ask for a decision.

It blocks the page.

## Do

- Give it a \`DialogTitle\`.
- Keep the content short,
  one task at a time.

## Don't

- Open a dialog from a dialog.
`;
    expect(parseDocs(markdown)).toEqual({
      keywords: [],
      intro: 'Use a dialog to ask for a decision.\n\nIt blocks the page.',
      do: [
        'Give it a `DialogTitle`.',
        'Keep the content short, one task at a time.',
      ],
      dont: ['Open a dialog from a dialog.'],
    });
  });

  it('leaves missing parts empty', () => {
    expect(parseDocs('## Do\n\n- One.\n')).toEqual({
      keywords: [],
      intro: '',
      do: ['One.'],
      dont: [],
    });
  });

  it('reads keywords from the front matter', () => {
    const markdown = `---
keywords: modal, popup , confirm,
---

A dialog.
`;
    expect(parseDocs(markdown)).toEqual(
      expect.objectContaining({
        keywords: ['modal', 'popup', 'confirm'],
        intro: 'A dialog.',
      }),
    );
  });
});
