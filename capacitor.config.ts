import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.joinlegacy',
  appName: 'Legacy',
  webDir: 'public',
  server: {
    url: 'https://legacy-bice.vercel.app',
    cleartext: false,
  },
  plugins: {
    StatusBar: {
      style: 'DEFAULT',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'none',
      style: 'DEFAULT',
    },
  },
};

export default config;
