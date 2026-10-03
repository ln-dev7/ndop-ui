/**
 * Everything a component page shows, prepared at build time from the
 * registry and its metadata (ADR-0007, ADR-0016). Every `…Html` field is
 * already rendered: Markdown to HTML, code highlighted by Shiki.
 */
export interface ComponentPageData {
  /** Registry item name, such as `dialog`. */
  name: string;
  /** Display name. */
  title: string;
  /** One sentence. */
  description: string;
  /** Current version. */
  version: string;
  /** Every released version, newest first. */
  versions: string[];
  /** The WAI-ARIA pattern implemented. */
  pattern?: { name: string; url: string };
  /** Whether the item renders on the server. */
  ssr: boolean;
  /** Whether the item works without zone.js. */
  zoneless: boolean;
  /** The item's own code, minified and gzipped, in bytes. */
  bundleSize?: number;
  /** Introduction, from `docs.md`. */
  introHtml: string;
  /** How to install it. */
  install: {
    /** `npx ndop add <name>`, as a command block. */
    cliHtml: string;
    /** npm packages to install by hand, as a command block, if any. */
    dependenciesHtml?: string;
    /** Files to copy by hand: this item's and its registry dependencies'. */
    files: { target: string; html: string }[];
  };
  /** The smallest correct usage, from the main example. */
  usage: { importsHtml: string; templateHtml: string };
  /** Examples, the main one first. */
  examples: ExampleData[];
  /** Keyboard map, focus rules and RTL notes, from `spec.md`. */
  accessibility: {
    keyboard: { keys: string[]; actionHtml: string }[];
    focusHtml: string[];
    rtlHtml?: string;
  };
  /** API reference, one entry per part. */
  parts: PartData[];
  /** Do and don't guidance. */
  agentNotes: { doHtml: string[]; dontHtml: string[] };
  /** External links. */
  links: { source: string; issue: string; edit: string };
  /** Date of the last change to the item, `YYYY-MM-DD`. */
  lastUpdated?: string;
}

/**
 * One example on a component page.
 */
export interface ExampleData {
  /** Registry item name, such as `dialog-demo`. */
  name: string;
  /** Display title. */
  title: string;
  /** When to use it. */
  descriptionHtml: string;
  /** Its full source, highlighted, attached under the preview. */
  codeHtml: string;
}

/**
 * One input, model or output in the API reference.
 */
export interface MemberData {
  /** Public name. */
  name: string;
  /** Type, as source text. */
  type: string;
  /** Default, as source text. */
  default?: string;
  /** Whether it must be set. */
  required?: boolean;
  /** Description. */
  descriptionHtml: string;
}

/**
 * One part (directive) in the API reference.
 */
export interface PartData {
  /** Class name. */
  name: string;
  /** Selector. */
  selector: string;
  /** Description. */
  descriptionHtml: string;
  /** `item`, or the primitive entry point it comes from. */
  source: string;
  /** ARIA role, from `spec.md`. */
  role?: string;
  /** ARIA attributes it manages. */
  ariaAttributes: string[];
  /** Inputs. */
  inputs: MemberData[];
  /** Two-way bindable models. */
  models: MemberData[];
  /** Outputs. */
  outputs: MemberData[];
  /** Data attributes, with their values when known. */
  dataAttributes: { name: string; values?: string[] }[];
}

/**
 * A component in the navigation and search.
 */
export interface ComponentSummary {
  /** Registry item name. */
  name: string;
  /** Display name. */
  title: string;
  /** One sentence. */
  description: string;
  /** Its examples, the main one first. */
  examples: string[];
}
