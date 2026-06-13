// Capacitor config — used when building the Android APK.
// Replace `url` with your Vercel deployment URL before running `npx cap sync`.
// DO NOT import @capacitor/cli here; it is not in the project's dependencies.

const config = {
  appId: 'com.classapp.app',
  appName: 'ClassApp',
  webDir: 'public',
  server: {
    url: 'https://classapp0.vercel.app',
    errorPath: 'error.html',
    cleartext: false,
  },
};

export default config;
