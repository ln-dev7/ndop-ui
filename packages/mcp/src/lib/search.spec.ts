import type { Metadata } from '@ndop/metadata';
import { searchComponents, type SearchDocument } from './search';

const document = (
  name: string,
  title: string,
  description: string,
  metadata?: Partial<Metadata>,
): SearchDocument => ({
  name,
  title,
  description,
  ...(metadata ? { metadata: metadata as Metadata } : {}),
});

const documents = [
  document('dialog', 'Dialog', 'A window over the page.', {
    keywords: ['confirmation'],
    intro: 'Asks for a decision.',
    agentNotes: { do: ['Give it a title.'], dont: [] },
    parts: [],
  }),
  document('alert-dialog', 'Alert Dialog', 'Interrupts with an alert.'),
  document('tooltip', 'Tooltip', 'Shows a hint on hover.'),
  document('separator', 'Separator', 'Separates content.'),
];

const names = (query: string) =>
  searchComponents(documents, query, 8).map((hit) => hit.name);

describe('searchComponents', () => {
  it('ranks an exact name above a word in a title', () => {
    expect(names('dialog')).toEqual(['dialog', 'alert-dialog']);
    expect(searchComponents(documents, 'dialog', 8)[0]?.score).toBe(100);
  });

  it('finds components by keyword and by synonym', () => {
    expect(names('confirmation')).toEqual(['dialog']);
    expect(names('divider')).toEqual(['separator']);
    // Equal scores sort by title.
    expect(names('modal')).toEqual(['alert-dialog', 'dialog']);
  });

  it('finds words in descriptions, intros and notes', () => {
    expect(names('decision')).toEqual(['dialog']);
    expect(names('hover')).toEqual(['tooltip']);
  });

  it('ignores stop words and words that match nothing', () => {
    expect(names('a tooltip for my zebra icon')).toEqual(['tooltip']);
  });

  it('returns nothing when no word matches', () => {
    expect(names('carousel')).toEqual([]);
  });

  it('keeps to the limit', () => {
    expect(searchComponents(documents, 'dialog', 1)).toHaveLength(1);
  });
});
