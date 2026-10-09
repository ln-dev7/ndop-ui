import { checkSizes, formatSizes } from './size';

describe('size executor', () => {
  const rows = checkSizes(
    new Map([
      ['button', { gzip: 1500, withCdk: 1500 }],
      ['dialog', { gzip: 9000, withCdk: 19000 }],
      ['card', { gzip: 300, withCdk: 300 }],
    ]),
    { default: 4000, items: { button: 2000, dialog: 8000 } },
  );

  it("budgets each item's own code, by name or by default", () => {
    expect(rows).toEqual([
      { name: 'button', gzip: 1500, withCdk: 1500, budget: 2000, over: false },
      { name: 'dialog', gzip: 9000, withCdk: 19000, budget: 8000, over: true },
      { name: 'card', gzip: 300, withCdk: 300, budget: 4000, over: false },
    ]);
  });

  it('prints a table and names what is over', () => {
    const report = formatSizes(rows);
    expect(report).toContain('dialog  9.00 kB   8.00 kB   19.00 kB  over');
    expect(report).toContain('Over budget: dialog.');
  });

  it('says when everything fits', () => {
    expect(formatSizes(rows.filter((row) => !row.over))).toContain(
      'Every item is within its budget.',
    );
  });
});
