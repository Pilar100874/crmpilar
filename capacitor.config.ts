import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.pilar.rastreador',
  appName: 'Pilar Rastreador',
  webDir: 'dist',
  server: {
    url: 'https://1afb47be-da35-40df-a390-d0f257cc5ab1.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    Geolocation: {
      // Enable high accuracy GPS
    },
    BackgroundRunner: {
      label: 'app.lovable.pilar.rastreador',
      src: 'background.js',
      event: 'trackLocation',
      repeat: true,
      interval: 15,
      autoStart: true
    }
  }
};

export default config;
