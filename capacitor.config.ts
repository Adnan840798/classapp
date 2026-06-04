// Capacitor config — used when building the Android APK.
// Replace `url` with your Vercel deployment URL before running `npx cap sync`.
// DO NOT import @capacitor/cli here; it is not in the project's dependencies.

const config = {
  appId: 'com.classapp.app',
  appName: 'ClassApp',
  webDir: 'out',
  server: {
    url: 'https://your-app.vercel.app',
    cleartext: true,
  },
};

export default config;
