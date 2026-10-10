import { spawnSync } from 'node:child_process';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '../..');
const wrapperScript = path.join(repoRoot, 'scripts/with-eduvijna-api-env.mjs');
const markerScript = path.join(repoRoot, 'scripts/env-marker.mjs');

function runProductionRelease(inherited: string | undefined) {
  const env = { ...process.env };
  delete env.EDUVIJNA_API_ENV;
  delete env.EDUVIJNA_REQUIRE_PRODUCTION;
  if (inherited !== undefined) {
    env.EDUVIJNA_API_ENV = inherited;
  }

  return spawnSync(process.execPath, [wrapperScript, 'production-release', '--', process.execPath, markerScript], {
    env,
    encoding: 'utf8',
  });
}

function parseMarker(stdout: string) {
  const line = stdout
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.startsWith('{'));
  if (!line) {
    return null;
  }
  return JSON.parse(line) as {
    EDUVIJNA_API_ENV: string | null;
    EDUVIJNA_REQUIRE_PRODUCTION: string | null;
  };
}

describe('with-eduvijna-api-env.mjs production-release', () => {
  const developmentVariants = ['development', 'Development', '  development  '];

  it.each(developmentVariants)(
    'rejects inherited %p before launching child',
    (inherited) => {
      const result = runProductionRelease(inherited);
      expect(result.status).not.toBe(0);
      expect(parseMarker(result.stdout)).toBeNull();
    },
  );

  it('rejects invalid inherited selectors before launching child', () => {
    const result = runProductionRelease('staging');
    expect(result.status).not.toBe(0);
    expect(parseMarker(result.stdout)).toBeNull();
  });

  it('accepts unset inherited env and launches child with production + release guard', () => {
    const result = runProductionRelease(undefined);
    expect(result.status).toBe(0);
    const marker = parseMarker(result.stdout);
    expect(marker).toEqual({
      EDUVIJNA_API_ENV: 'production',
      EDUVIJNA_REQUIRE_PRODUCTION: '1',
    });
  });

  it('accepts normalized production inherited env and launches child', () => {
    const result = runProductionRelease(' PRODUCTION ');
    expect(result.status).toBe(0);
    const marker = parseMarker(result.stdout);
    expect(marker).toEqual({
      EDUVIJNA_API_ENV: 'production',
      EDUVIJNA_REQUIRE_PRODUCTION: '1',
    });
  });
});
