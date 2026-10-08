/**
 * `@ndop/merge`: the three-way merge behind `ndop update` and the docs'
 * update preview (ADR-0003, ADR-0020). No Node APIs, so the CLI and the
 * browser merge the same way.
 *
 * @packageDocumentation
 */
export {
  CONFLICT_SEPARATOR,
  CONFLICT_START,
  conflictEnd,
  conflictMarkers,
  normalizeText,
  partialRemote,
  threeWayMerge,
  upstreamHunks,
  type ConflictMarkers,
  type MergeInput,
  type MergeOutcome,
  type MergeStatus,
  type UpstreamHunk,
} from './lib/merge';
