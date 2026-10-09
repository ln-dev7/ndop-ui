import type { Type } from '@angular/core';
import { AlertDemoExample } from '@/examples/alert-demo';
import { AlertDestructiveExample } from '@/examples/alert-destructive';
import { AspectRatioDemoExample } from '@/examples/aspect-ratio-demo';
import { AspectRatioSquareExample } from '@/examples/aspect-ratio-square';
import { AvatarDemoExample } from '@/examples/avatar-demo';
import { AvatarGroupExample } from '@/examples/avatar-group';
import { BadgeDemoExample } from '@/examples/badge-demo';
import { BadgeLinkExample } from '@/examples/badge-link';
import { BadgeVariantsExample } from '@/examples/badge-variants';
import { BreadcrumbDemoExample } from '@/examples/breadcrumb-demo';
import { BreadcrumbSeparatorExample } from '@/examples/breadcrumb-separator';
import { ButtonAnchorExample } from '@/examples/button-anchor';
import { ButtonLinkExample } from '@/examples/button-link';
import { ButtonSizesExample } from '@/examples/button-sizes';
import { ButtonVariantsExample } from '@/examples/button-variants';
import { CardDemoExample } from '@/examples/card-demo';
import { CardWithActionExample } from '@/examples/card-with-action';
import { CollapsibleDemoExample } from '@/examples/collapsible-demo';
import { CollapsibleSettingsExample } from '@/examples/collapsible-settings';
import { DialogCloseButtonExample } from '@/examples/dialog-close-button';
import { DialogDemoExample } from '@/examples/dialog-demo';
import { DialogUnsavedChangesExample } from '@/examples/dialog-unsaved-changes';
import { EmptyAvatarExample } from '@/examples/empty-avatar';
import { EmptyDemoExample } from '@/examples/empty-demo';
import { EmptySearchExample } from '@/examples/empty-search';
import { InputDemoExample } from '@/examples/input-demo';
import { InputDisabledExample } from '@/examples/input-disabled';
import { InputSignalFormsExample } from '@/examples/input-signal-forms';
import { InputWithButtonExample } from '@/examples/input-with-button';
import { LabelDemoExample } from '@/examples/label-demo';
import { LabelDisabledExample } from '@/examples/label-disabled';
import { PaginationDemoExample } from '@/examples/pagination-demo';
import { PaginationStateExample } from '@/examples/pagination-state';
import { PopoverDemoExample } from '@/examples/popover-demo';
import { PopoverPlacementExample } from '@/examples/popover-placement';
import { ProgressDemoExample } from '@/examples/progress-demo';
import { ProgressUploadExample } from '@/examples/progress-upload';
import { ScrollAreaDemoExample } from '@/examples/scroll-area-demo';
import { ScrollAreaHorizontalExample } from '@/examples/scroll-area-horizontal';
import { SeparatorDecorativeExample } from '@/examples/separator-decorative';
import { SeparatorDemoExample } from '@/examples/separator-demo';
import { SkeletonCardExample } from '@/examples/skeleton-card';
import { SkeletonDemoExample } from '@/examples/skeleton-demo';
import { SpinnerButtonExample } from '@/examples/spinner-button';
import { SpinnerDemoExample } from '@/examples/spinner-demo';
import { TableDemoExample } from '@/examples/table-demo';
import { TableStatusExample } from '@/examples/table-status';
import { TextareaDemoExample } from '@/examples/textarea-demo';
import { TextareaDisabledExample } from '@/examples/textarea-disabled';
import { TextareaFormExample } from '@/examples/textarea-form';
import { TooltipDemoExample } from '@/examples/tooltip-demo';
import { TooltipIconButtonExample } from '@/examples/tooltip-icon-button';
import { TooltipSidesExample } from '@/examples/tooltip-sides';

/**
 * Every registry example, by name. The home page links each one at
 * `/examples/<name>`, so prerendering and the e2e quality crawl cover them
 * (ADR-0014). A unit test keeps this list in sync with `registry/examples`.
 */
export const EXAMPLES: Readonly<Record<string, Type<unknown>>> = {
  'alert-demo': AlertDemoExample,
  'alert-destructive': AlertDestructiveExample,
  'aspect-ratio-demo': AspectRatioDemoExample,
  'aspect-ratio-square': AspectRatioSquareExample,
  'avatar-demo': AvatarDemoExample,
  'avatar-group': AvatarGroupExample,
  'badge-demo': BadgeDemoExample,
  'badge-link': BadgeLinkExample,
  'badge-variants': BadgeVariantsExample,
  'breadcrumb-demo': BreadcrumbDemoExample,
  'breadcrumb-separator': BreadcrumbSeparatorExample,
  'button-anchor': ButtonAnchorExample,
  'button-link': ButtonLinkExample,
  'button-sizes': ButtonSizesExample,
  'button-variants': ButtonVariantsExample,
  'card-demo': CardDemoExample,
  'card-with-action': CardWithActionExample,
  'collapsible-demo': CollapsibleDemoExample,
  'collapsible-settings': CollapsibleSettingsExample,
  'dialog-close-button': DialogCloseButtonExample,
  'dialog-demo': DialogDemoExample,
  'dialog-unsaved-changes': DialogUnsavedChangesExample,
  'empty-avatar': EmptyAvatarExample,
  'empty-demo': EmptyDemoExample,
  'empty-search': EmptySearchExample,
  'input-demo': InputDemoExample,
  'input-disabled': InputDisabledExample,
  'input-signal-forms': InputSignalFormsExample,
  'input-with-button': InputWithButtonExample,
  'label-demo': LabelDemoExample,
  'label-disabled': LabelDisabledExample,
  'pagination-demo': PaginationDemoExample,
  'pagination-state': PaginationStateExample,
  'popover-demo': PopoverDemoExample,
  'popover-placement': PopoverPlacementExample,
  'progress-demo': ProgressDemoExample,
  'progress-upload': ProgressUploadExample,
  'scroll-area-demo': ScrollAreaDemoExample,
  'scroll-area-horizontal': ScrollAreaHorizontalExample,
  'separator-decorative': SeparatorDecorativeExample,
  'separator-demo': SeparatorDemoExample,
  'skeleton-card': SkeletonCardExample,
  'skeleton-demo': SkeletonDemoExample,
  'spinner-button': SpinnerButtonExample,
  'spinner-demo': SpinnerDemoExample,
  'table-demo': TableDemoExample,
  'table-status': TableStatusExample,
  'textarea-demo': TextareaDemoExample,
  'textarea-disabled': TextareaDisabledExample,
  'textarea-form': TextareaFormExample,
  'tooltip-demo': TooltipDemoExample,
  'tooltip-icon-button': TooltipIconButtonExample,
  'tooltip-sides': TooltipSidesExample,
};
