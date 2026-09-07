// Haptic feedback hook for mobile devices
export const useHapticFeedback = () => {
  const vibrate = (pattern: number | number[] = 10) => {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Vibration not supported or blocked
      }
    }
  };

  const lightTap = () => vibrate(10);
  const mediumTap = () => vibrate(25);
  const heavyTap = () => vibrate([50, 30, 50]);
  const success = () => vibrate([30, 50, 100]);
  const error = () => vibrate([100, 30, 100, 30, 100]);
  const warning = () => vibrate([50, 100, 50]);

  return {
    vibrate,
    lightTap,
    mediumTap,
    heavyTap,
    success,
    error,
    warning,
  };
};
