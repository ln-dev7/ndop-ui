/**
 * `@ndop/merge-spike`: Phase 0 spike of the three-way merge behind
 * `ndop update` (ADR-0003). Private; moves into `@ndop/cli` in Phase 5.
 *
 * @packageDocumentation
 */
export {
  threeWayMerge,
  type MergeInput,
  type MergeOutcome,
  type MergeStrategy,
} from './lib/merge';
export {
  formatReport,
  runSpike,
  SPIKE_VARIANTS,
  type CaseReport,
  type CaseResult,
  type SpikeReport,
  type SpikeVariant,
} from './lib/spike';
