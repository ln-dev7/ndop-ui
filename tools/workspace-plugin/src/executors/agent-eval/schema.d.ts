/** Options of the `agent-eval` executor. */
export interface AgentEvalExecutorSchema {
  /** Prompt ids to run, such as `1,7`; every prompt when left out. */
  prompts?: number[] | string | number;
  /** Attempts per prompt. */
  repeat?: number;
  /** Continue the report in `reportDir`. */
  resume?: boolean;
  /** Model, by full name. */
  model?: string;
  /** Time limit per prompt, in minutes. */
  timeoutMinutes?: number;
  /** Fail under this share of passing attempts. */
  minAccuracy?: number;
  /** Angular CLI version for the fixture app. */
  angular?: string;
  /** The suite's prompts, relative to the workspace root. */
  promptsFile?: string;
  /** Report folder, relative to the workspace root. */
  reportDir?: string;
  /** Scratch folder, relative to the workspace root. */
  workDir?: string;
}
