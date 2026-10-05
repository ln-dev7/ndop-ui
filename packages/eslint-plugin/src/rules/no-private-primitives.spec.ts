import { typescriptTester } from '../testing/testers';
import { noPrivatePrimitives } from './no-private-primitives';

typescriptTester().run('no-private-primitives', noPrivatePrimitives as never, {
  valid: [
    "import { NdDialog } from '@ndop/primitives/dialog';",
    "import { something } from '@ndop/primitives';",
    "export * from '@ndop/primitives/tooltip';",
    "import { cn } from '@ndop/core';",
  ],
  invalid: [
    {
      code: "import { nextId } from '@ndop/primitives/internal';",
      errors: [
        { messageId: 'private', data: { source: '@ndop/primitives/internal' } },
      ],
    },
    {
      code: "import { NdDialog } from '@ndop/primitives/dialog/src/dialog';",
      errors: [{ messageId: 'private' }],
    },
    {
      code: "const m = await import('@ndop/primitives/internal');",
      errors: [{ messageId: 'private' }],
    },
  ],
});
