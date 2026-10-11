import type { ExpoConfig } from 'expo/config';
import appJson from './app.json';
import { resolveApiOriginForProcess } from './config/apiEnvironment.cjs';

const staticExpo = appJson.expo as ExpoConfig;

export default (): ExpoConfig => {
  const { environment, apiOrigin } = resolveApiOriginForProcess(process.env);

  return {
    ...staticExpo,
    extra: {
      ...staticExpo.extra,
      API_BASE_URL: apiOrigin,
      EDUVIJNA_API_ENV: environment,
      GIT_SHA: process.env.EDUVIJNA_GIT_SHA || process.env.GIT_COMMIT || 'unknown',
      GIT_BRANCH: process.env.EDUVIJNA_GIT_BRANCH || 'unknown',
      ACCEPTANCE_ADB_LOGIN: process.env.EDUVIJNA_ACCEPTANCE_ADB_LOGIN === '1',
    },
  };
};
