<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# ClassApp Agent Guidelines

Welcome, AI Agent! To ensure you maintain the quality and structure of ClassApp, follow these rules when editing or building features:

## 1. Directory Conventions
- special pages/layouts under `app/` are kebab-case (e.g. `(dashboard)/student/calendar/page.tsx`).
- custom React components inside `src/components/` must be PascalCase (e.g. `FileUpload.tsx`).
- logic files inside `src/lib/` must be camelCase (e.g. `timeline.ts`).

## 2. Server-Side Mutations & Actions
- All writes (insert, update, delete) must be performed inside Next.js Server Actions under `src/lib/actions/`.
- Never run inline supabase client mutations directly inside React client components.
- Always implement proper try-catch error handling in Actions, logging output, and return objects like `{ success: boolean, data?: any, error?: string }`.
- Remember to import `revalidatePath` to clear cached routes when relevant.

## 3. Database Schema & RLS
- The database schema is fully defined in `supabase/migrations/0000_complete_schema.sql`. Refer to this file for table structures, enums, triggers, and storage bucket definitions.
- Row-Level Security (RLS) policies are active. Profiles are automatically populated upon registration via a trigger.
- The PostgreSQL function `public.get_my_role()` is used within RLS to determine permissions ('admin', 'cr', 'student').

## 4. UI/Styling Guidelines
- Style with **Tailwind CSS v4** + Vanilla CSS. Avoid using raw colors (like pure red, green, blue). Use HSL tailored colors and premium gradients.
- Implement glassmorphism, smooth animations, and active state styles (hover effects, focus states).
- Keep layouts fully responsive (desktop, tablet, mobile screen resolutions) since this app is designed to run in a Capacitor native APK container.
- Use `lucide-react` for premium icon sets.
