import { guideEntries, loadGuide, splitGuide } from './guides';

describe('splitGuide', () => {
  it('reads the front matter and keeps the HTML', () => {
    expect(
      splitGuide(
        '---\ntitle: Theming\ndescription: Colors: tokens and fonts.\norder: 3\n---\n<p>Text</p>\n',
      ),
    ).toEqual({
      attributes: {
        title: 'Theming',
        description: 'Colors: tokens and fonts.',
        order: 3,
      },
      html: '<p>Text</p>\n',
    });
  });

  it('reads every guide completely', async () => {
    const entries = guideEntries();
    expect(entries.length).toBeGreaterThan(0);
    for (const { section, page } of entries) {
      const guide = await loadGuide(section, page);
      expect(guide?.attributes.title, page).toBeTruthy();
      expect(guide?.attributes.description, page).toBeTruthy();
      expect(guide?.attributes.order, page).toBeGreaterThan(0);
      expect(guide?.html, page).toMatch(/^\s*<|^\s*$/);
    }
  });
});
