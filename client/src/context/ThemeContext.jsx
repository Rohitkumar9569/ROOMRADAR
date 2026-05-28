import React, { createContext, useContext, useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { flushSync } from 'react-dom';

const ThemeContext = createContext();
const getSystemDarkMode = () => (
  typeof window !== 'undefined'
  && window.matchMedia
  && window.matchMedia('(prefers-color-scheme: dark)').matches
);

const getSavedThemePreference = () => {
  if (typeof window === 'undefined') return 'system';
  const savedTheme = window.localStorage.getItem('theme-preference') || window.localStorage.getItem('theme');
  return savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : 'system';
};

const applyThemeToDocument = (darkMode) => {
  if (typeof document === 'undefined') return;

  document.documentElement.classList.toggle('dark', Boolean(darkMode));
  document.documentElement.style.colorScheme = darkMode ? 'dark' : 'light';
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.setAttribute('content', darkMode ? '#0f0f0f' : '#ffffff');
  });
};

const saveThemePreference = (theme) => {
  if (typeof window === 'undefined') return;

  const writeTheme = () => {
    window.localStorage.setItem('theme-preference', theme);
    window.localStorage.setItem('theme', theme);
  };

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(writeTheme, { timeout: 500 });
    return;
  }

  window.setTimeout(writeTheme, 0);
};

const getThemeTransitionMetrics = (event) => {
  if (typeof window === 'undefined') {
    return { x: 0, y: 0, radius: 0 };
  }

  const rect = event?.currentTarget?.getBoundingClientRect?.();
  const x = rect ? rect.left + rect.width / 2 : window.innerWidth - 42;
  const y = rect ? rect.top + rect.height / 2 : 42;
  const endX = Math.max(x, window.innerWidth - x);
  const endY = Math.max(y, window.innerHeight - y);

  return {
    x,
    y,
    radius: Math.ceil(Math.hypot(endX, endY) + 48),
  };
};

const shouldUseLightweightThemeSwitch = () => (
  typeof window !== 'undefined'
  && (
    window.matchMedia?.('(max-width: 767px)').matches
    || window.matchMedia?.('(pointer: coarse)').matches
    || window.navigator?.deviceMemory <= 4
  )
);

export const ThemeProvider = ({ children }) => {
  const [themePreference, setThemePreference] = useState(getSavedThemePreference);
  const [systemDarkMode, setSystemDarkMode] = useState(getSystemDarkMode);
  const switchTimeoutRef = useRef(null);
  const isDarkMode = themePreference === 'system' ? systemDarkMode : themePreference === 'dark';

  useLayoutEffect(() => {
    applyThemeToDocument(isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (event) => {
      setSystemDarkMode(event.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    } else {
      mediaQuery.addListener(handleSystemThemeChange);
    }

    setSystemDarkMode(mediaQuery.matches);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      } else {
        mediaQuery.removeListener(handleSystemThemeChange);
      }
    };
  }, []);

  useEffect(() => () => {
    if (switchTimeoutRef.current) {
      window.clearTimeout(switchTimeoutRef.current);
    }
  }, []);

  const toggleTheme = useCallback((event) => {
    const root = typeof document !== 'undefined' ? document.documentElement : null;
    const currentDarkMode = root ? root.classList.contains('dark') : isDarkMode;
    const nextTheme = currentDarkMode ? 'light' : 'dark';
    const nextDarkMode = nextTheme === 'dark';
    const useLightweightSwitch = shouldUseLightweightThemeSwitch();
    const canAnimateTheme = Boolean(
      root
      && typeof document !== 'undefined'
      && typeof document.startViewTransition === 'function'
      && !useLightweightSwitch
      && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    );

    const commitTheme = (sync = false) => {
      applyThemeToDocument(nextDarkMode);
      const updatePreference = () => {
        setThemePreference(nextTheme);
      };

      if (sync) {
        flushSync(updatePreference);
        return;
      }

      updatePreference();
    };

    if (root) {
      root.classList.add('rr-theme-switching');
      const { x, y, radius } = getThemeTransitionMetrics(event);
      root.style.setProperty('--rr-theme-x', `${x}px`);
      root.style.setProperty('--rr-theme-y', `${y}px`);
      root.style.setProperty('--rr-theme-radius', `${radius}px`);

      if (switchTimeoutRef.current) {
        window.clearTimeout(switchTimeoutRef.current);
      }

      const cleanup = () => {
        root.classList.remove('rr-theme-switching');
        root.classList.remove('rr-theme-view-transition');
        root.style.removeProperty('--rr-theme-x');
        root.style.removeProperty('--rr-theme-y');
        root.style.removeProperty('--rr-theme-radius');
      };

      if (canAnimateTheme) {
        root.classList.add('rr-theme-view-transition');
        const transition = document.startViewTransition(() => commitTheme(true));
        transition.finished.finally(cleanup);
        switchTimeoutRef.current = window.setTimeout(cleanup, 620);
      } else {
        commitTheme();
        switchTimeoutRef.current = window.setTimeout(cleanup, useLightweightSwitch ? 90 : 180);
      }
    } else {
      setThemePreference(nextTheme);
    }

    saveThemePreference(nextTheme);
  }, [isDarkMode]);

  const value = useMemo(() => ({ isDarkMode, themePreference, toggleTheme }), [isDarkMode, themePreference, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
