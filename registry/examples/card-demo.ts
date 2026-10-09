import { Component } from '@angular/core';
import { Button } from '@/ui/button/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/ui/card/card';
import { Input } from '@/ui/input/input';
import { Label } from '@/ui/label/label';

/** A sign-in form in a card. */
@Component({
  selector: 'example-card-demo',
  imports: [
    Button,
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
    Input,
    Label,
  ],
  template: `
    <section ndCard class="w-full max-w-sm" aria-labelledby="card-demo-title">
      <div ndCardHeader>
        <h2 ndCardTitle id="card-demo-title">Sign in to your account</h2>
        <p ndCardDescription>Enter your email below to sign in.</p>
        <div ndCardAction>
          <a ndButton variant="link" href="#sign-up">Sign up</a>
        </div>
      </div>
      <form ndCardContent id="card-demo-form" class="grid gap-6">
        <div class="grid gap-2">
          <label ndLabel for="card-demo-email">Email</label>
          <input
            ndInput
            id="card-demo-email"
            type="email"
            placeholder="m@example.com"
            required
          />
        </div>
        <div class="grid gap-2">
          <div class="flex items-center">
            <label ndLabel for="card-demo-password">Password</label>
            <a
              href="#forgot"
              class="ms-auto text-sm underline-offset-4 hover:underline"
              >Forgot your password?</a
            >
          </div>
          <input ndInput id="card-demo-password" type="password" required />
        </div>
      </form>
      <div ndCardFooter class="flex-col gap-2">
        <button ndButton type="submit" form="card-demo-form" class="w-full">
          Sign in
        </button>
      </div>
    </section>
  `,
})
export class CardDemoExample {}
