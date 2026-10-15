import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { BLOG_FEED, PageMeta } from './page-meta';

describe('PageMeta', () => {
  const content = (selector: string) =>
    TestBed.inject(Meta).getTag(selector)?.content;

  it('sets the title, description and share card tags of a page', () => {
    TestBed.inject(PageMeta).set({
      title: 'Button',
      description: 'A button.',
      path: '/docs/components/button',
    });
    expect(TestBed.inject(Title).getTitle()).toBe('Button · Ndop UI');
    expect(content('name="description"')).toBe('A button.');
    expect(content('property="og:title"')).toBe('Button');
    expect(content('property="og:type"')).toBe('article');
    expect(content('property="og:url"')).toBe(
      'https://ndop.dev/docs/components/button',
    );
    expect(content('property="og:image"')).toBe(
      'https://ndop.dev/og/docs/components/button.jpg',
    );
    expect(content('property="og:image:width"')).toBe('1200');
    expect(content('property="og:image:height"')).toBe('630');
    expect(content('name="twitter:card"')).toBe('summary_large_image');
    expect(content('name="twitter:creator"')).toBe('@valerymelou');
    expect(content('name="twitter:image"')).toBe(
      'https://ndop.dev/og/docs/components/button.jpg',
    );
  });

  it('names the section in the title, and gives the home page its own', () => {
    const meta = TestBed.inject(PageMeta);
    meta.set({
      title: 'Login 01',
      section: 'Blocks',
      description: 'A login.',
      path: '/blocks/login-01',
    });
    expect(TestBed.inject(Title).getTitle()).toBe(
      'Login 01 · Blocks · Ndop UI',
    );
    meta.set({ title: 'Ndop UI', description: 'Home.', path: '/' });
    expect(TestBed.inject(Title).getTitle()).toBe('Ndop UI');
    expect(content('property="og:type"')).toBe('website');
    expect(content('property="og:url"')).toBe('https://ndop.dev/');
    expect(content('property="og:image"')).toBe(
      'https://ndop.dev/og/index.jpg',
    );
  });

  it('keeps one canonical link, at the same address as og:url', () => {
    const meta = TestBed.inject(PageMeta);
    const head = TestBed.inject(DOCUMENT).head;
    const canonicals = () =>
      [...head.querySelectorAll('link[rel="canonical"]')].map((link) =>
        link.getAttribute('href'),
      );
    meta.set({
      title: 'Button',
      description: 'A.',
      path: '/docs/components/button',
    });
    meta.set({
      title: 'Dialog',
      description: 'B.',
      path: '/docs/components/dialog',
    });
    expect(canonicals()).toEqual(['https://ndop.dev/docs/components/dialog']);
    expect(content('property="og:url"')).toBe(canonicals()[0]);
    meta.set({ title: 'Ndop UI', description: 'Home.', path: '/' });
    expect(canonicals()).toEqual(['https://ndop.dev/']);
  });

  it('writes structured data as JSON-LD, and drops it on the next page', () => {
    const meta = TestBed.inject(PageMeta);
    const head = TestBed.inject(DOCUMENT).head;
    const scripts = () =>
      head.querySelectorAll('script[type="application/ld+json"]');
    meta.set({
      title: 'Ndop UI',
      description: 'Home.',
      path: '/',
      structuredData: { '@type': 'WebSite', name: '</script>' },
    });
    meta.set({
      title: 'Ndop UI',
      description: 'Home.',
      path: '/',
      structuredData: { '@type': 'WebSite', name: 'Ndop UI' },
    });
    expect(scripts()).toHaveLength(1);
    expect(JSON.parse(scripts()[0]?.textContent ?? '')).toEqual({
      '@type': 'WebSite',
      name: 'Ndop UI',
    });
    meta.set({
      title: 'Ndop UI',
      description: 'Home.',
      path: '/',
      structuredData: { name: '</script>' },
    });
    expect(scripts()[0]?.textContent).toBe('{"name":"\\u003c/script>"}');
    meta.set({
      title: 'Button',
      description: 'A.',
      path: '/docs/components/button',
    });
    expect(scripts()).toHaveLength(0);
  });

  it('marks an excluded page noindex, without a canonical link', () => {
    const meta = TestBed.inject(PageMeta);
    const head = TestBed.inject(DOCUMENT).head;
    meta.set({
      title: 'Ndop UI',
      description: 'Home.',
      path: '/',
      structuredData: { '@type': 'WebSite' },
    });
    meta.exclude('Page not found · Ndop UI');
    expect(TestBed.inject(Title).getTitle()).toBe('Page not found · Ndop UI');
    expect(content('name="robots"')).toBe('noindex');
    expect(head.querySelector('link[rel="canonical"]')).toBeNull();
    expect(head.querySelector('script[type="application/ld+json"]')).toBeNull();
  });

  it('links the feed a page belongs to, and drops it on other pages', () => {
    const meta = TestBed.inject(PageMeta);
    const head = TestBed.inject(DOCUMENT).head;
    const feeds = () =>
      [...head.querySelectorAll('link[rel="alternate"]')].map((link) => [
        link.getAttribute('type'),
        link.getAttribute('title'),
        link.getAttribute('href'),
      ]);
    meta.set({
      title: 'Blog',
      description: 'Posts.',
      path: '/blog',
      feed: BLOG_FEED,
    });
    meta.set({
      title: 'A post',
      description: 'A post.',
      path: '/blog/a-post',
      feed: BLOG_FEED,
    });
    expect(feeds()).toEqual([
      ['application/rss+xml', 'Ndop UI blog', 'https://ndop.dev/blog/rss.xml'],
    ]);
    meta.set({
      title: 'Button',
      description: 'A.',
      path: '/docs/components/button',
    });
    expect(feeds()).toEqual([]);
  });
});
