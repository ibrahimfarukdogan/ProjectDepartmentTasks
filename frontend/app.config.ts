import 'dotenv/config';
import { ExpoConfig } from '@expo/config';

const projectVersion = process.env.PROJECT_VERSION || '1.0.0';

const config: ExpoConfig = {
  name: 'task Manager',
  slug: 'frontend',
  scheme: 'frontend',
  version: projectVersion,
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  icon: './assets/images/icon.png',
  android: {
    package: 'com.ankageo.taskmanager', // 👈 ADD THIS
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    edgeToEdgeEnabled: true,
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  extra: {
    API_URL_ANDROID: process.env.API_URL_ANDROID,
    API_URL_WEB: process.env.API_URL_WEB,
    eas: {
      projectId: 'dd6e4e6a-1cb0-4080-a6a8-6942ddaeed88',
    },
  },
  plugins: [
    'expo-router',
    'expo-dev-client',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
      },
    ],
    'expo-secure-store',
  ],
  experiments: {
    typedRoutes: true,
  },
};

export default config;