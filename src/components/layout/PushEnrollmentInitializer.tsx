'use client';

import { usePushEnrollment } from '@/lib/hooks/usePushEnrollment';

export default function PushEnrollmentInitializer() {
  usePushEnrollment();
  return null;
}
