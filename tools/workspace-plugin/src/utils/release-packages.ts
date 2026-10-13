import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

/** A package of the release's fixed group. */
export interface ReleasePackage {
  /** Package name. */
  name: string;
  /** Its source folder, relative to the workspace root. */
  dir: string;
  /** Its source manifest. */
  manifest: Record<string, unknown> & { name: string };
}

/**
 * The fixed group of `.changeset/config.json`: the packages that release
 * together (ADR-0028).
 *
 * @param config - The config's text.
 * @returns The group's package names.
 * @throws If the config has no single fixed group.
 */
export function fixedGroup(config: string): string[] {
  const parsed = JSON.parse(config) as { fixed?: string[][] };
  const [group, ...others] = parsed.fixed ?? [];
  if (!group?.length || others.length) {
    throw new Error(
      '.changeset/config.json must have exactly one fixed group, the packages that release together.',
    );
  }
  return group;
}

/**
 * Finds the packages of the release's fixed group in the workspace.
 *
 * @param root - Workspace root.
 * @param packagesDir - Folder holding one package per subfolder.
 * @returns Each package, in the group's order.
 * @throws If a package of the group isn't in `packagesDir`.
 */
export async function releasePackages(
  root: string,
  packagesDir = 'packages',
): Promise<ReleasePackage[]> {
  const names = fixedGroup(
    await readFile(join(root, '.changeset/config.json'), 'utf-8'),
  );
  const found = new Map<string, ReleasePackage>();
  for (const entry of await readdir(join(root, packagesDir), {
    withFileTypes: true,
  })) {
    if (!entry.isDirectory()) continue;
    const dir = join(packagesDir, entry.name);
    let manifest: ReleasePackage['manifest'];
    try {
      manifest = JSON.parse(
        await readFile(join(root, dir, 'package.json'), 'utf-8'),
      ) as ReleasePackage['manifest'];
    } catch {
      continue;
    }
    found.set(manifest.name, { name: manifest.name, dir, manifest });
  }
  return names.map((name) => {
    const release = found.get(name);
    if (!release) {
      throw new Error(`No package named ${name} in ${packagesDir}/.`);
    }
    return release;
  });
}
