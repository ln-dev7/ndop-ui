import { Component } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Button } from '@/ui/button/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/ui/empty/empty';

/** No projects yet, with actions to create one. */
@Component({
  selector: 'example-empty-demo',
  imports: [
    Button,
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    NdIcon,
  ],
  template: `
    <div ndEmpty class="border">
      <div ndEmptyHeader>
        <div ndEmptyMedia variant="icon"><svg ndIcon="folder-open"></svg></div>
        <h2 ndEmptyTitle>No projects yet</h2>
        <p ndEmptyDescription>
          You haven't created a project yet. Start by creating your first one.
        </p>
      </div>
      <div ndEmptyContent>
        <div class="flex gap-2">
          <button ndButton>Create project</button>
          <button ndButton variant="outline">Import project</button>
        </div>
        <a ndButton variant="link" href="#docs" size="sm"
          >Read about projects</a
        >
      </div>
    </div>
  `,
})
export class EmptyDemoExample {}
