import { availableParallelism } from 'node:os';

// Parallel JSDOM focus/layout checks contend heavily on large-core laptops.
// Keep normal timeouts and full coverage, including on smaller CI runners.
export default { test: { maxWorkers: Math.min(3, availableParallelism()) } };
