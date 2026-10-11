/**
 * One block in the gallery (ADR-0022), from the built registry.
 */
export interface BlockSummary {
  /** Registry item name, such as `login-01`. */
  name: string;
  /** Display name. */
  title: string;
  /** One sentence. */
  description: string;
  /** Gallery category slug, the item's first `categories` entry. */
  category: string;
  /** Current version. */
  version: string;
  /** The command that installs it. */
  command: string;
  /** Where to route it, from the item's `docs`. */
  route?: string;
  /** Components it uses directly, with their docs pages. */
  components: { name: string; title: string }[];
  /** npm packages it and its dependencies install. */
  packages: string[];
}

/**
 * A block's code, loaded when its Code tab first opens.
 */
export interface BlockCode {
  /** The block's own files, highlighted, at their default paths. */
  files: { target: string; html: string }[];
}
