import { useState, useCallback } from "react";

interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
}

interface UseSwipeGestureResult {
  handlers: SwipeHandlers;
  swipeOffset: number;
}

interface UseSwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  minSwipeDistance?: number;
  enabled?: boolean;
}

export const useSwipeGesture = ({
  onSwipeLeft,
  onSwipeRight,
  minSwipeDistance = 50,
  enabled = true,
}: UseSwipeGestureOptions): UseSwipeGestureResult => {
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    setTouchEnd(0);
    setTouchStart(e.targetTouches[0].clientX);
  }, [enabled]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    const currentTouch = e.targetTouches[0].clientX;
    setTouchEnd(currentTouch);
    
    // Calculate offset for visual feedback (capped at ±100px)
    const offset = currentTouch - touchStart;
    setSwipeOffset(Math.max(-100, Math.min(100, offset / 3)));
  }, [enabled, touchStart]);

  const onTouchEnd = useCallback(() => {
    if (!enabled || !touchStart || !touchEnd) {
      setSwipeOffset(0);
      return;
    }

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft();
    }
    if (isRightSwipe && onSwipeRight) {
      onSwipeRight();
    }

    setSwipeOffset(0);
    setTouchStart(0);
    setTouchEnd(0);
  }, [enabled, touchStart, touchEnd, minSwipeDistance, onSwipeLeft, onSwipeRight]);

  return {
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
    swipeOffset,
  };
};
