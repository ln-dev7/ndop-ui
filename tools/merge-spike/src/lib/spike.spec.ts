import { readFileSync } from 'fs';
import { join } from 'path';
import { formatReport, runSpike, type SpikeReport } from './spike';

const workspaceRoot = join(import.meta.dirname, '../../../..');

describe('merge spike', () => {
  let report: SpikeReport;

  beforeAll(async () => {
    report = await runSpike(
      join(workspaceRoot, 'tools/update-fixtures/button'),
      JSON.parse(readFileSync(join(workspaceRoot, '.prettierrc'), 'utf-8')),
      '1.1.0',
    );
    console.log(`\n${formatReport(report)}\n`);
  });

  // Phase 0 gate (RFC-0001): at least 8 of 10 clean merges. Measured on the
  // strategy adopted in ADR-0003 amendment 1; without the union step the
  // merge scores lower, as the printed table and the ADR record.
  it('meets the Phase 0 gate with the adopted strategy', () => {
    expect(report.cleanCount['line + prettier + union']).toBeGreaterThanOrEqual(
      8,
    );
  });

  it('leaves the true conflict as a conflict under every strategy', () => {
    const trueConflict = report.cases.find(
      (c) => c.id === '10-edit-base-classes',
    );
    expect(
      Object.values(trueConflict?.results ?? {}).map((r) => r.status),
    ).toEqual(['conflict', 'conflict', 'conflict']);
  });

  it('runs all ten fixtures', () => {
    expect(report.cases).toHaveLength(10);
  });

  it('agrees with git merge-file on every plain line merge', () => {
    expect(
      report.cases.filter((c) => !c.agreesWithGit).map((c) => c.id),
    ).toEqual([]);
  });

  it('writes well-formed conflict markers', () => {
    const malformed = report.cases.flatMap((c) =>
      Object.entries(c.results)
        .filter(([, r]) => !r.markersValid)
        .map(([label]) => `${c.id} (${label})`),
    );
    expect(malformed).toEqual([]);
  });
});
