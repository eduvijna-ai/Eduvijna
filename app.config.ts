import type { ExpoConfig } from 'expo/config';
import { execSync } from 'node:child_process';
import appJson from './app.json';
import { resolveApiOriginForProcess } from './config/apiEnvironment.cjs';

function resolveGitSha(): string {
  if (process.env.EDUVIJNA_GIT_SHA?.trim()) return process.env.EDUVIJNA_GIT_SHA.trim();
  if (process.env.GIT_COMMIT?.trim()) return process.env.GIT_COMMIT.trim();
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

const staticExpo = appJson.expo as ExpoConfig;

export default (): ExpoConfig => {
  const { environment, apiOrigin } = resolveApiOriginForProcess(process.env);

  return {
    ...staticExpo,
    extra: {
      ...staticExpo.extra,
      API_BASE_URL: apiOrigin,
      EDUVIJNA_API_ENV: environment,
      GIT_SHA: resolveGitSha(),
      GIT_BRANCH: process.env.EDUVIJNA_GIT_BRANCH || 'unknown',
    },
  };
};
