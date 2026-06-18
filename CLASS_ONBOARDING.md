# ClassApp — New Class Onboarding Guide

This document is the **complete step-by-step guide** for setting up ClassApp for a new class.  
Follow every step in order. Do not skip any step.

---

## How It Works (Overview)

ClassApp uses a **multi-tenant architecture**:

- Each class gets its **own private Supabase project** (their "tenant").
- A **Master Supabase project** holds the registry of all tenants and their join codes.
- Students enter a **Class Join Code** on the login screen to connect their app to their class's private database.
- Once connected, the join code and tenant URL are stored as a persistent cookie — students only enter it once.

```
Student enters join code
        ↓
Master DB looks up the code → returns tenant Supabase URL + anon key
        ↓
Cookie set in browser (persists 30 days)
        ↓
All subsequent DB calls go directly to the class's own Supabase project
```

---

## Prerequisites

- Access to [Supabase](https://supabase.com) (free tier is fine per class)
- Access to the **Master Supabase project** (the one in your `.env.local` as `MASTER_SUPABASE_URL`)
- The ClassApp codebase deployed on Vercel (or similar)

---

## Step 1 — Create a New Supabase Project for the Class

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Name it clearly, e.g. `classapp-cse-2026-b`
4. Choose a strong database password — **save it somewhere safe**
5. Select a region close to your users
6. Click **Create New Project** and wait for it to initialize (~2 minutes)

---

## Step 2 — Run the Schema Migration

The class Supabase project needs the full ClassApp schema applied.

> **Good news:** You only need to run **one file** — the combined schema.

1. In your ClassApp repo, find:
   ```
   supabase/migrations/COMBINED_CLASS_SCHEMA.sql
   ```
2. Open the new Supabase project's **SQL Editor** (left sidebar → SQL Editor)
3. Paste the **entire contents** of `COMBINED_CLASS_SCHEMA.sql` into the editor
4. Click **Run**
5. Verify: go to **Table Editor** and confirm tables like `profiles`, `timeline_slots`, `announcements`, `deadlines`, `results`, `notes` exist

> This combined file includes everything from migrations 0000–0005 and 0007. It is safe to run multiple times (all statements are idempotent).

---

## Step 3 — Get the Tenant Credentials

From the new Supabase project:

1. Go to **Project Settings** → **API**
2. Copy:
   - **Project URL** → this is the `supabase_url`
   - **anon / public key** → this is the `supabase_anon_key`
3. Keep these handy for Step 5

---

## Step 4 — Register the Tenant in the Master Database

1. Open the **Master Supabase project** (the one from `MASTER_SUPABASE_URL` in `.env.local`)
2. Go to **SQL Editor**
3. Run the following SQL to register the new class:

```sql
-- 1. Insert the tenant (the class's own Supabase project)
INSERT INTO tenants (buyer_email, supabase_url, supabase_anon_key)
VALUES (
  'cr@university.edu',                         -- the CR's email (used as the tenant owner identifier)
  'https://YOUR-CLASS-PROJECT.supabase.co',    -- paste tenant URL from Step 3
  'eyJhbGci...'                                -- paste anon key from Step 3
)
RETURNING id;
-- Note the returned `id` (UUID) — you'll need it in the next query
```

```sql
-- 2. Create the join code for this class
INSERT INTO class_connections (join_code, class_name, tenant_id)
VALUES (
  'CSE2026B',           -- the join code students will type (uppercase, no spaces)
  'CSE Batch 2026 B',   -- a human-readable class name shown in the app
  'PASTE-TENANT-UUID-HERE'  -- the UUID returned from the first INSERT
);
```

> **Join code rules:**
> - Uppercase letters and numbers only (e.g. `CSE2026B`, `EEE2025A`)
> - No spaces or special characters
> - Keep it short and memorable (6–10 characters recommended)
> - Must be unique across all tenants

---

## Step 5 — Configure Supabase Auth Settings

In the **new class Supabase project**:

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to your ClassApp deployment URL:
   ```
   https://your-classapp.vercel.app
   ```
3. Under **Redirect URLs**, add:
   ```
   https://your-classapp.vercel.app/**
   ```
4. Click **Save**

---

## Step 6 — Create the CR (Class Representative) Account

The CR is the admin of the class. You need to:

### 6a. Create the Auth User

1. In the **class Supabase project**, go to **Authentication** → **Users**
2. Click **Add User** → **Create New User**
3. Enter the CR's email and a temporary password (they can change it later)
4. ✅ Check **"Auto Confirm User"** so email confirmation is not needed
5. Click **Create User**
6. Note the user's **UUID** (shown in the users list)

### 6b. Insert the CR Profile

In the class Supabase SQL Editor, run:

```sql
-- Replace ALL values below with real information
INSERT INTO public.profiles (
  id,
  full_name,
  email,
  university_id,
  role,
  batch,
  department,
  password_reset_required
)
VALUES (
  'PASTE-CR-UUID-HERE',        -- UUID from Authentication -> Users
  'CR Full Name',               -- e.g. 'Adnan Islam'
  'cr@university.edu',          -- must match the auth account email
  'CR-UNIV-ID',                 -- e.g. 'CSE-2021-001'
  'cr',                         -- role must be 'cr'
  '2024',                       -- batch year (e.g. '2024')
  'Computer Science',           -- department
  false                         -- false = CR can log in without forced reset
);
```

> If you want to force the CR to change their password on first login, set `password_reset_required = true` and share the temporary password with them.

---

## Step 7 — Hand Over to the CR

Give the CR the following information:

```
ClassApp Login:
  Website:    https://your-classapp.vercel.app/login
  Join Code:  CSE2026B         ← the code you created in Step 4
  Email:      cr@university.edu
  Password:   TempPass123!     ← they'll be forced to change this on first login
```

The CR will:
1. Open the ClassApp website
2. Enter the **Join Code** → click Connect Class
3. Enter their email + temporary password → Sign In
4. Be redirected to set a new password
5. Land on the **CR Dashboard** where they can manage students, announcements, timeline, etc.

---

## Step 8 — CR Creates Student Accounts

Once the CR is set up, they can create student accounts from the dashboard:

1. CR goes to **Dashboard → Students**
2. Clicks **Add Student**
3. Fills in the student's full name and email
4. The system creates the Supabase auth user + profile row and sets `password_reset_required = true`
5. CR shares with each student:
   ```
   Join Code:  CSE2026B
   Email:      student@university.edu
   Password:   (temporary password CR set)
   ```

Students follow the same first-login flow: enter join code → sign in → set new password.

---

## Step 9 — Telegram Integration (Optional)

To enable Telegram mirroring for announcements:

1. Create a Telegram channel for the class
2. Add the ClassApp Telegram Bot as an **administrator** to the channel
3. Get the channel's **chat ID** (use `@userinfobot` or the Telegram API)
4. In the class Supabase project, update the class settings:

```sql
-- Run in the class Supabase project
UPDATE class_settings
SET telegram_chat_id = '-100XXXXXXXXXX'   -- the chat ID (usually negative for channels)
WHERE id = 1;
```

---

## Troubleshooting

### "Invalid class join code" on the login screen (production only)

**Cause:** The master database's `MASTER_SUPABASE_SERVICE_ROLE_KEY` env variable is not set on Vercel, or the join code was not inserted into the master `class_connections` table.

**Fix:**
1. Check Vercel → Settings → Environment Variables → confirm `MASTER_SUPABASE_URL` and `MASTER_SUPABASE_SERVICE_ROLE_KEY` are set
2. Check the master DB `class_connections` table — confirm the join code row exists and the `tenant_id` foreign key points to a valid `tenants` row

---

### Student appears "logged out" after closing the app

**Cause (old bug — now fixed):** Tenant cookies were session-only.  
**Fix:** Already applied in v2 — cookies now persist for 30 days.

---

### "Go to Dashboard" redirects to the login page

**Cause:** The root landing page couldn't find the user's profile (tenant cookie missing or wrong Supabase URL in server context).  
**Fix (applied):** The root page now falls back gracefully — authenticated users always see "Go to Dashboard" even if the profile query can't resolve the exact role.

---

### CR sees the student dashboard (or vice versa)

**Cause:** The `role` column in the `profiles` table is not set correctly.

**Fix:** In the class Supabase project:
```sql
UPDATE profiles SET role = 'cr' WHERE email = 'cr@university.edu';
-- or
UPDATE profiles SET role = 'student' WHERE email = 'student@university.edu';
```
The user must sign out and sign back in for the role to take effect.

---

## Summary Checklist

- [ ] New Supabase project created
- [ ] Schema migration(s) applied
- [ ] Tenant URL + anon key copied
- [ ] Tenant row inserted into master `tenants` table
- [ ] `class_connections` row inserted with join code
- [ ] Auth redirect URLs configured in new project
- [ ] CR Supabase auth user created
- [ ] CR `profiles` row inserted with `role = 'cr'`
- [ ] CR given join code + temporary credentials
- [ ] CR has logged in and changed password
- [ ] (Optional) Telegram channel configured
