/**
 * `@ndop/metadata`: build-time extraction of Ndop component metadata. In
 * Phase 1 it parses each primitive's `spec.md` accessibility contract, which
 * drives keyboard tests; Phase 3 adds API extraction from compiled code.
 *
 * @packageDocumentation
 */
export { parseSpec, type ParsedSpec, type SpecPart } from './lib/parse-spec';
