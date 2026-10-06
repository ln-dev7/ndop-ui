import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readPrompts, selectPrompts } from './prompts';

const workspace = join(import.meta.dirname, '../../../../..');

describe("the suite's prompts", () => {
  it('has 50 well-formed prompts, the first being the acceptance prompt', async () => {
    const prompts = await readPrompts(
      join(workspace, 'tools/agent-eval/prompts.json'),
    );
    expect(prompts).toHaveLength(50);
    expect(prompts[0]?.prompt).toBe(
      'Add a settings page where users edit their name and email, save, and can delete their account after confirming.',
    );
    expect(new Set(prompts.map((entry) => entry.prompt)).size).toBe(50);
  });

  it('only asks for components the registry has', async () => {
    const registry = JSON.parse(
      readFileSync(join(workspace, 'registry/registry.json'), 'utf-8'),
    ) as { items: { name: string; type: string }[] };
    const components = new Set(
      registry.items
        .filter((item) => item.type === 'registry:ui')
        .map((item) => item.name),
    );
    const prompts = await readPrompts(
      join(workspace, 'tools/agent-eval/prompts.json'),
    );
    expect(
      prompts
        .flatMap((entry) => entry.components)
        .filter((name) => !components.has(name)),
    ).toEqual([]);
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
