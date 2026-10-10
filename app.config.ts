import type { ExpoConfig } from 'expo/config';
import appJson from './app.json';

const {
  API_ENV_VAR,
  resolveConfiguredApiOrigin,
} = require('./config/apiEnvironment.cjs') as typeof import('./config/apiEnvironment.cjs');

const staticExpo = appJson.expo as ExpoConfig;

export default (): ExpoConfig => {
  const { environment, apiOrigin } = resolveConfiguredApiOrigin({
    environmentRaw: process.env[API_ENV_VAR],
    publicOriginOverride: process.env.EXPO_PUBLIC_API_BASE_URL,
  });

  return {
    ...staticExpo,
    extra: {
      ...staticExpo.extra,
      API_BASE_URL: apiOrigin,
      EDUVIJNA_API_ENV: environment,
    },
  };
};
