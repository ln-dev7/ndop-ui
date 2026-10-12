/**
 * Compares two semantic versions by precedence, as semver.org defines it:
 * major, minor and patch numerically, a pre-release below its release, and
 * build metadata ignored.
 *
 * @param a - A valid semantic version.
 * @param b - Another.
 * @returns A negative number when `a` comes first, positive when `b` does,
 *   and `0` when they have the same precedence.
 *
 * @example
 * ```ts
 * ['0.2.0', '0.1.10', '0.2.0-rc.1'].sort(compareVersions);
 * // ['0.1.10', '0.2.0-rc.1', '0.2.0']
 * ```
 */
export function compareVersions(a: string, b: string): number {
  const [coreA = '', preA] = a.split('+')[0]?.split(/-(.*)/s) ?? [];
  const [coreB = '', preB] = b.split('+')[0]?.split(/-(.*)/s) ?? [];
  const numbersA = coreA.split('.').map(Number);
  const numbersB = coreB.split('.').map(Number);
  for (let index = 0; index < 3; index++) {
    const difference = (numbersA[index] ?? 0) - (numbersB[index] ?? 0);
    if (difference !== 0) return difference;
  }
  if (preA === undefined || preB === undefined) {
    return preA === preB ? 0 : preA === undefined ? 1 : -1;
  }
  const partsA = preA.split('.');
  const partsB = preB.split('.');
  for (let index = 0; index < Math.max(partsA.length, partsB.length); index++) {
    const partA = partsA[index];
    const partB = partsB[index];
    if (partA === undefined) return -1;
    if (partB === undefined) return 1;
    const numericA = /^\d+$/.test(partA);
    const numericB = /^\d+$/.test(partB);
    if (numericA && numericB) {
      const difference = Number(partA) - Number(partB);
      if (difference !== 0) return difference;
    } else if (numericA !== numericB) {
      return numericA ? -1 : 1;
    } else if (partA !== partB) {
      return partA < partB ? -1 : 1;
    }
  }
  return 0;
}

/**
 * Whether a version is in an npm range. It covers what `package.json`
 * files and registry items use: exact and partial versions, `x` wildcards,
 * `^`, `~`, `>`, `>=`, `<`, `<=`, hyphen ranges, comparator sets and `||`.
 * Pre-releases are compared by precedence, without npm's rule that only
 * a range naming a pre-release admits one.
 *
 * @param version - A valid semantic version.
 * @param range - An npm range.
 * @returns Whether it matches, or `undefined` for a spec that isn't a
 *   range, such as a tag, a path or `workspace:*`.
 *
 * @example
 * ```ts
 * satisfies('22.13.1', '>=22.12.0'); // true
 * satisfies('1.49.0', '^1.50.0'); // false
 * satisfies('1.0.0', 'workspace:*'); // undefined
 * ```
 */
export function satisfies(version: string, range: string): boolean | undefined {
  const sets = range.split('||').map((set) =>
    set
      .trim()
      .replace(/^(\S+)\s+-\s+(\S+)$/, '>=$1 <=$2')
      .split(/\s+/)
      .filter(Boolean),
  );
  const tests = sets.map((set) => set.map(comparator));
  if (tests.some((set) => set.some((test) => test === undefined))) {
    return undefined;
  }
  return tests.some((set) =>
    set.every((test) => (test as (version: string) => boolean)(version)),
  );
}

/**
 * Turns one comparator into a test.
 *
 * @param text - Such as `^1.2.0`, `>=22.12`, `1.x` or `*`.
 * @returns The test, or `undefined` when it isn't a comparator.
 */
function comparator(text: string): ((version: string) => boolean) | undefined {
  const match =
    /^(\^|~|>=|<=|>|<|=)?v?(\d+|[xX*])(?:\.(\d+|[xX*]))?(?:\.(\d+|[xX*]))?(-[0-9A-Za-z.-]+)?$/.exec(
      text,
    );
  if (text === '*' || text === 'x' || text === 'X') return () => true;
  if (!match) return undefined;
  const [, operator = '', ...rest] = match;
  const parts = rest
    .slice(0, 3)
    .map((part) =>
      part === undefined || /^[xX*]$/.test(part) ? undefined : Number(part),
    );
  const [major, minor, patch] = parts;
  const pre = rest[3] ?? '';
  if (major === undefined) return () => true;
  const floor = `${major}.${minor ?? 0}.${patch ?? 0}${pre}`;
  const at = (op: (difference: number) => boolean, bound: string) => {
    return (version: string) => op(compareVersions(version, bound));
  };
  const between = (ceiling: string) => {
    const above = at((difference) => difference >= 0, floor);
    const below = at((difference) => difference < 0, ceiling);
    return (version: string) => above(version) && below(version);
  };
  switch (operator) {
    case '^':
      return between(
        major > 0 || minor === undefined
          ? `${major + 1}.0.0-0`
          : minor > 0 || patch === undefined
            ? `0.${minor + 1}.0-0`
            : `0.0.${patch + 1}-0`,
      );
    case '~':
      return between(
        minor === undefined
          ? `${major + 1}.0.0-0`
          : `${major}.${minor + 1}.0-0`,
      );
    case '>=':
      return at((difference) => difference >= 0, floor);
    case '>':
      return minor === undefined
        ? at((difference) => difference >= 0, `${major + 1}.0.0-0`)
        : patch === undefined
          ? at((difference) => difference >= 0, `${major}.${minor + 1}.0-0`)
          : at((difference) => difference > 0, floor);
    case '<':
      return at((difference) => difference < 0, floor);
    case '<=':
      return minor === undefined
        ? at((difference) => difference < 0, `${major + 1}.0.0-0`)
        : patch === undefined
          ? at((difference) => difference < 0, `${major}.${minor + 1}.0-0`)
          : at((difference) => difference <= 0, floor);
    default:
      return minor === undefined
        ? between(`${major + 1}.0.0-0`)
        : patch === undefined
          ? between(`${major}.${minor + 1}.0-0`)
          : at((difference) => difference === 0, floor);
  }
}
