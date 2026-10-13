import { spawn } from 'node:child_process';

/** What {@link runCaptured} returns. */
export interface CapturedRun {
  /** Exit code; `1` when the process was killed by a signal. */
  code: number;
  /** Standard output. */
  stdout: string;
  /** Standard error. */
  stderr: string;
}

/**
 * Runs a command with the terminal's input and output, so it can prompt,
 * as npm does for a second factor.
 *
 * @param command - Executable.
 * @param args - Its arguments.
 * @param cwd - Working folder.
 * @returns Its exit code; `1` when killed by a signal.
 */
export function runInherited(
  command: string,
  args: readonly string[],
  cwd: string,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) => resolve(code ?? 1));
  });
}

/**
 * Runs a command and collects its output.
 *
 * @param command - Executable.
 * @param args - Its arguments.
 * @param cwd - Working folder.
 * @returns Exit code and output, whatever the exit code.
 */
export function runCaptured(
  command: string,
  args: readonly string[],
  cwd: string,
): Promise<CapturedRun> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => (stdout += chunk.toString()));
    child.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}
