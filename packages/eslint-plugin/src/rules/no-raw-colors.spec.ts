import { templateTester, typescriptTester } from '../testing/testers';
import { noRawColors } from './no-raw-colors';

const rule = noRawColors as never;

templateTester().run('no-raw-colors in templates', rule, {
  valid: [
    '<p class="text-muted-foreground bg-black/50"></p>',
    '<p class="bg-[var(--sidebar)] [&>svg]:size-4"></p>',
    '<p style="width: 2px; color: var(--primary)"></p>',
    '<p [style.color]="color()" [style.width.px]="20"></p>',
    '<p [style.background-color]="\'var(--muted)\'"></p>',
    "<p [style]=\"{ color: 'currentColor', width: '2px' }\"></p>",
    '<p [style.--gap]="\'4px\'"></p>',
  ],
  invalid: [
    {
      code: '<p class="text-red-600 bg-[#fafafa]"></p>',
      errors: [
        { messageId: 'raw', data: { token: 'text-red-600' } },
        { messageId: 'raw', data: { token: 'bg-[#fafafa]' } },
      ],
    },
    {
      code: '<p class="[color:#fff] text-[rgb(0_0_0)] border-[oklch(0.5_0_0)]"></p>',
      errors: [
        { messageId: 'raw', data: { token: '[color:#fff]' } },
        { messageId: 'raw', data: { token: 'text-[rgb(0_0_0)]' } },
        { messageId: 'raw', data: { token: 'border-[oklch(0.5_0_0)]' } },
      ],
    },
    {
      code: '<p [class]="\'bg-[#1e3170]\'"></p>',
      errors: [{ messageId: 'raw', data: { token: 'bg-[#1e3170]' } }],
    },
    {
      code: '<p style="color: #18332d; border: 1px solid tomato"></p>',
      errors: [
        { messageId: 'literal', data: { color: '#18332d' }, column: 18 },
        { messageId: 'literal', data: { color: 'tomato' }, column: 45 },
      ],
    },
    {
      code: "<p [style.color]=\"active ? '#fff' : 'var(--primary)'\"></p>",
      errors: [{ messageId: 'literal', data: { color: '#fff' }, column: 29 }],
    },
    {
      code: "<p [style]=\"{ 'background-color': 'rgb(0 0 0)', width: '2px' }\"></p>",
      errors: [{ messageId: 'literal', data: { color: 'rgb(0 0 0)' } }],
    },
    {
      code: '<p [ngStyle]="{ color: \'red\' }"></p>',
      errors: [{ messageId: 'literal', data: { color: 'red' } }],
    },
    {
      code: '<p [style]="\'color: hsl(0 0% 0%)\'"></p>',
      errors: [{ messageId: 'literal', data: { color: 'hsl(0 0% 0%)' } }],
    },
    {
      code: '<p [style.--ink]="\'#18332d\'"></p>',
      errors: [
        { messageId: 'palette', data: { name: '--ink', color: '#18332d' } },
      ],
    },
  ],
});

typescriptTester().run('no-raw-colors in TypeScript', rule, {
  valid: [
    "cn('bg-primary text-primary-foreground');",
    "const red = 'bg-red-500';",
    "const styles = ['.a { color: #fff }'];",
    "@Component({ styles: ':host { display: block; color: var(--foreground) }' }) class A {}",
  ],
  invalid: [
    {
      code: "variants({ base: 'border-zinc-200' });",
      errors: [{ messageId: 'raw', data: { token: 'border-zinc-200' } }],
    },
    {
      code: '@Component({ styles: `@scope (app-root) { :scope { --ink: #18332d } .x { color: #fff } }` }) class A {}',
      errors: [
        { messageId: 'palette', data: { name: '--ink', color: '#18332d' } },
        { messageId: 'literal', data: { color: '#fff' }, column: 81 },
      ],
    },
    {
      code: "@Component({ styles: [':host { background: white }'] }) class A {}",
      errors: [{ messageId: 'literal', data: { color: 'white' } }],
    },
  ],
});
