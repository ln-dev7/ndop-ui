import { Component } from '@angular/core';
import { Button } from '@/ui/button/button';

/** The `link` variant: a button that looks like a text link. */
@Component({
  selector: 'example-button-link',
  imports: [Button],
  template: `<button ndButton variant="link">Link</button>`,
})
export class ButtonLinkExample {}
