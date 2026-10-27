import '@angular/compiler';
import { OVERLAY_DEFAULT_CONFIG } from '@angular/cdk/overlay';
import { TestBed } from '@angular/core/testing';
import { installNativeOverlayMocks } from '@ndop/testing/native-overlays';
import '@analogjs/vitest-angular/setup-snapshots';
import { setupTestBed } from '@analogjs/vitest-angular/setup-testbed';

installNativeOverlayMocks();
setupTestBed();

// Preserve the legacy CDK path while JSDOM supplies partial native API stubs.
beforeEach(() =>
  TestBed.configureTestingModule({
    providers: [
      { provide: OVERLAY_DEFAULT_CONFIG, useValue: { usePopover: false } },
    ],
  }),
);
