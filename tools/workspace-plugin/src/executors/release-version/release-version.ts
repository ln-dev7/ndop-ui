import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { logger, type PromiseExecutor } from '@nx/devkit';
import { withCliVersion } from '../registry-e2e/registries';
import { runInherited } from '../../utils/processes';
import type { ReleaseVersionExecutorSchema } from './schema';

/**
 * Versions the npm packages for a release (ADR-0028): runs
 * `changeset version`, which turns the pending changesets into the fixed
 * group's new version and each package's `CHANGELOG.md`, then pins the
 * registry template's `@ndop/*` dev dependencies to that version, so the
 * public template repo installs the release its docs describe
 * (ADR-0025). The template is outside the pnpm workspace, so Changesets
 * doesn't see it. The Release workflow runs this target to build the
 * "Version packages" pull request.
 *
 * @param options - The package whose version the group shares, and the
 *   template's manifest.
 * @param context - Nx executor context.
 * @returns Whether both steps succeeded.
 *
 * @example
 * ```sh
 * pnpm nx run @ndop/source:release-version
 * ```
 */
const releaseVersion: PromiseExecutor<ReleaseVersionExecutorSchema> = async (
  options,
  context,
) => {
  const code = await runInherited(
    'pnpm',
    ['exec', 'changeset', 'version'],
    context.root,
  );
  if (code !== 0) {
    logger.error(`changeset version exited with code ${code}.`);
    return { success: false };
  }
  const { version } = JSON.parse(
    await readFile(
      join(context.root, options.versionSource ?? 'packages/cli/package.json'),
      'utf-8',
    ),
  ) as { version: string };
  const template = join(
    context.root,
    options.template ?? 'tools/registry-template/package.json',
  );
  const before = await readFile(template, 'utf-8');
  const after = withCliVersion(before, version);
  if (after !== before) {
    await writeFile(template, after);
    logger.info(`Pinned the registry template's @ndop/* to ${version}.`);
  }
  return { success: true };
};

export default releaseVersion;
