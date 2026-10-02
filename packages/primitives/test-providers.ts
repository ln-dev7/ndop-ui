import { ComponentFixtureAutoDetect } from '@angular/core/testing';

/**
 * TestBed providers for this project's unit tests (the test target's
 * `providersFile`). Fixtures re-render automatically after state changes, as
 * they already do without zone.js; the CI zone.js variant needs it set
 * explicitly, so the same tests run in both modes.
 */
export default [{ provide: ComponentFixtureAutoDetect, useValue: true }];
