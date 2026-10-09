/**
 * Every registry block's name, for links. Kept apart from `BLOCKS` so the
 * home page doesn't load every block's code (ADR-0022). The `block`
 * generator keeps it sorted.
 */
export const BLOCK_NAMES: readonly string[] = [];
