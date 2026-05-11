import { useEffect, useRef, useState } from 'react';

const readScrollTop = (event) => Math.max(
  window.scrollY || 0,
  document.documentElement?.scrollTop || 0,
  document.body?.scrollTop || 0,
  Number(event?.target?.scrollTop || 0),
);

const getInitialScrollTop = () => {
  if (typeof window === 'undefined') return 0;

  return Math.max(
    window.scrollY || 0,
    document.documentElement?.scrollTop || 0,
    document.body?.scrollTop || 0,
  );
};

const useScrollState = (threshold = 28, forceActive = false, options = {}) => {
  const { mediaQuery } = options;
  const [state, setState] = useState(() => {
    const scrollY = getInitialScrollTop();
    return {
      scrollY,
      isScrolled: forceActive || scrollY > threshold,
    };
  });
  const frameRef = useRef(null);
  const lastScrollRef = useRef(state.scrollY);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const media = mediaQuery ? window.matchMedia(mediaQuery) : null;
    let listening = false;

    const flush = () => {
      frameRef.current = null;
      const nextScrollY = lastScrollRef.current;
      const nextIsScrolled = forceActive || nextScrollY > threshold;

      setState((current) => {
        if (current.isScrolled === nextIsScrolled) return current;
        return {
          scrollY: nextScrollY,
          isScrolled: nextIsScrolled,
        };
      });
    };

    const schedule = (nextScrollTop) => {
      lastScrollRef.current = nextScrollTop;
      if (frameRef.current) return;
      frameRef.current = window.requestAnimationFrame(flush);
    };

    const onScroll = (event) => {
      schedule(readScrollTop(event));
    };

    const attach = () => {
      if (listening) return;
      listening = true;
      schedule(getInitialScrollTop());
      window.addEventListener('scroll', onScroll, { passive: true });
      document.addEventListener('scroll', onScroll, { passive: true, capture: true });
    };

    const detach = () => {
      if (!listening) return;
      listening = false;
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('scroll', onScroll, { capture: true });
    };

    const syncMediaState = () => {
      if (!media || media.matches) {
        attach();
        return;
      }

      detach();
      lastScrollRef.current = 0;
      setState({ scrollY: 0, isScrolled: forceActive });
    };

    syncMediaState();

    if (media) {
      if (media.addEventListener) {
        media.addEventListener('change', syncMediaState);
      } else {
        media.addListener(syncMediaState);
      }
    }

    return () => {
      detach();
      if (media) {
        if (media.removeEventListener) {
          media.removeEventListener('change', syncMediaState);
        } else {
          media.removeListener(syncMediaState);
        }
      }
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    };
  }, [forceActive, mediaQuery, threshold]);

  return state;
};

export default useScrollState;
