import React, { createContext, useContext, useState, useEffect, useLayoutEffect } from 'react';

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

export const ThemeProvider = ({ children }) => {
  const [themePreference, setThemePreference] = useState(getSavedThemePreference);
  const [systemDarkMode, setSystemDarkMode] = useState(getSystemDarkMode);
  const isDarkMode = themePreference === 'system' ? systemDarkMode : themePreference === 'dark';

  useLayoutEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const themeColor = isDarkMode ? '#0f0f0f' : '#ffffff';
    document.documentElement.style.colorScheme = isDarkMode ? 'dark' : 'light';
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      meta.setAttribute('content', themeColor);
    });
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

  const toggleTheme = () => {
    const nextTheme = isDarkMode ? 'light' : 'dark';
    window.localStorage.setItem('theme-preference', nextTheme);
    window.localStorage.setItem('theme', nextTheme);
    setThemePreference(nextTheme);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, themePreference, toggleTheme }}>
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
