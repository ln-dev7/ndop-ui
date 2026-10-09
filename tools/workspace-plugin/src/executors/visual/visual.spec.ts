import { connectEnv, dockerArgs, playwrightArgs } from './visual';

describe('visual executor', () => {
  it("starts the image's Playwright server at the image's version", () => {
    expect(
      dockerArgs('mcr.microsoft.com/playwright:v1.63.0-noble', 3333, 'n'),
    ).toEqual(
      expect.arrayContaining([
        '--publish',
        '3333:3333',
        'mcr.microsoft.com/playwright:v1.63.0-noble',
        'npx -y playwright@1.63.0 run-server --port 3333 --host 0.0.0.0',
      ]),
    );
  });

  it('refuses an image without a version', () => {
    expect(() => dockerArgs('playwright:latest', 3333, 'n')).toThrow(
      "Can't read the Playwright version",
    );
  });

  it('updates baselines only when asked', () => {
    expect(playwrightArgs({ config: 'c.mts' })).toEqual(['--config', 'c.mts']);
    expect(playwrightArgs({ config: 'c.mts', update: true })).toEqual([
      '--config',
      'c.mts',
      '--update-snapshots',
    ]);
  });

  it("connects to the remote browser and exposes the host's localhost", () => {
    expect(connectEnv(3333)).toEqual({
      PW_TEST_CONNECT_WS_ENDPOINT: 'ws://127.0.0.1:3333/',
      PW_TEST_CONNECT_EXPOSE_NETWORK: '<loopback>',
    });
  });
});
