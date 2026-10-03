import type { Type } from '@angular/core';
import { BadgeDemoExample } from '@/examples/badge-demo';
import { BadgeLinkExample } from '@/examples/badge-link';
import { ButtonAnchorExample } from '@/examples/button-anchor';
import { ButtonLinkExample } from '@/examples/button-link';
import { ButtonSizesExample } from '@/examples/button-sizes';
import { ButtonVariantsExample } from '@/examples/button-variants';
import { DialogCloseButtonExample } from '@/examples/dialog-close-button';
import { DialogDemoExample } from '@/examples/dialog-demo';
import { InputDemoExample } from '@/examples/input-demo';
import { InputSignalFormsExample } from '@/examples/input-signal-forms';
import { InputWithButtonExample } from '@/examples/input-with-button';
import { LabelDemoExample } from '@/examples/label-demo';
import { LabelDisabledExample } from '@/examples/label-disabled';
import { PopoverDemoExample } from '@/examples/popover-demo';
import { PopoverPlacementExample } from '@/examples/popover-placement';
import { SeparatorDecorativeExample } from '@/examples/separator-decorative';
import { SeparatorDemoExample } from '@/examples/separator-demo';
import { TooltipDemoExample } from '@/examples/tooltip-demo';
import { TooltipIconButtonExample } from '@/examples/tooltip-icon-button';

/**
 * Every registry example, by name. The home page links each one at
 * `/examples/<name>`, so prerendering and the e2e quality crawl cover them
 * (ADR-0014). A unit test keeps this list in sync with `registry/examples`.
 */
export const EXAMPLES: Readonly<Record<string, Type<unknown>>> = {
  'badge-demo': BadgeDemoExample,
  'badge-link': BadgeLinkExample,
  'button-anchor': ButtonAnchorExample,
  'button-link': ButtonLinkExample,
  'button-sizes': ButtonSizesExample,
  'button-variants': ButtonVariantsExample,
  'dialog-close-button': DialogCloseButtonExample,
  'dialog-demo': DialogDemoExample,
  'input-demo': InputDemoExample,
  'input-signal-forms': InputSignalFormsExample,
  'input-with-button': InputWithButtonExample,
  'label-demo': LabelDemoExample,
  'label-disabled': LabelDisabledExample,
  'popover-demo': PopoverDemoExample,
  'popover-placement': PopoverPlacementExample,
  'separator-decorative': SeparatorDecorativeExample,
  'separator-demo': SeparatorDemoExample,
  'tooltip-demo': TooltipDemoExample,
  'tooltip-icon-button': TooltipIconButtonExample,
};
