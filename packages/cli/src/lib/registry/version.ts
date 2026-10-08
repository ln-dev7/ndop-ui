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
