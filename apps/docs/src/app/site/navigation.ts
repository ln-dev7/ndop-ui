import { computed, Injectable } from '@angular/core';
import { guideEntries } from './guides';

/**
 * One link in the docs navigation.
 */
export interface NavLink {
  /** Label. */
  title: string;
  /** Absolute route. */
  url: string;
  /** Meta description of the target page. */
  description: string;
}

/**
 * A titled group of links.
 */
export interface NavSection {
  /** Section title. */
  title: string;
  /** Links, in reading order. */
  links: NavLink[];
}

/** Content folders shown in the navigation, in order, with their titles. */
const SECTIONS: [folder: string, title: string][] = [
  ['getting-started', 'Get started'],
];

/**
 * The docs navigation, built from the front matter of the guides in
 * `src/guides/<section>/<page>.md`. Every page is reachable from it, which
 * is how prerendering discovers the whole site.
 */
@Injectable({ providedIn: 'root' })
export class Navigation {
  private readonly guides = guideEntries();

  /** Sections with their links. */
  readonly sections = computed<NavSection[]>(() =>
    SECTIONS.map(([folder, title]) => ({
      title,
      links: this.guides
        .filter((guide) => guide.section === folder)
        .sort((a, b) => a.attributes.order - b.attributes.order)
        .map((guide) => ({
          title: guide.attributes.title,
          description: guide.attributes.description,
          url: `/docs/${folder}/${guide.page}`,
        })),
    })),
  );

  /** Every link, in reading order, for previous and next. */
  readonly links = computed(() =>
    this.sections().flatMap((section) => section.links),
  );
}
