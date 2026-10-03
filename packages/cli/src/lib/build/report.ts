// A namespace import works both bundled as ESM and loaded as CommonJS by
// the workspace's registry-build executor.
import * as pc from 'picocolors';
import type { BuildResult } from './types';

/**
 * Formats a build result for a terminal: issues, warnings, then each
 * item built and a summary.
 *
 * @param result - The build result.
 * @param dryRun - Whether nothing was written.
 * @returns Lines to print.
 */
export function formatBuildResult(
  result: BuildResult,
  dryRun: boolean,
): string {
  const lines: string[] = [];
  for (const issue of result.issues) {
    const where = [issue.item, issue.file].filter(Boolean).join(' › ');
    lines.push(
      `${pc.red('✗')} ${where ? `${pc.bold(where)}: ` : ''}${issue.message}`,
    );
  }
  for (const warning of result.warnings) {
    lines.push(`${pc.yellow('!')} ${warning}`);
  }
  if (result.ok) {
    for (const item of result.items) {
      const note =
        item.snapshot === 'created' ? pc.green(' (new snapshot)') : '';
      lines.push(`${pc.green('✓')} ${item.name}@${item.version}${note}`);
    }
    lines.push(
      `${dryRun ? 'Would write' : 'Wrote'} ${result.files.length} files.`,
    );
  } else {
    lines.push(pc.red(`Build failed with ${result.issues.length} issue(s).`));
  }
  return `${lines.join('\n')}\n`;
}
