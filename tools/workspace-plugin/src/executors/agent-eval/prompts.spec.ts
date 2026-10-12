import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readPrompts, selectPrompts } from './prompts';

const workspace = join(import.meta.dirname, '../../../../..');

describe("the suite's prompts", () => {
  it('has well-formed prompts, the first being the acceptance prompt', async () => {
    const prompts = await readPrompts(
      join(workspace, 'tools/agent-eval/prompts.json'),
    );
    expect(prompts.length).toBeGreaterThanOrEqual(50);
    expect(prompts[0]?.prompt).toBe(
      'Add a settings page where users edit their name and email, save, and can delete their account after confirming.',
    );
    expect(new Set(prompts.map((entry) => entry.prompt)).size).toBe(
      prompts.length,
    );
  });

  it('asks only for registry components and blocks, and covers every component', async () => {
    const registry = JSON.parse(
      readFileSync(join(workspace, 'registry/registry.json'), 'utf-8'),
    ) as { items: { name: string; type: string }[] };
    const names = (type: string) =>
      registry.items
        .filter((item) => item.type === type)
        .map((item) => item.name);
    const components = names('registry:ui');
    const known = new Set([...components, ...names('registry:block')]);
    const prompts = await readPrompts(
      join(workspace, 'tools/agent-eval/prompts.json'),
    );
    const asked = prompts.flatMap((entry) => entry.components);
    expect(asked.filter((name) => !known.has(name))).toEqual([]);
    // RFC-0001's definition of done: every component is covered by the
    // suite (ADR-0019).
    expect(components.filter((name) => !asked.includes(name))).toEqual([]);
  });
});

describe('selectPrompts', () => {
  const prompts = [1, 2, 3].map((id) => ({
    id,
    prompt: `P${id}`,
    components: ['button'],
    category: 'form' as const,
  }));

  it('picks prompts by id, or all of them', () => {
    expect(selectPrompts(prompts, [3, 1]).map((entry) => entry.id)).toEqual([
      1, 3,
    ]);
    expect(selectPrompts(prompts)).toHaveLength(3);
  });

  it('rejects unknown ids', () => {
    expect(() => selectPrompts(prompts, [9])).toThrow(
      "There's no prompt 9; ids run from 1 to 3.",
    );
  });
});
