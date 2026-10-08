import {
  conflictMarkers,
  normalizeText,
  partialRemote,
  threeWayMerge,
  upstreamHunks,
  type MergeInput,
} from './merge';

const input = (overrides: Partial<MergeInput>): MergeInput => ({
  base: 'a\nb\nc\n',
  local: 'a\nb\nc\n',
  remote: 'a\nb\nc\n',
  remoteVersion: '1.1.0',
  ...overrides,
});

describe('threeWayMerge', () => {
  it('replaces a file the user never edited', () => {
    expect(threeWayMerge(input({ remote: 'a\nB\nc\n' }))).toEqual({
      status: 'replaced',
      content: 'a\nB\nc\n',
      conflictLines: [],
      unioned: false,
    });
  });

  it('keeps local edits when upstream did not change', () => {
    const outcome = threeWayMerge(input({ local: 'A\nb\nc\n' }));
    expect(outcome.status).toBe('unchanged');
    expect(outcome.content).toBe('A\nb\nc\n');
  });

  it('leaves a file that already matches upstream alone', () => {
    const outcome = threeWayMerge(
      input({ local: 'a\nB\nc\n', remote: 'a\nB\nc\n' }),
    );
    expect(outcome.status).toBe('unchanged');
  });

  it('merges edits to different lines', () => {
    expect(
      threeWayMerge(input({ local: 'A\nb\nc\n', remote: 'a\nb\nC\n' })),
    ).toEqual({
      status: 'merged',
      content: 'A\nb\nC\n',
      conflictLines: [],
      unioned: false,
    });
  });

  it('marks edits to the same line as a conflict', () => {
    const outcome = threeWayMerge(
      input({ local: 'a\nL\nc\n', remote: 'a\nR\nc\n' }),
    );
    expect(outcome.status).toBe('conflict');
    expect(outcome.conflictLines).toEqual([2]);
    expect(outcome.content).toBe(
      'a\n<<<<<<< local\nL\n=======\nR\n>>>>>>> ndop@1.1.0\nc\n',
    );
  });

  it('keeps both insertions, upstream first, and says so', () => {
    expect(
      threeWayMerge(input({ local: 'a\nb\nL\nc\n', remote: 'a\nb\nR\nc\n' })),
    ).toEqual({
      status: 'merged',
      content: 'a\nb\nR\nL\nc\n',
      conflictLines: [],
      unioned: true,
    });
  });

  it('turns pure insertions into a conflict without the union', () => {
    const outcome = threeWayMerge(
      input({
        local: 'a\nb\nL\nc\n',
        remote: 'a\nb\nR\nc\n',
        union: false,
      }),
    );
    expect(outcome.status).toBe('conflict');
    expect(outcome.unioned).toBe(false);
  });

  it('never unions a region where base lines were changed', () => {
    const outcome = threeWayMerge(
      input({ local: 'a\nL\nc\n', remote: 'a\nR\nc\n' }),
    );
    expect(outcome.status).toBe('conflict');
  });

  it('ignores line endings and a missing final newline, and keeps CRLF', () => {
    const outcome = threeWayMerge(
      input({ local: 'A\r\nb\r\nc', remote: 'a\nb\nC\n' }),
    );
    expect(outcome.content).toBe('A\r\nb\r\nC\r\n');
  });
});

describe('conflictMarkers', () => {
  it('counts complete conflicts', () => {
    const { content } = threeWayMerge(
      input({ local: 'L\nb\nL\n', remote: 'R\nb\nR\n' }),
    );
    expect(conflictMarkers(content)).toEqual({
      count: 2,
      lines: [1, 7],
      wellFormed: true,
    });
  });

  it('finds nothing in a resolved file, even with a Markdown rule', () => {
    expect(conflictMarkers('a\n=======\nb\n')).toEqual({
      count: 0,
      lines: [],
      wellFormed: true,
    });
  });

  it('flags a half-resolved conflict', () => {
    const markers = conflictMarkers('<<<<<<< local\nL\n=======\nR\nc\n');
    expect(markers.wellFormed).toBe(false);
    expect(markers.count).toBe(0);
    expect(conflictMarkers('a\n>>>>>>> ndop@1.1.0\n').wellFormed).toBe(false);
  });
});

describe('upstreamHunks and partialRemote', () => {
  const base = 'a\nb\nc\nd\n';
  const remote = 'A\nb\nc\nd\ne\n';

  it('lists each upstream change in file order', () => {
    expect(upstreamHunks(base, remote)).toEqual([
      { baseLine: 1, removed: ['a'], added: ['A'] },
      { baseLine: 5, removed: [], added: ['e'] },
    ]);
  });

  it('applies only the accepted hunks', () => {
    expect(partialRemote(base, remote, [1])).toBe('a\nb\nc\nd\ne\n');
    expect(partialRemote(base, remote, [0])).toBe('A\nb\nc\nd\n');
    expect(partialRemote(base, remote, [0, 1])).toBe(normalizeText(remote));
    expect(partialRemote(base, remote, [])).toBe(base);
  });

  it('merges a partial remote like any other', () => {
    const local = 'a\nb\nC\nd\n';
    const outcome = threeWayMerge({
      base,
      local,
      remote: partialRemote(base, remote, [1]),
      remoteVersion: '1.1.0',
    });
    expect(outcome).toEqual(
      expect.objectContaining({
        status: 'merged',
        content: 'a\nb\nC\nd\ne\n',
      }),
    );
  });
});
