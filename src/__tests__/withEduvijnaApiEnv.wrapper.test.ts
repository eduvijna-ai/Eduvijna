import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '../..');
const wrapperScript = path.join(repoRoot, 'scripts/with-eduvijna-api-env.mjs');
const markerScript = path.join(repoRoot, 'scripts/env-marker.mjs');

function runProductionRelease(inherited: string | undefined, markerOut?: string) {
  const env = { ...process.env };
  delete env.EDUVIJNA_API_ENV;
  delete env.EDUVIJNA_REQUIRE_PRODUCTION;
  if (inherited !== undefined) {
    env.EDUVIJNA_API_ENV = inherited;
  }

  const markerArgs = markerOut ? [process.execPath, markerScript, markerOut] : [process.execPath, markerScript];

  return spawnSync(process.execPath, [wrapperScript, 'production-release', '--', ...markerArgs], {
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function readMarkerFile(markerOut: string) {
  try {
    return JSON.parse(readFileSync(markerOut, 'utf8')) as {
      EDUVIJNA_API_ENV: string | null;
      EDUVIJNA_REQUIRE_PRODUCTION: string | null;
    };
  } catch {
    return null;
  }
}

describe('with-eduvijna-api-env.mjs production-release', () => {
  const developmentVariants = ['development', 'Development', '  development  '];

  it.each(developmentVariants)(
    'rejects inherited %p before launching child',
    (inherited) => {
      const dir = mkdtempSync(path.join(tmpdir(), 'eduvijna-marker-'));
      const markerOut = path.join(dir, 'marker.json');
      const result = runProductionRelease(inherited, markerOut);
      expect(result.status).not.toBe(0);
      expect(readMarkerFile(markerOut)).toBeNull();
      rmSync(dir, { recursive: true, force: true });
    },
  );

  it('rejects invalid inherited selectors before launching child', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'eduvijna-marker-'));
    const markerOut = path.join(dir, 'marker.json');
    const result = runProductionRelease('staging', markerOut);
    expect(result.status).not.toBe(0);
    expect(readMarkerFile(markerOut)).toBeNull();
    rmSync(dir, { recursive: true, force: true });
  });

  it('accepts unset inherited env and launches child with production + release guard', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'eduvijna-marker-'));
    const markerOut = path.join(dir, 'marker.json');
    const result = runProductionRelease(undefined, markerOut);
    expect(result.status).toBe(0);
    expect(readMarkerFile(markerOut)).toEqual({
      EDUVIJNA_API_ENV: 'production',
      EDUVIJNA_REQUIRE_PRODUCTION: '1',
    });
    rmSync(dir, { recursive: true, force: true });
  });

  it('accepts normalized production inherited env and launches child', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'eduvijna-marker-'));
    const markerOut = path.join(dir, 'marker.json');
    const result = runProductionRelease(' PRODUCTION ', markerOut);
    expect(result.status).toBe(0);
    expect(readMarkerFile(markerOut)).toEqual({
      EDUVIJNA_API_ENV: 'production',
      EDUVIJNA_REQUIRE_PRODUCTION: '1',
    });
    rmSync(dir, { recursive: true, force: true });
  });
});
