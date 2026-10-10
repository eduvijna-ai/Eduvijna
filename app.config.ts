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
    },
  };
};
