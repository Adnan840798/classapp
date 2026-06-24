'use client';

import { useEffect, useRef } from 'react';
import { overlayStack } from '@/lib/utils/overlayStack';

export default function EdgeSwipeHandler() {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        touchStartRef.current = null;
        return; // Only track single touches
      }
      const touch = e.touches[0];
      const startX = touch.clientX;
      const startY = touch.clientY;
      const width = window.innerWidth;

      // Start detection if touch begins near the left edge (<= 35px) or right edge (>= width - 35px)
      if (startX <= 35 || startX >= width - 35) {
        touchStartRef.current = {
          x: startX,
          y: startY,
          time: Date.now(),
        };
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      
      const touch = e.changedTouches[0];
      if (!touch) {
        touchStartRef.current = null;
        return;
      }

      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const duration = Date.now() - touchStartRef.current.time;
      const startX = touchStartRef.current.x;
      const width = window.innerWidth;

      touchStartRef.current = null;

      // Swipe constraints: fast enough, long enough, horizontal
      if (duration > 350) return; // swipe was too slow
      if (Math.abs(deltaY) > 60) return; // swiped too much vertically

      // Left-to-right swipe from left edge (back operation or close overlay)
      if (startX <= 35 && deltaX > 75) {
        const closedAnOverlay = overlayStack.trigger();
        if (!closedAnOverlay) {
          // No open modal/panel was closed, perform history back
          window.history.back();
        }
      }

      // Right-to-left swipe from right edge (close operations or general gesture)
      if (startX >= width - 35 && deltaX < -75) {
        overlayStack.trigger();
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  return null;
}
