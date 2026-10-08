import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { logger, type PromiseExecutor } from '@nx/devkit';
import type { RegistryE2eExecutorSchema } from './schema';
import {
  addDevCommand,
  agentFileProblems,
  BAD_PAGE,
  BUTTON_EDIT,
  GOOD_PAGE,
  updateProblems,
  type UpdateJson,
  verifyProblems,
  type VerifyJson,
  caseId,
  changedPaths,
  execCommand,
  hashTree,
  TEAM_NOTE,
  lastJsonObject,
  run,
  runScriptCommand,
  type InstallCase,
} from './scenario';
import { withLocalPackages } from '../../utils/local-packages';

/**
 * Outcome of one case.
 */
interface CaseResult {
  /** Case name. */
  id: string;
  /** Seconds from `ndop init` to the end of the build. */
  seconds?: number;
  /** What failed, if anything. */
  error?: string;
}

/**
 * The registry install test (ADR-0015). Against unpublished Ndop, from
 * {@link withLocalPackages}, it creates, for each case, an app with
 * `ng new` and times `ndop init`, `ndop add <item>` and the app's build
 * against the budget. It checks the agent context files (ADR-0017), init
 * having run with `--agent claude-code --mcp` over a team note in
 * `AGENTS.md`. Then it runs `ndop add <item> --json` again and checks
 * that the plan is empty and no file changed. A case with `update` also
 * installs `button@0.1.0`, edits it, runs `ndop update` and builds the app
 * again (ADR-0020).
 *
 * @param options - Cases, budget and paths.
 * @param context - Nx executor context.
 * @returns Whether every case passed.
 */
const registryE2e: PromiseExecutor<RegistryE2eExecutorSchema> = async (
  options,
  context,
) => {
  const workDir = join(context.root, options.workDir ?? 'tmp/registry-e2e');
  const budget = options.budgetSeconds ?? 120;
  const item = options.item ?? 'dialog';
  const cases = options.cases.filter(
    (installCase) =>
      !options.only?.length || options.only.includes(caseId(installCase)),
  );
  await rm(workDir, { recursive: true, force: true });
  await mkdir(workDir, { recursive: true });

  const results = await withLocalPackages(
    {
      root: context.root,
      tag: 'e2e',
      ...(options.localRegistryTarget
        ? { localRegistryTarget: options.localRegistryTarget }
        : {}),
      ...(options.registryPath ? { registryPath: options.registryPath } : {}),
    },
    async ({ env, version }) => {
      const done: CaseResult[] = [];
      for (const installCase of cases) {
        done.push(
          await runCase(installCase, { workDir, env, version, item, budget }),
        );
      }
      return done;
    },
  );

  for (const result of results) {
    if (result.error) {
      logger.error(`✗ ${result.id}: ${result.error}`);
    } else {
      logger.info(
        `✓ ${result.id}: ndop init to built app in ${result.seconds}s`,
      );
    }
  }
  logger.info(`Logs: ${workDir}`);
  return {
    success: results.length > 0 && results.every((result) => !result.error),
  };
};

/**
 * Shared settings for every case.
 */
interface CaseSettings {
  /** Folder the app is created in. */
  workDir: string;
  /** Environment pointing every tool at the local registries. */
  env: NodeJS.ProcessEnv;
  /** Version the `ndop` package was published under. */
  version: string;
  /** Item to add. */
  item: string;
  /** Time budget in seconds. */
  budget: number;
}

/**
 * Runs one case.
 *
 * @param installCase - Package manager and Angular version.
 * @param settings - Shared settings.
 * @returns The case's outcome.
 */
async function runCase(
  installCase: InstallCase,
  settings: CaseSettings,
): Promise<CaseResult> {
  const id = caseId(installCase);
  const { packageManager } = installCase;
  const app = join(settings.workDir, id);
  const log = join(settings.workDir, `${id}.log`);
  const options = { cwd: app, env: settings.env, log };
  const ndop = (args: string[]) =>
    execCommand(packageManager, `ndop@${settings.version}`, args);
  logger.info(`Running ${id}…`);
  try {
    await run(
      [
        'npx',
        [
          '--yes',
          `@angular/cli@${installCase.angular}`,
          'new',
          'app',
          `--directory=${id}`,
          '--style=tailwind',
          '--zoneless',
          '--ssr=false',
          `--package-manager=${packageManager}`,
          '--skip-git',
          '--defaults',
        ],
      ],
      { ...options, cwd: settings.workDir },
    );

    await writeFile(join(app, 'AGENTS.md'), TEAM_NOTE);
    const start = performance.now();
    await run(
      ndop(['init', '--yes', '--agent', 'claude-code', '--mcp']),
      options,
    );
    await run(ndop(['add', settings.item, '--yes']), options);
    await run(runScriptCommand(packageManager, 'build'), options);
    const seconds = Math.round((performance.now() - start) / 1000);
    if (seconds > settings.budget) {
      return {
        id,
        seconds,
        error: `took ${seconds}s, over the ${settings.budget}s budget`,
      };
    }

    const agentFiles: Record<string, string | undefined> = {};
    for (const path of [
      'AGENTS.md',
      'CLAUDE.md',
      '.claude/skills/ndop/SKILL.md',
      '.mcp.json',
    ]) {
      agentFiles[path] = await readFile(join(app, path), 'utf-8').catch(
        () => undefined,
      );
    }
    const problems = agentFileProblems(agentFiles, settings.item);
    if (problems.length > 0) {
      return { id, seconds, error: problems.join('; ') };
    }

    const before = await hashTree(app);
    const again = lastJsonObject(
      await run(ndop(['add', settings.item, '--yes', '--json']), options),
    ) as {
      ok: boolean;
      files: unknown[];
      dependencies: unknown[];
      devDependencies: unknown[];
    };
    const changed = changedPaths(before, await hashTree(app));
    if (
      !again.ok ||
      again.files.length > 0 ||
      again.dependencies.length > 0 ||
      again.devDependencies.length > 0 ||
      changed.length > 0
    ) {
      return {
        id,
        seconds,
        error: `running add again wasn't a no-op: ${JSON.stringify({ plan: again, changed })}`,
      };
    }

    await run(
      addDevCommand(packageManager, `@ndop/verify@${settings.version}`),
      options,
    );
    await writeFile(join(app, 'src/app/ndop-good.ts'), GOOD_PAGE);
    await writeFile(join(app, 'src/app/ndop-bad.ts'), BAD_PAGE);
    const verified = async (file: string) =>
      lastJsonObject(
        await run(ndop(['verify', file, '--json']), {
          ...options,
          allowFailure: true,
        }),
      ) as VerifyJson;
    const wrong = verifyProblems(
      await verified('src/app/ndop-good.ts'),
      await verified('src/app/ndop-bad.ts'),
    );
    if (wrong.length) {
      return { id, seconds, error: wrong.join('; ') };
    }

    if (installCase.update) {
      await run(ndop(['add', 'button@0.1.0', '--yes']), options);
      const path = join(app, BUTTON_EDIT.path);
      const installed = await readFile(path, 'utf-8');
      await writeFile(
        path,
        installed.replace(BUTTON_EDIT.find, BUTTON_EDIT.replace),
      );
      const updated = lastJsonObject(
        await run(ndop(['update', 'button', '--yes', '--json']), options),
      ) as UpdateJson;
      const problems = updateProblems(updated, await readFile(path, 'utf-8'));
      if (problems.length) {
        return { id, seconds, error: problems.join('; ') };
      }
      await run(runScriptCommand(packageManager, 'build'), options);
    }
    return { id, seconds };
  } catch (error) {
    return { id, error: (error as Error).message };
  }
}

export default registryE2e;
