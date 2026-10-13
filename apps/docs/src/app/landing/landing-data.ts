import type { KeyboardRow } from '../components/keyboard-table';

/** One step of the landing page's update demo. */
export interface LandingStep {
  /** Which step: the reader's edit, upstream's change, or the merge. */
  id: 'edit' | 'upstream' | 'merged';
  /** Its tab's label. */
  title: string;
  /** One sentence on what it shows. */
  description: string;
  /** The file's excerpt at this step, highlighted at build time. */
  html: string;
}

/** A block the landing page shows. */
export interface LandingBlock {
  /** Registry item name, such as `login-01`. */
  name: string;
  /** Display name. */
  title: string;
  /** Its gallery category's title. */
  category: string;
}

/**
 * What the landing page reads at build time (ADR-0026), from
 * `virtual:ndop/landing`.
 */
export interface LandingData {
  /** The update demo: a real three-way merge of the Button fixture. */
  merge: {
    /** The file's path in the reader's app. */
    file: string;
    /** Its three steps, in order. */
    steps: LandingStep[];
  };
  /** Tabs' keyboard map, from its `spec.md`. */
  keyboard: KeyboardRow[];
  /** Counts from the built registry, and Button's measured size. */
  stats: {
    /** `registry:ui` items. */
    components: number;
    /** `registry:block` items. */
    blocks: number;
    /** `registry:theme` items. */
    themes: number;
    /** Button's gzipped size in bytes, when the size report exists. */
    buttonGzip?: number;
  };
  /** The blocks shown, in order. */
  blocks: LandingBlock[];
  /**
   * Whether block thumbnails exist: true in a build, which photographs
   * them after prerendering; false on the dev server, which shows a
   * placeholder in their place.
   */
  thumbnails: boolean;
}
