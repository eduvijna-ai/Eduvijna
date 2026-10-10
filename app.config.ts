import type { ExpoConfig } from 'expo/config';
import appJson from './app.json';

const { resolveApiOriginForProcess } = require('./config/apiEnvironment.cjs') as {
  resolveApiOriginForProcess: (env?: NodeJS.ProcessEnv) => {
    environment: 'development' | 'production';
    apiOrigin: string;
  };
};

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
