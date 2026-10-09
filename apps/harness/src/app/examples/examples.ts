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
import { CheckboxDemoExample } from '@/examples/checkbox-demo';
import { CheckboxDisabledExample } from '@/examples/checkbox-disabled';
import { CheckboxFormExample } from '@/examples/checkbox-form';
import { CheckboxIndeterminateExample } from '@/examples/checkbox-indeterminate';
import { CollapsibleDemoExample } from '@/examples/collapsible-demo';
import { CollapsibleSettingsExample } from '@/examples/collapsible-settings';
import { DialogCloseButtonExample } from '@/examples/dialog-close-button';
import { DialogDemoExample } from '@/examples/dialog-demo';
import { DialogUnsavedChangesExample } from '@/examples/dialog-unsaved-changes';
import { EmptyAvatarExample } from '@/examples/empty-avatar';
import { EmptyDemoExample } from '@/examples/empty-demo';
import { EmptySearchExample } from '@/examples/empty-search';
import { FormFieldChoiceCardExample } from '@/examples/form-field-choice-card';
import { FormFieldDemoExample } from '@/examples/form-field-demo';
import { FormFieldFieldsetExample } from '@/examples/form-field-fieldset';
import { FormFieldHorizontalExample } from '@/examples/form-field-horizontal';
import { InputDemoExample } from '@/examples/input-demo';
import { InputDisabledExample } from '@/examples/input-disabled';
import { InputOtpDemoExample } from '@/examples/input-otp-demo';
import { InputOtpDisabledExample } from '@/examples/input-otp-disabled';
import { InputOtpPatternExample } from '@/examples/input-otp-pattern';
import { InputOtpVerifyExample } from '@/examples/input-otp-verify';
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
import { RadioGroupCardsExample } from '@/examples/radio-group-cards';
import { RadioGroupDemoExample } from '@/examples/radio-group-demo';
import { RadioGroupDisabledExample } from '@/examples/radio-group-disabled';
import { RadioGroupFormExample } from '@/examples/radio-group-form';
import { ScrollAreaDemoExample } from '@/examples/scroll-area-demo';
import { ScrollAreaHorizontalExample } from '@/examples/scroll-area-horizontal';
import { SeparatorDecorativeExample } from '@/examples/separator-decorative';
import { SeparatorDemoExample } from '@/examples/separator-demo';
import { SkeletonCardExample } from '@/examples/skeleton-card';
import { SkeletonDemoExample } from '@/examples/skeleton-demo';
import { SliderDemoExample } from '@/examples/slider-demo';
import { SliderDisabledExample } from '@/examples/slider-disabled';
import { SliderRangeExample } from '@/examples/slider-range';
import { SliderStepsExample } from '@/examples/slider-steps';
import { SliderVerticalExample } from '@/examples/slider-vertical';
import { SpinnerButtonExample } from '@/examples/spinner-button';
import { SpinnerDemoExample } from '@/examples/spinner-demo';
import { SwitchDemoExample } from '@/examples/switch-demo';
import { SwitchDisabledExample } from '@/examples/switch-disabled';
import { SwitchFormExample } from '@/examples/switch-form';
import { SwitchSmallExample } from '@/examples/switch-small';
import { TableDemoExample } from '@/examples/table-demo';
import { TableStatusExample } from '@/examples/table-status';
import { TextareaDemoExample } from '@/examples/textarea-demo';
import { TextareaDisabledExample } from '@/examples/textarea-disabled';
import { TextareaFormExample } from '@/examples/textarea-form';
import { ToggleDemoExample } from '@/examples/toggle-demo';
import { ToggleDisabledExample } from '@/examples/toggle-disabled';
import { ToggleGroupDemoExample } from '@/examples/toggle-group-demo';
import { ToggleGroupDisabledExample } from '@/examples/toggle-group-disabled';
import { ToggleGroupSingleExample } from '@/examples/toggle-group-single';
import { ToggleGroupSizesExample } from '@/examples/toggle-group-sizes';
import { ToggleGroupSpacingExample } from '@/examples/toggle-group-spacing';
import { ToggleGroupVerticalExample } from '@/examples/toggle-group-vertical';
import { ToggleOutlineExample } from '@/examples/toggle-outline';
import { ToggleSizesExample } from '@/examples/toggle-sizes';
import { ToggleWithTextExample } from '@/examples/toggle-with-text';
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
  'checkbox-demo': CheckboxDemoExample,
  'checkbox-disabled': CheckboxDisabledExample,
  'checkbox-form': CheckboxFormExample,
  'checkbox-indeterminate': CheckboxIndeterminateExample,
  'collapsible-demo': CollapsibleDemoExample,
  'collapsible-settings': CollapsibleSettingsExample,
  'dialog-close-button': DialogCloseButtonExample,
  'dialog-demo': DialogDemoExample,
  'dialog-unsaved-changes': DialogUnsavedChangesExample,
  'empty-avatar': EmptyAvatarExample,
  'empty-demo': EmptyDemoExample,
  'empty-search': EmptySearchExample,
  'form-field-choice-card': FormFieldChoiceCardExample,
  'form-field-demo': FormFieldDemoExample,
  'form-field-fieldset': FormFieldFieldsetExample,
  'form-field-horizontal': FormFieldHorizontalExample,
  'input-demo': InputDemoExample,
  'input-disabled': InputDisabledExample,
  'input-otp-demo': InputOtpDemoExample,
  'input-otp-disabled': InputOtpDisabledExample,
  'input-otp-pattern': InputOtpPatternExample,
  'input-otp-verify': InputOtpVerifyExample,
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
  'radio-group-cards': RadioGroupCardsExample,
  'radio-group-demo': RadioGroupDemoExample,
  'radio-group-disabled': RadioGroupDisabledExample,
  'radio-group-form': RadioGroupFormExample,
  'scroll-area-demo': ScrollAreaDemoExample,
  'scroll-area-horizontal': ScrollAreaHorizontalExample,
  'separator-decorative': SeparatorDecorativeExample,
  'separator-demo': SeparatorDemoExample,
  'skeleton-card': SkeletonCardExample,
  'skeleton-demo': SkeletonDemoExample,
  'slider-demo': SliderDemoExample,
  'slider-disabled': SliderDisabledExample,
  'slider-range': SliderRangeExample,
  'slider-steps': SliderStepsExample,
  'slider-vertical': SliderVerticalExample,
  'spinner-button': SpinnerButtonExample,
  'spinner-demo': SpinnerDemoExample,
  'switch-demo': SwitchDemoExample,
  'switch-disabled': SwitchDisabledExample,
  'switch-form': SwitchFormExample,
  'switch-small': SwitchSmallExample,
  'table-demo': TableDemoExample,
  'table-status': TableStatusExample,
  'textarea-demo': TextareaDemoExample,
  'textarea-disabled': TextareaDisabledExample,
  'textarea-form': TextareaFormExample,
  'toggle-demo': ToggleDemoExample,
  'toggle-disabled': ToggleDisabledExample,
  'toggle-group-demo': ToggleGroupDemoExample,
  'toggle-group-disabled': ToggleGroupDisabledExample,
  'toggle-group-single': ToggleGroupSingleExample,
  'toggle-group-sizes': ToggleGroupSizesExample,
  'toggle-group-spacing': ToggleGroupSpacingExample,
  'toggle-group-vertical': ToggleGroupVerticalExample,
  'toggle-outline': ToggleOutlineExample,
  'toggle-sizes': ToggleSizesExample,
  'toggle-with-text': ToggleWithTextExample,
  'tooltip-demo': TooltipDemoExample,
  'tooltip-icon-button': TooltipIconButtonExample,
  'tooltip-sides': TooltipSidesExample,
};
