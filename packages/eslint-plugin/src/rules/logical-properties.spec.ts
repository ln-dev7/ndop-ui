import { templateTester, typescriptTester } from '../testing/testers';
import { logicalProperties } from './logical-properties';

const rule = logicalProperties as never;

templateTester().run('logical-properties in templates', rule, {
  valid: [
    '<div class="ms-2 pe-4 text-start"></div>',
    '<div [class]="classes"></div>',
  ],
  invalid: [
    {
      code: '<div class="p-2 ml-2 text-left"></div>',
      output: '<div class="p-2 ms-2 text-start"></div>',
      errors: [
        { messageId: 'physical', data: { token: 'ml-2', fix: 'ms-2' } },
        {
          messageId: 'physical',
          data: { token: 'text-left', fix: 'text-start' },
        },
      ],
    },
    {
      code: `<div [class]="'pl-4'" [class.rounded-l-md]="on"></div>`,
      output: `<div [class]="'ps-4'" [class.rounded-s-md]="on"></div>`,
      errors: [{ messageId: 'physical' }, { messageId: 'physical' }],
    },
  ],
});

typescriptTester().run('logical-properties in TypeScript', rule, {
  valid: [
    "const title = 'ml-2 is a class name';",
    "cn('ms-2', active && 'pe-4');",
    "@Directive({ host: { 'data-side': 'left-0' } }) class A {}",
  ],
  invalid: [
    {
      code: "const button = variants({ base: 'pl-3', variants: { size: { sm: 'mr-1' } } });",
      output:
        "const button = variants({ base: 'ps-3', variants: { size: { sm: 'me-1' } } });",
      errors: [{ messageId: 'physical' }, { messageId: 'physical' }],
    },
    {
      code: "@Directive({ host: { class: 'left-0 border-r' } }) class A {}",
      output: "@Directive({ host: { class: 'start-0 border-e' } }) class A {}",
      errors: [{ messageId: 'physical' }, { messageId: 'physical' }],
    },
    {
      code: 'cn(`flex ${gap} rounded-tl-md`);',
      output: 'cn(`flex ${gap} rounded-ss-md`);',
      errors: [{ messageId: 'physical' }],
    },
  ],
});
