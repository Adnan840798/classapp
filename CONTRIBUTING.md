# Contributing to ClassApp

Thank you for contributing to ClassApp! This document outlines coding standards, patterns, and workflows to keep the codebase healthy, clean, and accessible for everyone.

---

## 🛠️ Code Style & Standards

- **TypeScript**: Always use strict typing. Avoid using `any` type definitions.
- **Linting & Formatting**: Run `npm run lint` and `npm run type-check` before submitting changes. You can auto-fix simple styling discrepancies using `npm run lint:fix`.
- **Components**: Reusable, atomic components go inside `src/components/ui/`. Layouts and route components are managed under `app/`.

---

## 📂 Folder & File Conventions

```
classapp/
├── app/                  # Next.js 16 routing & layouts (kebab-case)
│   ├── (auth)/           # Route group for auth flows
│   └── (dashboard)/      # Route group for dashboard views
├── src/
│   ├── components/       # Component directory (PascalCase)
│   │   ├── timeline/
│   │   └── ui/           # Radix/Primitive UI parts
│   └── lib/              # Logic helper folders (kebab-case)
│       ├── actions/      # Next.js Server Actions (camelCase actions)
│       ├── hooks/        # React Hooks (camelCase starting with 'use')
│       └── supabase/     # Client setup
```

### Next.js 16 Rules
- We use the **Next.js App Router**. Files like `page.tsx`, `layout.tsx`, `error.tsx`, and `route.ts` are special files that configure routes.
- Component files must be written in **TSX** (`.tsx`) and use **PascalCase** naming (e.g., `FileUpload.tsx`, `SemesterTimeline.tsx`).
- Utility or helper modules should be written in **TS** (`.ts`) and use **camelCase** naming (e.g., `timeline.ts`, `telegram.ts`).

---

## ⚡ Server Actions Pattern

All database writes or changes (insert, update, delete) must go through **Server Actions** in `src/lib/actions/`. Do not perform direct database mutations in components.

### Example Action Template:
```typescript
"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addDeadline(formData: { title: string; subject: string; dueDate: Date }) {
  const supabase = await createClient();
  
  // 1. Perform authorization checks (RLS handles this, but server checks protect inputs)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // 2. Perform the database insert
  const { data, error } = await supabase
    .from("deadlines")
    .insert({
      title: formData.title,
      subject: formData.subject,
      due_date: formData.dueDate.toISOString(),
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to add deadline:", error.message);
    return { success: false, error: error.message };
  }

  // 3. Revalidate affected paths
  revalidatePath("/student/schedule");
  return { success: true, data };
}
```

---

## 🔒 Supabase & Row-Level Security (RLS)

Every table has RLS enabled. Policies are based on user roles (`admin`, `cr`, `student`).

- **Authenticated vs Anonymous Access**:
  - Authenticated queries use the service client initialized in Server Actions or route handlers.
  - Anonymous queries are restricted by policies (e.g., announcements with `is_public = true` are readable by anyone).
- **Role checks inside PostgreSQL**:
  - The function `public.get_my_role()` evaluates `auth.uid()` against the `profiles` table to return the user's role.
  - Policies enforce CR/Admin requirements (e.g., `public.get_my_role() IN ('cr', 'admin')`).
- **Bucket Storage**:
  - `avatars` bucket: public read; write/delete restricted to own folder (`auth.uid()`).
  - `notices` bucket: public read; write/delete restricted to CRs and admins.

---

## 🔄 Database Migrations Workflow

We use a consolidated migration strategy.
- The canonical database setup is in [`supabase/migrations/0000_complete_schema.sql`](file:///c:/Users/User/Desktop/classapp/supabase/migrations/0000_complete_schema.sql).
- If you make a database change:
  1. Add a new migration file under `supabase/migrations/` (e.g., `0008_new_feature.sql`).
  2. Document the change in the new file.
  3. **Append** the SQL query to the end of `0000_complete_schema.sql` so that new developers can initialize the DB in one command.
  4. Run `npm run type-check` to verify database type definitions are updated.
