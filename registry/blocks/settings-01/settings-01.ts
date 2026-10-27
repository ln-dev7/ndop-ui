import { Component, computed, signal } from '@angular/core';
import {
  email,
  form,
  FormField,
  maxLength,
  pattern,
  required,
} from '@angular/forms/signals';
import { NdIcon } from '@ndop/core';
import { Avatar, AvatarFallback } from '@/ui/avatar/avatar';
import { Button } from '@/ui/button/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/ui/card/card';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/ui/form-field/form-field';
import { Input } from '@/ui/input/input';
import { Label } from '@/ui/label/label';
import {
  RadioGroup,
  RadioGroupIndicator,
  RadioGroupItem,
} from '@/ui/radio-group/radio-group';
import {
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectTrigger,
} from '@/ui/select/select';
import { Separator } from '@/ui/separator/separator';
import { Textarea } from '@/ui/textarea/textarea';
import {
  NdSelect as Select,
  NdSelectItemText as SelectItemText,
  NdSelectValue as SelectValue,
} from '@ndop/primitives/select';

/**
 * A settings page: a secondary nav of settings sections, which scrolls
 * sideways on small screens, beside two Signal Forms cards for the profile
 * and the account. Each card validates and saves on its own, and says so
 * in a status message that clears as soon as the form is edited again.
 */
@Component({
  selector: 'block-settings-01',
  imports: [
    Avatar,
    AvatarFallback,
    Button,
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSet,
    FormField,
    Input,
    Label,
    NdIcon,
    RadioGroup,
    RadioGroupIndicator,
    RadioGroupItem,
    Select,
    SelectContent,
    SelectItem,
    SelectItemIndicator,
    SelectItemText,
    SelectTrigger,
    SelectValue,
    Separator,
    Textarea,
  ],
  template: `
    <main class="min-h-svh bg-background text-foreground">
      <div
        class="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-8 md:py-12"
      >
        <div class="flex flex-col gap-1">
          <h1 class="text-2xl font-semibold tracking-tight">Settings</h1>
          <p class="text-muted-foreground">
            Manage your profile, account and preferences.
          </p>
        </div>
        <div ndSeparator decorative></div>
        <div class="flex flex-col gap-6 md:flex-row md:gap-10">
          <nav
            aria-label="Settings"
            class="-mx-4 shrink-0 overflow-x-auto px-4 md:mx-0 md:w-48 md:px-0"
          >
            <ul class="flex gap-1 md:flex-col">
              @for (section of sections; track section.href) {
                <li>
                  <a
                    [href]="section.href"
                    [attr.aria-current]="section.current ? 'page' : null"
                    class="flex items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-[current=page]:bg-muted aria-[current=page]:font-medium aria-[current=page]:text-foreground"
                  >
                    <svg [ndIcon]="section.icon" class="size-4"></svg>
                    {{ section.label }}
                  </a>
                </li>
              }
            </ul>
          </nav>
          <div class="flex min-w-0 flex-1 flex-col gap-6">
            <form
              ndCard
              aria-labelledby="settings-01-profile-title"
              novalidate
              (submit)="saveProfile($event)"
            >
              <div ndCardHeader>
                <h2 ndCardTitle id="settings-01-profile-title">Profile</h2>
                <p ndCardDescription>This is how others see you on the site.</p>
              </div>
              <div ndCardContent>
                <div ndFieldGroup>
                  <div class="flex items-center gap-4">
                    <span ndAvatar size="lg">
                      <span ndAvatarFallback>{{ initials() }}</span>
                    </span>
                    <div class="flex flex-col gap-1">
                      <span class="text-sm font-medium">Profile picture</span>
                      <span class="text-sm text-muted-foreground">
                        Your initials show until you add a picture.
                      </span>
                    </div>
                  </div>
                  <div ndField>
                    <label ndFieldLabel for="settings-01-name">
                      Display name
                    </label>
                    <input
                      ndInput
                      id="settings-01-name"
                      autocomplete="name"
                      [formField]="profile.name"
                    />
                    <p ndFieldDescription>
                      Your full name, or the name people know you by.
                    </p>
                    <div ndFieldError>
                      @for (
                        error of profile.name().errors();
                        track error.kind
                      ) {
                        <p>{{ error.message }}</p>
                      }
                    </div>
                  </div>
                  <div ndField>
                    <label ndFieldLabel for="settings-01-username">
                      Username
                    </label>
                    <input
                      ndInput
                      id="settings-01-username"
                      autocomplete="username"
                      spellcheck="false"
                      [formField]="profile.username"
                    />
                    <p ndFieldDescription>
                      3 to 20 lowercase letters, digits or underscores.
                    </p>
                    <div ndFieldError>
                      @for (
                        error of profile.username().errors();
                        track error.kind
                      ) {
                        <p>{{ error.message }}</p>
                      }
                    </div>
                  </div>
                  <div ndField>
                    <label ndFieldLabel for="settings-01-bio">Bio</label>
                    <textarea
                      ndTextarea
                      id="settings-01-bio"
                      rows="3"
                      [formField]="profile.bio"
                    ></textarea>
                    <p ndFieldDescription>
                      {{ 160 - profileModel().bio.length }} characters left.
                    </p>
                    <div ndFieldError>
                      @for (error of profile.bio().errors(); track error.kind) {
                        <p>{{ error.message }}</p>
                      }
                    </div>
                  </div>
                </div>
              </div>
              <div ndCardFooter class="flex-wrap gap-4 border-t">
                <button ndButton type="submit">Save profile</button>
                <p
                  role="status"
                  class="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  @if (profileSaved()) {
                    <svg ndIcon="circle-check" class="size-4"></svg>
                    Profile saved.
                  }
                </p>
              </div>
            </form>

            <form
              ndCard
              aria-labelledby="settings-01-account-title"
              novalidate
              (submit)="saveAccount($event)"
            >
              <div ndCardHeader>
                <h2 ndCardTitle id="settings-01-account-title">Account</h2>
                <p ndCardDescription>
                  Your sign-in email and how the app looks to you.
                </p>
              </div>
              <div ndCardContent>
                <div ndFieldGroup>
                  <div ndField>
                    <label ndFieldLabel for="settings-01-email">Email</label>
                    <input
                      ndInput
                      id="settings-01-email"
                      type="email"
                      autocomplete="email"
                      [formField]="account.email"
                    />
                    <p ndFieldDescription>
                      We send sign-in links and receipts here.
                    </p>
                    <div ndFieldError>
                      @for (
                        error of account.email().errors();
                        track error.kind
                      ) {
                        <p>{{ error.message }}</p>
                      }
                    </div>
                  </div>
                  <div ndField>
                    <label ndFieldLabel for="settings-01-language">
                      Language
                    </label>
                    <ng-container ndSelect>
                      <button
                        ndSelectTrigger
                        id="settings-01-language"
                        class="w-full sm:w-64"
                        [formField]="account.language"
                      >
                        <span
                          ndSelectValue
                          placeholder="Select a language"
                        ></span>
                        <svg
                          ndIcon="chevron-down"
                          class="size-4 opacity-50"
                        ></svg>
                      </button>
                      <div ndSelectContent>
                        @for (option of languages; track option.value) {
                          <div ndSelectItem [value]="option.value">
                            <span ndSelectItemIndicator>
                              <svg ndIcon="check"></svg>
                            </span>
                            <span ndSelectItemText>{{ option.label }}</span>
                          </div>
                        }
                      </div>
                    </ng-container>
                  </div>
                  <fieldset ndFieldSet>
                    <legend
                      ndFieldLegend
                      variant="label"
                      id="settings-01-theme-legend"
                    >
                      Theme
                    </legend>
                    <div
                      ndRadioGroup
                      class="grid gap-3"
                      aria-labelledby="settings-01-theme-legend"
                      [formField]="account.theme"
                    >
                      @for (option of themes; track option.value) {
                        <div class="flex items-center gap-3">
                          <button
                            ndRadioGroupItem
                            [value]="option.value"
                            [id]="'settings-01-theme-' + option.value"
                          >
                            <span ndRadioGroupIndicator>
                              <svg ndIcon="circle"></svg>
                            </span>
                          </button>
                          <label
                            ndLabel
                            [for]="'settings-01-theme-' + option.value"
                          >
                            {{ option.label }}
                          </label>
                        </div>
                      }
                    </div>
                  </fieldset>
                </div>
              </div>
              <div ndCardFooter class="flex-wrap gap-4 border-t">
                <button ndButton type="submit">Save account</button>
                <p
                  role="status"
                  class="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  @if (accountSaved()) {
                    <svg ndIcon="circle-check" class="size-4"></svg>
                    Account saved.
                  }
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  `,
})
export class Settings01Block {
  protected readonly sections = [
    {
      label: 'Profile',
      href: '/settings/profile',
      icon: 'user',
      current: true,
    },
    {
      label: 'Account',
      href: '/settings/account',
      icon: 'key-round',
      current: false,
    },
    {
      label: 'Appearance',
      href: '/settings/appearance',
      icon: 'sparkles',
      current: false,
    },
    {
      label: 'Notifications',
      href: '/settings/notifications',
      icon: 'bell',
      current: false,
    },
  ];

  protected readonly languages = [
    { value: 'en', label: 'English' },
    { value: 'fr', label: 'Français' },
    { value: 'de', label: 'Deutsch' },
    { value: 'es', label: 'Español' },
    { value: 'pt', label: 'Português' },
  ];

  protected readonly themes = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'Match my system' },
  ];

  protected readonly profileModel = signal({
    name: 'Ada Lovelace',
    username: 'ada',
    bio: 'I write programs for engines that do not exist yet.',
  });

  protected readonly profile = form(this.profileModel, (path) => {
    required(path.name, { message: 'Enter a display name.' });
    maxLength(path.name, 50, { message: 'Use at most 50 characters.' });
    required(path.username, { message: 'Choose a username.' });
    pattern(path.username, /^[a-z0-9_]{3,20}$/, {
      message: 'Use 3 to 20 lowercase letters, digits or underscores.',
    });
    maxLength(path.bio, 160, { message: 'Keep your bio to 160 characters.' });
  });

  protected readonly accountModel = signal({
    email: 'ada@example.com',
    language: 'en',
    theme: 'system',
  });

  protected readonly account = form(this.accountModel, (path) => {
    required(path.email, { message: 'Enter your email.' });
    email(path.email, { message: 'Enter an email like ada@example.com.' });
    required(path.language);
  });

  protected readonly initials = computed(
    () =>
      this.profileModel()
        .name.split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase())
        .join('') || '?',
  );

  // Each edit replaces the model object, so comparing references clears the
  // "saved" message as soon as the form changes again.
  private readonly savedProfile = signal<object | null>(null);
  private readonly savedAccount = signal<object | null>(null);

  protected readonly profileSaved = computed(
    () => this.savedProfile() === this.profileModel(),
  );

  protected readonly accountSaved = computed(
    () => this.savedAccount() === this.accountModel(),
  );

  /**
   * Shows the profile's errors, or saves it when it's valid.
   *
   * @param event - The form's submit event.
   */
  protected saveProfile(event: Event): void {
    event.preventDefault();
    this.profile().markAsTouched();
    if (this.profile().valid()) {
      this.savedProfile.set(this.profileModel());
    }
  }

  /**
   * Shows the account's errors, or saves it when it's valid.
   *
   * @param event - The form's submit event.
   */
  protected saveAccount(event: Event): void {
    event.preventDefault();
    this.account().markAsTouched();
    if (this.account().valid()) {
      this.savedAccount.set(this.accountModel());
    }
  }
}
