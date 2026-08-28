import type {CapacitorConfig} from '@capacitor/cli';

const config:CapacitorConfig={
  appId:'com.qatalink.pro',
  appName:'Qatalink',
  webDir:'mobile-shell',
  server:{
    url:'https://qatalink.com/mobile',
    cleartext:false,
    // Only Qatalink pages stay inside the native WebView. Payment providers remain external.
    allowNavigation:['qatalink.com','*.qatalink.com']
  },
  android:{allowMixedContent:false},
  ios:{contentInset:'automatic'}
};

export default config;
