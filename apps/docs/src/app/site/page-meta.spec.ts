import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { PageMeta } from './page-meta';

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
});
