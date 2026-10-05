import { templateTester } from '../testing/testers';
import { dialogTitle } from './dialog-title';

templateTester().run('dialog-title', dialogTitle as never, {
  valid: [
    '<div ndDialogContent><h2 ndDialogTitle>Edit profile</h2></div>',
    '<div ndDialogContent><div ndDialogHeader>@if (x) {<h2 ndDialogTitle>A</h2>}</div></div>',
    '<div ndDialogContent aria-label="Search"></div>',
    '<div ndPopoverContent><p>No title needed</p></div>',
  ],
  invalid: [
    {
      code: '<ng-template ndDialogPortal><div ndDialogContent><p>Sure?</p></div></ng-template>',
      errors: [{ messageId: 'missing', data: { title: '`[ndDialogTitle]`' } }],
    },
  ],
});
