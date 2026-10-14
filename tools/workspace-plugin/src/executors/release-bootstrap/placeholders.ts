/** What a placeholder is built from: a released package's own manifest. */
export interface SourceManifest {
  /** Package name. */
  name: string;
  /** SPDX license. */
  license?: string;
  /** Home page. */
  homepage?: string;
  /** Repository, with the package's folder. */
  repository?: { type?: string; url?: string; directory?: string };
  /** Where issues go. */
  bugs?: { url?: string };
}

/** The note every placeholder carries, in its description and README. */
export const PLACEHOLDER_NOTE = 'Placeholder; the first release is 1.0.0.';

/**
 * The manifest of a package's placeholder: its name, a version below the
 * first release, the note, and the license, links and repository of the
 * real package, so npm shows where it will come from and the trusted
 * publisher's repository matches `repository.url` from the start.
 *
 * @param source - The real package's manifest.
 * @param version - The placeholder's version.
 * @returns The placeholder's `package.json` fields.
 */
export function placeholderManifest(
  source: SourceManifest,
  version: string,
): Record<string, unknown> {
  return {
    name: source.name,
    version,
    description: PLACEHOLDER_NOTE,
    ...(source.license ? { license: source.license } : {}),
    ...(source.homepage ? { homepage: source.homepage } : {}),
    ...(source.repository ? { repository: source.repository } : {}),
    ...(source.bugs ? { bugs: source.bugs } : {}),
  };
}

/**
 * The placeholder's README.
 *
 * @param source - The real package's manifest.
 * @returns Its text.
 */
export function placeholderReadme(source: SourceManifest): string {
  const site = source.homepage ? `\n\nSee ${source.homepage}.` : '';
  return `# ${source.name}\n\n${PLACEHOLDER_NOTE}${site}\n`;
}

/** Where the trusted publisher points, as npm records it. */
export interface TrustedPublisher {
  /** GitHub `owner/name`. */
  repository: string;
  /** Workflow file name, without its folder. */
  workflow: string;
  /** GitHub environment the publish job runs in. */
  environment?: string;
}

/**
 * The `npm publish` command for a placeholder's tarball.
 *
 * @param tarball - Path of the tarball.
 * @returns The command's arguments, after `npm`.
 */
export function publishArgs(tarball: string): string[] {
  return ['publish', tarball, '--access', 'public'];
}

/** The first npm whose `npm trust github` takes `--allow-publish`. */
export const TRUST_NPM = '11.15.0';

/**
 * Whether an npm version is {@link TRUST_NPM} or later. Older npm 11
 * releases have `npm trust github` without `--allow-publish`, and reject
 * the command.
 *
 * @param version - `npm --version`'s output.
 * @returns `true` when it can add the trusted publishers.
 */
export function canTrust(version: string): boolean {
  const parts = (text: string) =>
    text.trim().split(/[.-]/).slice(0, 3).map(Number);
  const [have, need] = [parts(version), parts(TRUST_NPM)];
  for (let index = 0; index < 3; index++) {
    const a = have[index] ?? 0;
    const b = need[index] ?? 0;
    if (Number.isNaN(a)) return false;
    if (a !== b) return a > b;
  }
  return true;
}

/**
 * The `npm trust github` command that lets the Release workflow publish a
 * package with OIDC ({@link TRUST_NPM} or later).
 *
 * @param name - Package name.
 * @param publisher - Repository, workflow and environment.
 * @returns The command's arguments, after `npm`.
 * @see https://docs.npmjs.com/cli/v11/commands/npm-trust
 */
export function trustArgs(name: string, publisher: TrustedPublisher): string[] {
  return [
    'trust',
    'github',
    name,
    '--file',
    publisher.workflow,
    '--repo',
    publisher.repository,
    ...(publisher.environment ? ['--env', publisher.environment] : []),
    '--allow-publish',
    '--yes',
  ];
}
