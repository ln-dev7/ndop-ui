import { templateTester, typescriptTester } from '../testing/testers';
import { noRawColors } from './no-raw-colors';

const rule = noRawColors as never;

templateTester().run('no-raw-colors in templates', rule, {
  valid: ['<p class="text-muted-foreground bg-black/50"></p>'],
  invalid: [
    {
      code: '<p class="text-red-600 bg-[#fafafa]"></p>',
      errors: [
        { messageId: 'raw', data: { token: 'text-red-600' } },
        { messageId: 'raw', data: { token: 'bg-[#fafafa]' } },
      ],
    },
  ],
});

typescriptTester().run('no-raw-colors in TypeScript', rule, {
  valid: [
    "cn('bg-primary text-primary-foreground');",
    "const red = 'bg-red-500';",
  ],
  invalid: [
    {
      code: "variants({ base: 'border-zinc-200' });",
      errors: [{ messageId: 'raw', data: { token: 'border-zinc-200' } }],
    },
  ],
});
