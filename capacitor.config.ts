import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.talkme.app',
  appName: 'TalkMe Chat',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  ios: {
    preferredLanguage: 'en',
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      showSpinner: false,
    },
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
