import { Component, signal } from '@angular/core';
import { form, FormField, maxLength, required } from '@angular/forms/signals';
import { Button } from '@/ui/button/button';
import { Label } from '@/ui/label/label';
import { Textarea } from '@/ui/textarea/textarea';

/**
 * A required message field in a Signal Forms form. It turns invalid once
 * touched, says why under the field, and counts what's left.
 */
@Component({
  selector: 'example-textarea-form',
  imports: [Button, FormField, Label, Textarea],
  template: `
    <form class="grid w-full max-w-sm gap-3" (submit)="send($event)">
      <label ndLabel for="textarea-form-bio">Bio</label>
      <textarea
        ndTextarea
        id="textarea-form-bio"
        placeholder="Tell us a little about yourself."
        aria-describedby="textarea-form-hint"
        [formField]="profile.bio"
      ></textarea>
      <p id="textarea-form-hint" class="text-sm text-muted-foreground">
        @if (profile.bio().touched() && profile.bio().invalid()) {
          Write a bio of up to 160 characters.
        } @else {
          {{ 160 - model().bio.length }} characters left.
        }
      </p>
      <button ndButton type="submit" class="justify-self-start">Save</button>
    </form>
  `,
})
export class TextareaFormExample {
  protected readonly model = signal({ bio: '' });

  protected readonly profile = form(this.model, (path) => {
    required(path.bio);
    maxLength(path.bio, 160);
  });

  /**
   * Marks the fields touched, so errors show, instead of reloading.
   *
   * @param event - The form's submit event.
   */
  protected send(event: Event): void {
    event.preventDefault();
    this.profile().markAsTouched();
  }
}
