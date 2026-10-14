import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { logger, type PromiseExecutor } from '@nx/devkit';
import {
  canTrust,
  placeholderManifest,
  placeholderReadme,
  publishArgs,
  TRUST_NPM,
  trustArgs,
  type SourceManifest,
  type TrustedPublisher,
} from './placeholders';
import type { ReleaseBootstrapExecutorSchema } from './schema';
import { runCaptured, runInherited } from '../../utils/processes';
import {
  releasePackages,
  type ReleasePackage,
} from '../../utils/release-packages';

/**
 * The one-time npm bootstrap before the first release (ADR-0028). npm
 * only lets a trusted publisher be added to a package that already exists
 * (https://docs.npmjs.com/cli/v11/commands/npm-trust), so each package of
 * the Changesets fixed group is first published once by hand, as a
 * placeholder at 0.0.0 with the note "Placeholder; the first release is
 * 1.0.0." and the real package's license and repository.
 *
 * It packs a placeholder for every package not on npm yet into
 * `outputPath` and prints the `npm publish` commands, then the
 * `npm trust github` commands that let the Release workflow publish them.
 * It publishes only with `--publish`, and adds the trusted publishers only
 * with `--trust`; both run npm in the terminal, so npm can ask for the
 * second factor.
 *
 * @param options - Output folder, placeholder version, trusted publisher,
 *   and whether to publish and trust.
 * @param context - Nx executor context.
 * @returns Whether every step it ran succeeded.
 *
 * @example
 * ```sh
 * pnpm nx run @ndop/source:release-bootstrap
 * pnpm nx run @ndop/source:release-bootstrap --publish --trust
 * ```
 */
const releaseBootstrap: PromiseExecutor<
  ReleaseBootstrapExecutorSchema
> = async (options, context) => {
  const root = context.root;
  const version = options.version ?? '0.0.0';
  const output = join(root, options.outputPath ?? 'tmp/release-bootstrap');
  const publisher: TrustedPublisher = {
    repository: options.repository ?? 'ndop-ui/ui',
    workflow: options.workflow ?? 'release.yml',
    ...(options.environment === ''
      ? {}
      : { environment: options.environment ?? 'npm' }),
  };
  if (options.trust) {
    // Checked first, so an old npm stops the run before anything is
    // published rather than between publishing and trusting.
    const npm = await runCaptured('npm', ['--version'], root);
    if (npm.code !== 0 || !canTrust(npm.stdout)) {
      logger.error(
        `Adding trusted publishers needs npm ${TRUST_NPM} or later; this is npm ${npm.stdout.trim() || 'unknown'}. Update it with npm install -g npm@latest, or run the printed npm trust commands with npx -y npm@latest.`,
      );
      return { success: false };
    }
  }
  let packages: ReleasePackage[];
  try {
    packages = await releasePackages(root, options.packagesDir ?? 'packages');
  } catch (error) {
    logger.error(error instanceof Error ? error.message : String(error));
    return { success: false };
  }
  const names = packages.map((release) => release.name);

  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  const tarballs: [name: string, tarball: string][] = [];
  for (const { name, manifest } of packages) {
    const source = manifest as SourceManifest;
    if (await isOnNpm(name, root)) {
      logger.info(`${name} is on npm already; no placeholder needed.`);
      continue;
    }
    const folder = join(output, name.replace(/^@/, '').replace('/', '-'));
    await mkdir(folder, { recursive: true });
    await writeFile(
      join(folder, 'package.json'),
      `${JSON.stringify(placeholderManifest(source, version), null, 2)}\n`,
    );
    await writeFile(join(folder, 'README.md'), placeholderReadme(source));
    await copyFile(join(root, 'LICENSE'), join(folder, 'LICENSE'));
    const pack = await runCaptured(
      'npm',
      ['pack', folder, '--pack-destination', output, '--json'],
      root,
    );
    const [packed] =
      pack.code === 0
        ? (JSON.parse(pack.stdout) as { filename: string }[])
        : [];
    if (!packed) {
      logger.error(`npm pack failed for ${name}:\n${pack.stderr}`);
      return { success: false };
    }
    tarballs.push([name, join(output, packed.filename)]);
  }

  const shown = (args: string[]) =>
    ['npm', ...args]
      .map((arg) => (arg.startsWith(root) ? relative(root, arg) : arg))
      .join(' ');
  if (tarballs.length) {
    logger.info(
      `\nPlaceholders packed in ${relative(root, output)}. Publish them, from the workspace root, with:\n`,
    );
    for (const [, tarball] of tarballs)
      logger.info(`  ${shown(publishArgs(tarball))}`);
  } else {
    logger.info('Every package is on npm already.');
  }
  logger.info(
    `\nThen let ${publisher.repository}'s ${publisher.workflow} publish them (npm ${TRUST_NPM} or later):\n`,
  );
  for (const name of names)
    logger.info(`  ${shown(trustArgs(name, publisher))}`);

  if (options.publish) {
    for (const [name, tarball] of tarballs) {
      logger.info(`\nPublishing the ${name} placeholder…`);
      if ((await runInherited('npm', publishArgs(tarball), root)) !== 0) {
        logger.error(`npm publish failed for ${name}.`);
        return { success: false };
      }
    }
  }
  if (options.trust) {
    for (const [index, name] of names.entries()) {
      // npm's docs ask for a pause between trust calls in a loop.
      if (index > 0) await new Promise((resolve) => setTimeout(resolve, 2000));
      logger.info(`\nAdding the trusted publisher of ${name}…`);
      if ((await runInherited('npm', trustArgs(name, publisher), root)) !== 0) {
        logger.error(`npm trust failed for ${name}.`);
        return { success: false };
      }
    }
  }
  return { success: true };
};

/**
 * Whether any version of a package is on npm. `npm view` exits non-zero
 * with E404 for a name nobody has published.
 *
 * @param name - Package name.
 * @param cwd - Working folder.
 * @returns `true` once it has been published.
 * @throws If npm fails for another reason, such as being offline.
 */
async function isOnNpm(name: string, cwd: string): Promise<boolean> {
  const view = await runCaptured('npm', ['view', name, 'name', '--json'], cwd);
  if (view.code === 0) return true;
  if (view.stdout.includes('E404')) return false;
  throw new Error(`npm view ${name} failed:\n${view.stderr}`);
}

export default releaseBootstrap;
