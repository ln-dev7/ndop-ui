/**
 * Every registry block's name, for links. Kept apart from `BLOCKS` so the
 * home page doesn't load every block's code (ADR-0022). The `block`
 * generator keeps it sorted.
 */
export const BLOCK_NAMES: readonly string[] = [
  'dashboard-01',
  'dashboard-02',
  'data-table-01',
  'hero-01',
  'login-01',
  'login-02',
  'pricing-01',
  'settings-01',
  'settings-02',
  'sidebar-01',
  'sidebar-02',
  'signup-01',
];
