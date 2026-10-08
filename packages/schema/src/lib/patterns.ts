/**
 * Semantic version, from the regular expression published at semver.org.
 */
export const SEMVER_PATTERN =
  '^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-((?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+([0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?$';

/**
 * Registry item name: lowercase kebab-case, as used in `ndop add <name>`.
 */
export const ITEM_NAME_PATTERN = '^[a-z0-9]+(-[a-z0-9]+)*$';

/**
 * Registry namespace, as in `@acme` from `ndop add @acme/data-table`.
 */
export const NAMESPACE_PATTERN = '^@[a-z0-9]+(-[a-z0-9]+)*$';

/**
 * A JavaScript identifier as codemods name exports and inputs: ASCII
 * letters, digits, `_` and `$`, not starting with a digit.
 */
export const IDENTIFIER_PATTERN = '^[A-Za-z_$][A-Za-z0-9_$]*$';
