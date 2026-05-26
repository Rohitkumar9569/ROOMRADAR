const patterns = {
  tap: 12,
  success: [16, 24, 16],
  warning: [24, 32, 24],
  error: [36, 24, 36],
};

export const triggerHaptic = (type = 'tap') => {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false;
  try {
    navigator.vibrate(patterns[type] || patterns.tap);
    return true;
  } catch {
    return false;
  }
};
