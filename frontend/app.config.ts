import { ExpoConfig } from '@expo/config';

const config: ExpoConfig = {
  name: 'task Manager',
  slug: 'frontend',
  scheme: 'frontend',
  version: '1.0.0',
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
    //API_URL_ANDROID: 'http://192.168.20.142:3000',
    API_URL_ANDROID: 'https://eleonora-unrepossessed-nonmutably.ngrok-free.dev',
    API_URL_WEB: 'http://localhost:3000',
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
    [
      "expo-build-properties",
      {
        android: {
          networkSecurityConfig: "network_security_config"
        }
      }
    ]
  ],
  experiments: {
    typedRoutes: true,
  },
};

export default config;