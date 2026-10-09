import { readFileSync } from 'fs';
import { join } from 'path';
import { BLOCK_CATEGORIES, COMPONENT_GROUPS } from '../categories';

const items = (
  JSON.parse(
    readFileSync(join(import.meta.dirname, '../registry.json'), 'utf-8'),
  ) as { items: { name: string; type: string; categories?: string[] }[] }
).items;

describe('categories', () => {
  it("puts every component in one of the docs' groups", () => {
    const groups: string[] = COMPONENT_GROUPS.map((group) => group.slug);
    const wrong = items
      .filter((item) => item.type === 'registry:ui')
      .filter((item) => !groups.includes(item.categories?.[0] ?? ''))
      .map((item) => item.name);
    expect(wrong).toEqual([]);
  });

  it('puts every block in one of the gallery categories', () => {
    const categories: string[] = BLOCK_CATEGORIES.map((c) => c.slug);
    const wrong = items
      .filter((item) => item.type === 'registry:block')
      .filter((item) => !categories.includes(item.categories?.[0] ?? ''))
      .map((item) => item.name);
    expect(wrong).toEqual([]);
  });
});
