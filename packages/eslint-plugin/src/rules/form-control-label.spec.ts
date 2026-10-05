import { templateTester } from '../testing/testers';
import { formControlLabel } from './form-control-label';

templateTester().run('form-control-label', formControlLabel as never, {
  valid: [
    '<label ndLabel for="email">Email</label><input ndInput id="email" />',
    '<input ndInput id="email" /><label ndLabel for="email">Email</label>',
    '<label>Email <input ndInput /></label>',
    '<input ndInput aria-label="Search" />',
    '<input ndInput [attr.aria-labelledby]="labelId" />',
    '<input ndInput type="hidden" />',
    '<label ndLabel [for]="id">Email</label><input ndInput [id]="id" />',
    '<input type="text" />',
  ],
  invalid: [
    {
      code: '<input ndInput placeholder="Email" />',
      errors: [{ messageId: 'unlabelled' }],
    },
    {
      code: '<label ndLabel for="name">Name</label><input ndInput id="email" />',
      errors: [{ messageId: 'unlabelled' }],
    },
  ],
});
