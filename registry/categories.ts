/**
 * The docs groups of components, in nav order, as RFC-0001's catalog
 * groups them. A `registry:ui` item's first category is its group
 * (ADR-0021). The `styled-item` generator offers the same slugs.
 */
export const COMPONENT_GROUPS = [
  { slug: 'inputs', title: 'Inputs' },
  { slug: 'overlays', title: 'Overlays' },
  { slug: 'navigation', title: 'Navigation' },
  { slug: 'data-display', title: 'Data display' },
  { slug: 'feedback', title: 'Feedback' },
  { slug: 'layout', title: 'Layout' },
] as const;

/**
 * The blocks gallery's categories, in order. A `registry:block` item's
 * first category is one of them (ADR-0022). The `block` generator offers
 * the same slugs.
 */
export const BLOCK_CATEGORIES = [
  { slug: 'auth', title: 'Authentication' },
  { slug: 'dashboard', title: 'Dashboards' },
  { slug: 'settings', title: 'Settings' },
  { slug: 'data-table', title: 'Data tables' },
  { slug: 'sidebar', title: 'Sidebars' },
  { slug: 'marketing', title: 'Marketing' },
] as const;
