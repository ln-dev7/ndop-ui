/**
 * An expected failure the CLI reports to the user, such as a missing
 * `ndop.json` or an unsupported project, as opposed to a bug.
 */
export class CliError extends Error {
  /**
   * Creates the error.
   *
   * @param message - What went wrong and, when possible, how to fix it.
   * @param file - Project-relative file the problem is in.
   */
  constructor(
    message: string,
    readonly file?: string,
  ) {
    super(message);
    this.name = 'CliError';
  }
}
