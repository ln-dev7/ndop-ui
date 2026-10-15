import {
  blogPosting,
  loadPost,
  postAttributes,
  postEntries,
  readableDate,
} from './posts';

describe('blog posts', () => {
  it('keeps the day of a date the YAML parser read as a timestamp', () => {
    expect(
      postAttributes({
        title: 'A: b',
        description: 'C.',
        date: '2026-10-15T00:00:00.000Z',
        author: 'Valery Melou',
      }),
    ).toEqual({
      title: 'A: b',
      description: 'C.',
      date: '2026-10-15',
      author: 'Valery Melou',
    });
  });

  it('writes dates in words, whatever the time zone', () => {
    expect(readableDate('2026-10-15')).toBe('October 15, 2026');
  });

  it('reads every post completely, newest first', async () => {
    const entries = postEntries();
    const dates = entries.map((entry) => entry.attributes.date);
    expect(dates).toEqual([...dates].sort().reverse());
    for (const { slug } of entries) {
      const post = await loadPost(slug);
      expect(post?.attributes.title, slug).toBeTruthy();
      expect(post?.attributes.description, slug).toBeTruthy();
      expect(post?.attributes.date, slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(post?.attributes.author, slug).toBeTruthy();
      expect(post?.html, slug).toMatch(/^\s*</);
    }
    expect(await loadPost('no-such-post')).toBeUndefined();
  });

  it('describes a post as a BlogPosting with its author and image', () => {
    expect(
      blogPosting({
        slug: 'a',
        url: '/blog/a',
        attributes: {
          title: 'A',
          description: 'B.',
          date: '2026-10-15',
          author: 'Valery Melou',
        },
      }),
    ).toEqual({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: 'A',
      description: 'B.',
      datePublished: '2026-10-15',
      author: [
        {
          '@type': 'Person',
          name: 'Valery Melou',
          url: 'https://x.com/valerymelou',
        },
      ],
      image: ['https://ndop.dev/og/blog/a.jpg'],
      url: 'https://ndop.dev/blog/a',
    });
  });
});
