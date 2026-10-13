/**
 * The guides' content folders, in navigation order, with their titles:
 * `src/guides/<folder>/<page>.md` is served at `/docs/<folder>/<page>`.
 * Shared by the navigation and the build's OG images, which can't load
 * the navigation's virtual modules.
 */
export const GUIDE_SECTIONS: [folder: string, title: string][] = [
  ['getting-started', 'Get started'],
  ['patterns', 'Patterns'],
];
