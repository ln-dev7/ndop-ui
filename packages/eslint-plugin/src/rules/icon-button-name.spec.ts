import { templateTester } from '../testing/testers';
import { iconButtonName } from './icon-button-name';

templateTester().run('icon-button-name', iconButtonName as never, {
  valid: [
    '<button ndButton aria-label="Close"><svg ndIcon="x"></svg></button>',
    '<button ndButton [attr.aria-label]="label"><svg ndIcon="x"></svg></button>',
    '<button ndButton><svg ndIcon="x"></svg><span class="sr-only">Close</span></button>',
    '<button ndButton>Save</button>',
    '<button ndButton>{{ label }}</button>',
    '<a ndButton href="/"><svg ndIcon="home"></svg> Home</a>',
    '<button ndButton><app-avatar /></button>',
    '<button ndButton><ng-content /></button>',
    '<a href="/"><svg></svg></a>',
    '<button ndButton>@if (saving) { Saving } @else { <svg ndIcon="save"></svg> Save }</button>',
    '<button ndCheckbox id="terms"><span ndCheckboxIndicator><svg ndIcon="check"></svg></span></button>',
  ],
  invalid: [
    {
      code: '<button ndButton size="icon"><svg ndIcon="x"></svg></button>',
      errors: [{ messageId: 'iconOnly' }],
    },
    {
      code: '<a ndButton href="/"><lucide-icon name="home" /></a>',
      errors: [{ messageId: 'iconOnly' }],
    },
    {
      code: '<button ndDialogCloseButton><svg ndIcon="x"></svg><span aria-hidden="true">×</span></button>',
      errors: [{ messageId: 'iconOnly' }],
    },
    {
      code: '<button type="button"></button>',
      errors: [{ messageId: 'empty' }],
    },
  ],
});
