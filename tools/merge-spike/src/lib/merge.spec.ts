import { threeWayMerge, type MergeInput } from './merge';

const input = (overrides: Partial<MergeInput>): MergeInput => ({
  base: 'a\nb\nc\n',
  local: 'a\nb\nc\n',
  remote: 'a\nb\nc\n',
  remoteVersion: '1.1.0',
  strategy: 'line',
  prettier: false,
  ...overrides,
});

describe('threeWayMerge', () => {
  it('replaces a file the user never edited', async () => {
    const outcome = await threeWayMerge(input({ remote: 'a\nB\nc\n' }));
    expect(outcome).toEqual({
      status: 'replaced',
      content: 'a\nB\nc\n',
      conflictLines: [],
    });
  });

  it('keeps local edits when upstream did not change', async () => {
    const outcome = await threeWayMerge(input({ local: 'A\nb\nc\n' }));
    expect(outcome.status).toBe('unchanged');
    expect(outcome.content).toBe('A\nb\nc\n');
  });

  it('merges edits to different lines', async () => {
    const outcome = await threeWayMerge(
      input({ local: 'A\nb\nc\n', remote: 'a\nb\nC\n' }),
    );
    expect(outcome).toEqual({
      status: 'merged',
      content: 'A\nb\nC\n',
      conflictLines: [],
    });
  });

  it('marks edits to the same line as a conflict', async () => {
    const outcome = await threeWayMerge(
      input({ local: 'a\nL\nc\n', remote: 'a\nR\nc\n' }),
    );
    expect(outcome.status).toBe('conflict');
    expect(outcome.conflictLines).toEqual([2]);
    expect(outcome.content).toBe(
      'a\n<<<<<<< local\nL\n=======\nR\n>>>>>>> ndop@1.1.0\nc\n',
    );
  });

  it('keeps both insertions, upstream first, only under line+union', async () => {
    const both = { local: 'a\nb\nL\nc\n', remote: 'a\nb\nR\nc\n' };
    expect((await threeWayMerge(input(both))).status).toBe('conflict');
    expect(
      await threeWayMerge(input({ ...both, strategy: 'line+union' })),
    ).toEqual({
      status: 'merged',
      content: 'a\nb\nR\nL\nc\n',
      conflictLines: [],
    });
  });

  it('never unions a region where base lines were changed', async () => {
    const outcome = await threeWayMerge(
      input({
        local: 'a\nL\nc\n',
        remote: 'a\nR\nc\n',
        strategy: 'line+union',
      }),
    );
    expect(outcome.status).toBe('conflict');
  });

  it('ignores line endings and a missing final newline, and keeps CRLF', async () => {
    const outcome = await threeWayMerge(
      input({ local: 'A\r\nb\r\nc', remote: 'a\nb\nC\n' }),
    );
    expect(outcome.content).toBe('A\r\nb\r\nC\r\n');
  });
});
