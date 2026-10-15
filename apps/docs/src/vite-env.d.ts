/// <reference types="vite/client" />

/** Build-time settings the docs read (`envPrefix` in vite.config.ts). */
interface ImportMetaEnv {
  /** The Algolia application of the DocSearch index (ADR-0008). */
  readonly DOCSEARCH_APP_ID?: string;
  /** DocSearch's search-only key. */
  readonly DOCSEARCH_API_KEY?: string;
  /** The DocSearch index. */
  readonly DOCSEARCH_INDEX_NAME?: string;
}
