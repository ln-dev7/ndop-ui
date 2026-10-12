import { readFile } from 'node:fs/promises';

/** Kinds of prompt, so failures can be read by area. */
export const CATEGORIES = [
  'form',
  'overlay',
  'layout',
  'page',
  'edge',
] as const;

/** One prompt of the agent eval suite (ADR-0019). */
export interface EvalPrompt {
  /** 1-based position, used by `--prompts`. */
  id: number;
  /** The one-line request given to the agent. */
  prompt: string;
  /** Registry components and blocks the result must use. */
  components: string[];
  /** What kind of task it is. */
  category: (typeof CATEGORIES)[number];
}

/**
 * Reads and checks the suite's prompts: ids in order from 1, a prompt, at
 * least one component, and a known category each.
 *
 * @param path - `prompts.json`.
 * @returns The prompts.
 * @throws When an entry is malformed.
 */
export async function readPrompts(path: string): Promise<EvalPrompt[]> {
  const prompts = JSON.parse(await readFile(path, 'utf-8')) as EvalPrompt[];
  prompts.forEach((entry, index) => {
    const problem =
      entry.id !== index + 1
        ? `id should be ${index + 1}`
        : !entry.prompt?.trim()
          ? 'has no prompt'
          : !entry.components?.length
            ? 'lists no components'
            : !(CATEGORIES as readonly string[]).includes(entry.category)
              ? `has an unknown category "${entry.category}"`
              : undefined;
    if (problem) throw new Error(`Prompt ${index + 1} in ${path} ${problem}.`);
  });
  return prompts;
}

/**
 * The prompts `--prompts` picks.
 *
 * @param prompts - Every prompt.
 * @param ids - Ids to run; all of them when empty.
 * @returns The chosen prompts, in order.
 * @throws For an id that doesn't exist.
 */
export function selectPrompts(
  prompts: readonly EvalPrompt[],
  ids: readonly number[] = [],
): EvalPrompt[] {
  for (const id of ids) {
    if (!prompts.some((entry) => entry.id === id)) {
      throw new Error(
        `There's no prompt ${id}; ids run from 1 to ${prompts.length}.`,
      );
    }
  }
  return ids.length
    ? prompts.filter((entry) => ids.includes(entry.id))
    : [...prompts];
}
