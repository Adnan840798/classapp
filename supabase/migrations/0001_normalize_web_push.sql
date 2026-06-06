-- 1. Create push_devices table
CREATE TABLE IF NOT EXISTS public.push_devices (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint     text UNIQUE NOT NULL,
  p256dh       text NOT NULL,
  auth         text NOT NULL,
  created_at   timestamptz DEFAULT now()
);

-- 2. Create user_push_devices table (many-to-many link)
CREATE TABLE IF NOT EXISTS public.user_push_devices (
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_id    uuid NOT NULL REFERENCES public.push_devices(id) ON DELETE CASCADE,
  created_at   timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, device_id)
);

-- 3. Create index for relation performance
CREATE INDEX IF NOT EXISTS idx_user_push_devices_device_id ON public.user_push_devices(device_id);

-- 4. Enable Row-Level Security (RLS)
ALTER TABLE public.push_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_push_devices ENABLE ROW LEVEL SECURITY;

-- 5. Migrate existing subscriptions if old table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'web_push_subscriptions') THEN
    -- Migrate devices
    INSERT INTO public.push_devices (id, endpoint, p256dh, auth, created_at)
    SELECT id, endpoint, p256dh, auth, created_at
    FROM public.web_push_subscriptions
    ON CONFLICT (endpoint) DO NOTHING;

    -- Migrate relationships
    INSERT INTO public.user_push_devices (user_id, device_id, created_at)
    SELECT user_id, id, created_at
    FROM public.web_push_subscriptions
    ON CONFLICT (user_id, device_id) DO NOTHING;
  END IF;
END $$;

-- 6. Drop the old table
DROP TABLE IF EXISTS public.web_push_subscriptions CASCADE;

-- 7. Define RLS Policies for push_devices
-- Users can only select devices they are linked to
DROP POLICY IF EXISTS "pd_select_linked" ON public.push_devices;
CREATE POLICY "pd_select_linked" ON public.push_devices
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_push_devices upd
      WHERE upd.device_id = id AND upd.user_id = auth.uid()
    )
  );

-- 8. Define RLS Policies for user_push_devices
DROP POLICY IF EXISTS "upd_select_own" ON public.user_push_devices;
CREATE POLICY "upd_select_own" ON public.user_push_devices
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "upd_insert_own" ON public.user_push_devices;
CREATE POLICY "upd_insert_own" ON public.user_push_devices
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "upd_delete_own" ON public.user_push_devices;
CREATE POLICY "upd_delete_own" ON public.user_push_devices
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 9. Setup automatic database trigger for orphaned devices cleanup
-- When a relation is deleted, if no other user references the device_id, delete the device
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_push_devices()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_push_devices
    WHERE device_id = OLD.device_id
  ) THEN
    DELETE FROM public.push_devices WHERE id = OLD.device_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_cleanup_orphaned_push_devices ON public.user_push_devices;
CREATE TRIGGER trigger_cleanup_orphaned_push_devices
AFTER DELETE ON public.user_push_devices
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_orphaned_push_devices();
