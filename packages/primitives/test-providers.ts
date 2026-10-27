import { OVERLAY_DEFAULT_CONFIG } from '@angular/cdk/overlay';
import { installNativeOverlayMocks } from './src/testing/native-overlays';
import { ComponentFixtureAutoDetect } from '@angular/core/testing';

installNativeOverlayMocks();

/**
 * TestBed providers for this project's unit tests (the test target's
 * `providersFile`). Fixtures re-render automatically after state changes, as
 * they already do without zone.js; the CI zone.js variant needs it set
 * explicitly, so the same tests run in both modes.
 */
export default [
  { provide: ComponentFixtureAutoDetect, useValue: true },
  // Native API stubs must not change feature detection for legacy CDK overlays.
  { provide: OVERLAY_DEFAULT_CONFIG, useValue: { usePopover: false } },
];
