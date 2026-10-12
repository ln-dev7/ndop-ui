import type { NdopLock } from '@ndop/schema';
import { applyCss, applyCssVars } from '../edit/stylesheet';
import { CliError } from '../errors';
import { dependencyName, sha256, type PlanBuilder } from '../plan/plan';
import { itemKey, itemOrigin, type ResolvedItem } from '../registry/client';
import { pristineFile } from './pristine';
import {
  LOCK_FILE,
  readLock,
  serializeLock,
  type InstallContext,
} from './project-files';

/**
 * Options for {@link planItems}.
 */
export interface PlanItemsOptions {
  /** Replace files the user changed since they were installed. */
  overwrite?: boolean;
}

/**
 * Stages the installation of resolved items: their files at their alias
 * targets, with `@/` imports rewritten to the project's aliases; their
 * `css` and `cssVars` in the Tailwind stylesheet; their npm dependencies;
 * and their entries in `ndop.lock.json`. Any item's `cssVars` are applied,
 * so a theme, or a shadcn `registry:style` theme, added after `ndop init`
 * replaces the values init wrote (ADR-0023).
 *
 * A file that exists with other content is kept, and reported as skipped,
 * unless it still matches the hash the lockfile recorded (the user never
 * edited it) or `overwrite` is set. `ndop update` is the tool for merging
 * upstream changes into edited files (ADR-0020).
 *
 * @param builder - The plan being built.
 * @param context - Where files go and how they import each other.
 * @param items - Items in dependency order, from `resolveItems`.
 * @param options - Overwrite behavior.
 */
export async function planItems(
  builder: PlanBuilder,
  context: InstallContext,
  items: readonly ResolvedItem[],
  options: PlanItemsOptions = {},
): Promise<void> {
  const lock = await readLock(builder);
  const before = serializeLock(lock);

  for (const { ref, item } of items) {
    const key = itemKey(ref);
    const previous = lock.items[key];
    const files: NdopLock['items'][string]['files'] = [];

    for (const file of item.files ?? []) {
      const { path, content: formatted } = await pristineFile(
        context,
        (target, text) => builder.formatted(target, text),
        file,
      );
      const current = await builder.read(path);
      const recorded = previous?.files.find((entry) => entry.path === path);
      const untouched =
        current === undefined ||
        current === formatted ||
        (recorded !== undefined && sha256(current) === recorded.sha256);
      if (untouched || options.overwrite) {
        await builder.stage(path, formatted);
        files.push({ path, sha256: sha256(formatted) });
      } else {
        builder.skip(
          path,
          'It has local changes. Run with --overwrite to replace it.',
        );
        if (recorded) {
          files.push(recorded);
        }
      }
    }

    if (item.css || item.cssVars) {
      const stylesheet = context.config.tailwind.css;
      let css = await builder.read(stylesheet);
      if (css === undefined) {
        throw new CliError(
          `${stylesheet} doesn't exist; ndop.json's tailwind.css must point at your global stylesheet.`,
          stylesheet,
        );
      }
      if (item.css) {
        css = applyCss(css, item.css);
      }
      if (item.cssVars) {
        css = applyCssVars(css, item.cssVars);
      }
      await builder.stage(stylesheet, css);
    }

    builder.depend(item.dependencies ?? []);
    builder.depend(item.devDependencies ?? [], true);
    if (
      item.dependencies?.some(
        (spec) => dependencyName(spec) === '@ndop/primitives',
      )
    ) {
      builder.depend(await angularPeers(builder));
    }
    lock.items[key] = {
      name: ref.name,
      ...itemOrigin(ref),
      version: item.version,
      files,
    };
  }

  const after = serializeLock(lock);
  if (after !== before || (await builder.read(LOCK_FILE)) === undefined) {
    await builder.stage(LOCK_FILE, after);
  }
}

/**
 * The Angular packages `@ndop/primitives` needs as peers, pinned to the
 * app's Angular major. Left to the package manager, a missing peer is
 * installed at its newest version, such as CDK 22 in an Angular 21 app,
 * whose compiler can't link it.
 *
 * @param builder - Project reader.
 * @returns Specs such as `@angular/cdk@^21.0.0`; none when the Angular
 *   version can't be read.
 */
export async function angularPeers(
  builder: Pick<PlanBuilder, 'read'>,
): Promise<string[]> {
  const manifest = JSON.parse((await builder.read('package.json')) ?? '{}') as {
    dependencies?: Record<string, string>;
  };
  const major = /(\d+)\./.exec(
    manifest.dependencies?.['@angular/core'] ?? '',
  )?.[1];
  return major ? [`@angular/cdk@^${major}.0.0`] : [];
}
