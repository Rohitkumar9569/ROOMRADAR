const tabDataCache = new Map();

const DEFAULT_MAX_AGE = 5 * 60 * 1000;

export const readTabCache = (key, maxAge = DEFAULT_MAX_AGE) => {
  const entry = tabDataCache.get(key);
  if (!entry) return null;

  return {
    isFresh: Date.now() - entry.updatedAt <= maxAge,
    value: entry.value,
  };
};

export const setTabCache = (key, value) => {
  tabDataCache.set(key, {
    updatedAt: Date.now(),
    value,
  });

  return value;
};

export const updateTabCache = (key, updater) => {
  const current = readTabCache(key)?.value;
  return setTabCache(key, updater(current));
};

export const clearTabCache = (prefix) => {
  if (!prefix) {
    tabDataCache.clear();
    return;
  }

  Array.from(tabDataCache.keys()).forEach((key) => {
    if (key.startsWith(prefix)) tabDataCache.delete(key);
  });
};
