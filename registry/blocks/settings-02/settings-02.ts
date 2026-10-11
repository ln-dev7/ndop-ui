import { Component, signal } from '@angular/core';
import { disabled, form, FormField } from '@angular/forms/signals';
import { NdIcon } from '@ndop/core';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/ui/alert-dialog/alert-dialog';
import { Button } from '@/ui/button/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/ui/card/card';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/ui/form-field/form-field';
import {
  RadioGroup,
  RadioGroupIndicator,
  RadioGroupItem,
} from '@/ui/radio-group/radio-group';
import { Separator } from '@/ui/separator/separator';
import { Switch, SwitchThumb } from '@/ui/switch/switch';

/** One notification switch: its form key, label and help text. */
interface NotificationRow {
  readonly key: 'digest' | 'product' | 'security' | 'mentions' | 'reminders';
  readonly label: string;
  readonly description: string;
}

/**
 * A notification settings page: switches grouped by channel, which apply
 * as soon as they change (security alerts can't be turned off), a choice
 * of what to be notified about, and a danger zone whose "Delete account"
 * asks for confirmation in an alert dialog first.
 */
@Component({
  selector: 'block-settings-02',
  imports: [
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogOverlay,
    AlertDialogPortal,
    AlertDialogTitle,
    AlertDialogTrigger,
    Button,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Field,
    FieldContent,
    FieldDescription,
    FieldLabel,
    FieldLegend,
    FieldSet,
    FormField,
    NdIcon,
    RadioGroup,
    RadioGroupIndicator,
    RadioGroupItem,
    Separator,
    Switch,
    SwitchThumb,
  ],
  template: `
    <main class="min-h-svh bg-background text-foreground">
      <div
        class="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 md:px-8 md:py-12"
      >
        <div class="flex flex-col gap-1">
          <h1 class="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p class="text-muted-foreground">
            Choose how and when we get in touch with you.
          </p>
        </div>

        <section ndCard aria-labelledby="settings-02-channels-title">
          <div ndCardHeader>
            <h2 ndCardTitle id="settings-02-channels-title">Channels</h2>
            <p ndCardDescription>Changes are saved as soon as you make them.</p>
          </div>
          <div ndCardContent class="flex flex-col gap-6">
            @for (group of groups; track group.id; let last = $last) {
              <fieldset
                class="flex flex-col gap-4"
                [attr.aria-labelledby]="'settings-02-' + group.id + '-title'"
              >
                <h3
                  class="flex items-center gap-2 font-medium"
                  [id]="'settings-02-' + group.id + '-title'"
                >
                  <svg [ndIcon]="group.icon" class="size-4"></svg>
                  {{ group.title }}
                </h3>
                @for (row of group.rows; track row.key; let lastRow = $last) {
                  <div ndField orientation="horizontal">
                    <div ndFieldContent>
                      <label ndFieldLabel [for]="'settings-02-' + row.key">
                        {{ row.label }}
                      </label>
                      <p ndFieldDescription>{{ row.description }}</p>
                    </div>
                    <button
                      ndSwitch
                      [id]="'settings-02-' + row.key"
                      [formField]="settings[row.key]"
                    >
                      <span ndSwitchThumb></span>
                    </button>
                  </div>
                  @if (!lastRow) {
                    <div ndSeparator decorative></div>
                  }
                }
              </fieldset>
              @if (!last) {
                <div ndSeparator decorative></div>
              }
            }
          </div>
        </section>

        <section ndCard aria-labelledby="settings-02-activity-title">
          <div ndCardHeader>
            <h2 ndCardTitle id="settings-02-activity-title">Activity</h2>
            <p ndCardDescription>
              Pick which conversations reach you on every channel.
            </p>
          </div>
          <div ndCardContent>
            <fieldset ndFieldSet>
              <legend
                ndFieldLegend
                variant="label"
                id="settings-02-notify-legend"
              >
                Notify me about
              </legend>
              <div
                ndRadioGroup
                class="grid gap-3"
                aria-labelledby="settings-02-notify-legend"
                [formField]="settings.notify"
              >
                @for (option of notifyOptions; track option.value) {
                  <div class="flex items-start gap-3">
                    <button
                      ndRadioGroupItem
                      class="mt-0.5"
                      [value]="option.value"
                      [id]="'settings-02-notify-' + option.value"
                      [attr.aria-describedby]="
                        'settings-02-notify-' + option.value + '-description'
                      "
                    >
                      <span ndRadioGroupIndicator>
                        <svg ndIcon="circle"></svg>
                      </span>
                    </button>
                    <div class="flex flex-col gap-1">
                      <label
                        ndFieldLabel
                        [for]="'settings-02-notify-' + option.value"
                      >
                        {{ option.label }}
                      </label>
                      <p
                        class="text-sm text-muted-foreground"
                        [id]="
                          'settings-02-notify-' + option.value + '-description'
                        "
                      >
                        {{ option.description }}
                      </p>
                    </div>
                  </div>
                }
              </div>
            </fieldset>
          </div>
        </section>

        <section
          ndCard
          class="border-destructive/50"
          aria-labelledby="settings-02-danger-title"
        >
          <div ndCardHeader>
            <h2
              ndCardTitle
              id="settings-02-danger-title"
              class="text-destructive"
            >
              Danger zone
            </h2>
            <p ndCardDescription>
              Actions here are permanent. Take a moment before you go on.
            </p>
          </div>
          <div ndCardContent>
            <div
              class="flex flex-col gap-4 rounded-lg border border-destructive/50 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div class="flex flex-col gap-1">
                <h3 class="font-medium">Delete account</h3>
                <p class="text-sm text-muted-foreground">
                  Deletes your profile, projects and files for good.
                </p>
              </div>
              <ng-container ndAlertDialog>
                <button
                  ndButton
                  variant="destructive"
                  class="self-start sm:self-auto"
                  ndAlertDialogTrigger
                  [disabled]="deleted()"
                >
                  <svg ndIcon="trash-2"></svg>
                  Delete account
                </button>
                <ng-template ndAlertDialogPortal>
                  <div ndAlertDialogOverlay></div>
                  <div ndAlertDialogContent>
                    <div ndAlertDialogHeader>
                      <div ndAlertDialogMedia>
                        <svg ndIcon="triangle-alert"></svg>
                      </div>
                      <h2 ndAlertDialogTitle>Delete your account?</h2>
                      <p ndAlertDialogDescription>
                        Your profile, 12 projects and their files are deleted
                        for everyone. This can't be undone.
                      </p>
                    </div>
                    <div ndAlertDialogFooter>
                      <button ndAlertDialogCancel>Keep account</button>
                      <button
                        ndAlertDialogAction
                        variant="destructive"
                        (click)="deleted.set(true)"
                      >
                        Delete account
                      </button>
                    </div>
                  </div>
                </ng-template>
              </ng-container>
            </div>
            <p class="mt-4 text-sm text-muted-foreground" aria-live="polite">
              @if (deleted()) {
                Your account is scheduled for deletion. We've emailed you a link
                to cancel within 14 days.
              }
            </p>
          </div>
        </section>
      </div>
    </main>
  `,
})
export class Settings02Block {
  protected readonly groups: readonly {
    readonly id: string;
    readonly title: string;
    readonly icon: string;
    readonly rows: readonly NotificationRow[];
  }[] = [
    {
      id: 'email',
      title: 'Email',
      icon: 'mail',
      rows: [
        {
          key: 'digest',
          label: 'Weekly digest',
          description: 'A summary of activity in your projects, every Monday.',
        },
        {
          key: 'product',
          label: 'Product updates',
          description: 'New features, improvements and the occasional tip.',
        },
        {
          key: 'security',
          label: 'Security alerts',
          description:
            'Sign-ins from new devices and password changes. Always on.',
        },
      ],
    },
    {
      id: 'push',
      title: 'Push',
      icon: 'bell',
      rows: [
        {
          key: 'mentions',
          label: 'Mentions',
          description: 'When someone mentions you in a comment or a task.',
        },
        {
          key: 'reminders',
          label: 'Reminders',
          description: 'Due dates and reminders you set yourself.',
        },
      ],
    },
  ];

  protected readonly notifyOptions = [
    {
      value: 'all',
      label: 'All new activity',
      description: 'Every comment, task and status change.',
    },
    {
      value: 'mentions',
      label: 'Direct messages and mentions',
      description: 'Only what is addressed to you.',
    },
    {
      value: 'none',
      label: 'Nothing',
      description: 'Security alerts still reach you by email.',
    },
  ];

  protected readonly model = signal({
    digest: true,
    product: false,
    security: true,
    mentions: true,
    reminders: false,
    notify: 'mentions',
  });

  protected readonly settings = form(this.model, (path) => {
    disabled(path.security);
  });

  protected readonly deleted = signal(false);
}
