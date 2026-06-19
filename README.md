# ClassApp

ClassApp is a collaborative academic management platform built for university classes. It empowers Class Representatives (CRs) to publish schedules, deadlines, notes, exam results, and notifications, while providing students with a central hub for all class activities.

---

## 🚀 Features

- **Semester Timeline & Calendar**: Interactive, responsive schedule displaying exams, assignments, holiday announcements, and daily details.
- **Announcements Board**: Categorized into active ("Announcements") and historical ("Past Announcements") sections. Active entries sort ascending (earliest first), while past entries sort descending (most recent first) with muted slate styling. Features an academic weekend fallback (Thursday-Friday) to keep weekend posts active together. Supports image/PDF attachments and automated Telegram bot forwarding.
- **Bulk Selection & Actions**: iOS-style "Select Mode" across CR dashboard listings (Announcements, Deadlines, Results, Resources) allowing multi-card selection and bulk deletion with custom checked boxes and a floating action bar.
- **Notification Routing & Cleanup**: In-app notifications and Firebase Cloud Messaging (FCM) push alerts dispatched to students when CRs resolve their timeline questions. Automated database gates clean up notifications when reference items are deleted.
- **Q&A System**: Integrated directly into calendar events and deadlines, allowing students to ask questions and CRs to resolve them.
- **Real-Time Chat**: Live messaging classroom hub utilizing Supabase Realtime with pinning and message moderation.
- **Deadlines & Submissions**: Visual trackers for due dates and academic deliverables.
- **Class Routine**: Easy view of the current weekly class schedule with zooming and CR upload options.
- **Notes Manager**: Personal workspace for students to store links, descriptions, and documents.
- **Mobile Friendly**: Configured with Capacitor for compiling into a native Android APK.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Language**: TypeScript
- **Database, Auth & Realtime**: [Supabase](https://supabase.com/)
- **Styling**: Tailwind CSS v4 + Vanilla CSS + Tailwind Merge
- **Icons**: [Lucide React](https://lucide.dev/)
- **Mobile Wrapper**: [Capacitor CLI](https://capacitorjs.com/)

---

## 📦 Project Structure

```
classapp/
├── app/                  # Next.js 16 App Router (pages and layouts)
│   ├── (auth)/           # Sign-in & sign-up pages
│   ├── (dashboard)/      # Student dashboard (timeline, notes, routine, results)
│   │   ├── cr/           # CR exclusive dashboards (upload routine, post announcements)
│   │   └── student/      # Student views
│   ├── api/              # API Route Handlers
│   ├── layout.tsx        # Global HTML structure
│   └── page.tsx          # Homepage redirect logic
├── src/
│   ├── components/       # Shared UI components
│   │   ├── timeline/     # Timeline and schedule components
│   │   └── ui/           # Reusable UI primitives (buttons, modals, dialogs)
│   └── lib/              # Client/Server utilities, hooks, constants
│       ├── actions/      # Next.js Server Actions (Supabase mutations)
│       └── supabase/     # Supabase client configurations
├── supabase/             # Supabase configuration & migrations
│   ├── migrations/       # SQL migrations
│   │   ├── 0000_complete_schema.sql  # Consolidated db initialization schema
│   │   └── 0001_schema.sql - 0007_class_routine.sql  # Historical migrations
│   ├── seed.sql          # Seed guidelines for manual sql editor population
│   └── seed_users.js     # Script to automate test user creation in Auth
├── capacitor.config.ts   # Capacitor configuration for Android APK builds
└── package.json          # Dependency definition & scripts
```

---

## ⚙️ Local Setup Guide

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd classapp
npm install
```

### 2. Configure Environment Variables
Copy the template to a local environment file:
```bash
cp .env.example .env.local
```
Fill in the following fields inside `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key # Required for seeding users only
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Setup the Database
To reset or initialize your database, follow these steps:
1. Go to the **Supabase Dashboard** -> **SQL Editor**.
2. Copy the contents of [`supabase/migrations/0000_complete_schema.sql`](file:///c:/Users/User/Desktop/classapp/supabase/migrations/0000_complete_schema.sql) and paste it into the editor.
3. Run the SQL query to create all tables, indexes, row-level security (RLS) policies, triggers, storage buckets, and realtime configurations.

### 4. Seed Test Users
Once the schema is loaded, generate the test accounts:
```bash
node supabase/seed_users.js
```
This script will create three accounts with default credentials:
- **CR**: `cr@classapp.test` / `Password123!`
- **Student**: `student@classapp.test` / `Password123!`
- **Admin**: `admin@classapp.test` / `Password123!`

*Note: Profiles are automatically created in the public `profiles` table via a database trigger on the auth schema.*

### 5. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 📱 Building the Android APK

1. Build the production web bundle:
   ```bash
   npm run build
   ```
2. Sync files into the Android project using Capacitor:
   ```bash
   npx cap sync
   ```
3. Open the Android project in Android Studio to build and sign the APK:
   ```bash
   npx cap open android
   ```
*Ensure `NEXT_PUBLIC_APP_URL` in `capacitor.config.ts` matches your production/live URL before syncing.*

---

## 🧹 Quality Assurance & Checks

Run the following checks before committing code to keep the repository healthy:
* **Lint Check**: `npm run lint` or `npm run lint:fix` (auto-fixes minor issues).
* **Type Check**: `npm run type-check` (verifies TypeScript compiler rules).
