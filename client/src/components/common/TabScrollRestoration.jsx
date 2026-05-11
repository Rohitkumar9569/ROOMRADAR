import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import {
  getTabScrollKey,
  hasVisitedTab,
  markVisitedTab,
  restoreScroll,
  saveScroll,
} from '../../utils/scrollStore';

const TabScrollRestoration = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const previousPathRef = useRef(location.pathname);
  const previousTabKeyRef = useRef(getTabScrollKey(location.pathname));
  const activeTabKeyRef = useRef(previousTabKeyRef.current);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!('scrollRestoration' in window.history)) return undefined;

    const previousMode = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';

    return () => {
      window.history.scrollRestoration = previousMode;
    };
  }, []);

  useLayoutEffect(() => {
    const nextPath = location.pathname;
    const nextTabKey = getTabScrollKey(nextPath);
    const previousPath = previousPathRef.current;
    const previousTabKey = previousTabKeyRef.current;

    if (!initializedRef.current) {
      initializedRef.current = true;
      if (nextTabKey) {
        const shouldRestore = hasVisitedTab(nextTabKey);
        markVisitedTab(nextTabKey);
        restoreScroll(nextTabKey, shouldRestore ? undefined : 0, {
          maxFrames: shouldRestore ? 10 : 1,
        });
      } else {
        restoreScroll(null, 0, { maxFrames: 1 });
      }

      previousPathRef.current = nextPath;
      previousTabKeyRef.current = nextTabKey;
      activeTabKeyRef.current = nextTabKey;
      return;
    }

    if (previousTabKey && previousTabKey !== nextTabKey) {
      saveScroll(previousTabKey);
    }

    if (nextTabKey && nextTabKey !== previousTabKey) {
      const shouldRestore = hasVisitedTab(nextTabKey);
      markVisitedTab(nextTabKey);
      restoreScroll(nextTabKey, shouldRestore ? undefined : 0, {
        maxFrames: shouldRestore ? 10 : 1,
      });
    } else if (!nextTabKey && previousPath !== nextPath && navigationType !== 'POP') {
      restoreScroll(null, 0, { maxFrames: 1 });
    }

    previousPathRef.current = nextPath;
    previousTabKeyRef.current = nextTabKey;
    activeTabKeyRef.current = nextTabKey;
  }, [location.key, location.pathname, navigationType]);

  useEffect(() => {
    const saveActiveTab = () => {
      if (activeTabKeyRef.current) saveScroll(activeTabKeyRef.current);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') saveActiveTab();
    };

    window.addEventListener('pagehide', saveActiveTab);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      saveActiveTab();
      window.removeEventListener('pagehide', saveActiveTab);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return null;
};

export default TabScrollRestoration;
