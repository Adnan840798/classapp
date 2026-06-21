# Guide: Changing the Domain Name in ClassApp

This guide outlines all the necessary steps and precautions required to change the domain name of your ClassApp deployment (e.g., moving from `classapp0.vercel.app` to your own custom domain).

---

## Step 1: Vercel Domain Configuration

1. Go to your **Vercel Dashboard** and select your project.
2. Navigate to **Settings > Domains**.
3. Add your custom domain (e.g., `classapp.com` or `app.yourdomain.com`).
4. Configure the DNS records at your domain registrar (e.g., Namecheap, GoDaddy, Cloudflare):
   - **Root Domain** (`yourdomain.com`): Add an `A` record pointing to `76.76.21.21`.
   - **Subdomain** (`app.yourdomain.com`): Add a `CNAME` record pointing to `cname.vercel-dns.com`.
5. Wait for Vercel to generate the SSL certificate (usually takes a few minutes after DNS propagates).

---

## Step 2: Update Vercel Environment Variables

1. In your **Vercel Dashboard**, go to **Settings > Environment Variables**.
2. Update the value of `NEXT_PUBLIC_APP_URL` to your new domain name (e.g., `https://app.yourdomain.com`).
3. Redeploy your project (or trigger a rebuild) on Vercel so the environment variable is loaded into the production build.

---

## Step 3: Update Supabase Authentication Configurations

You must update the allowed redirect URLs in the Supabase Dashboard for **both your Master project and EVERY Tenant project** (e.g., `RUETCSE24A` and others):

1. Go to your **Supabase Dashboard**.
2. Select your project and navigate to **Authentication > URL Configuration**.
3. Update the **Site URL** to your new domain (e.g., `https://app.yourdomain.com`).
4. Under **Redirect URLs**, add your new domain patterns:
   - `https://app.yourdomain.com/**`
   - `https://app.yourdomain.com/login`
5. Save changes. 
*(If you forget this step, users will get redirected back to the old domain or receive an `Invalid redirect URL` error during login).*

---

## Step 4: Update the Codebase Configuration

You must update two hardcoded domain references in your repository:

### 1. Capacitor Config
Open `capacitor.config.ts` and change the `server.url` on line 10 to your new domain:
```typescript
// capacitor.config.ts
const config = {
  appId: 'com.classapp.app',
  appName: 'ClassApp',
  webDir: 'public',
  server: {
    url: 'https://app.yourdomain.com', // <-- Update this line
    errorPath: 'error.html',
    cleartext: false,
  },
};
```

### 2. WebView Offline Fallback Page
Open `public/error.html` and update the redirect URL inside the `retryConnection` function on line 209:
```javascript
// public/error.html
function retryConnection() {
  // Reload back to the app's main remote entry URL
  window.location.href = "https://app.yourdomain.com"; // <-- Update this line
}
```

---

## Step 5: Rebuild and Re-download the Mobile App (APK)

> [!IMPORTANT]
> **Yes, you must compile and redistribute a new APK.**
> Because Capacitor builds the configuration (`capacitor.config.ts`) directly into the compiled native binary of your mobile application, the old APK on users' phones will continue trying to load the old domain.

1. Clean and build the production bundle:
   ```bash
   npm run build
   ```
2. Sync the updated build assets and configuration to the Android platform:
   ```bash
   npx cap sync
   ```
3. Open the Android project in Android Studio:
   ```bash
   npx cap open android
   ```
4. Build a new release APK or Bundle (`Build > Build Bundle(s) / APK(s) > Build APK(s)`).
5. Share the new APK with your users. They **must download and install the new APK** to connect to the new domain.

---

## Step 6: Third-Party Integrations (If Used)

- **Telegram Bot Webhook**: If you are using a Telegram Bot for notifications, update the webhook URL to point to the new API path:
  `https://app.yourdomain.com/api/telegram`
- **Social Login OAuth Providers**: If you have Google, GitHub, or other social logins enabled in Supabase, update the authorized callback/redirect domains in their respective developer consoles (e.g. Google Cloud Console).
