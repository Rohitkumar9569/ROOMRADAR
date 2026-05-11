import { useEffect, useRef, useState } from 'react';

const readScrollTop = (event) => Math.max(
  window.scrollY || 0,
  document.documentElement?.scrollTop || 0,
  document.body?.scrollTop || 0,
  Number(event?.target?.scrollTop || 0),
);

const scrollableSelector = [
  'main',
  '[data-scroll-container]',
  '.overflow-y-auto',
  '.overflow-auto',
  '.mobile-scroll-layer',
  '[class*="overflow-y-auto"]',
  '[class*="overflow-auto"]',
].join(',');

const readAllScrollTops = () => {
  if (typeof document === 'undefined') return 0;
  let maxScrollTop = Math.max(
    window.scrollY || 0,
    document.documentElement?.scrollTop || 0,
    document.body?.scrollTop || 0,
  );

  document.querySelectorAll(scrollableSelector).forEach((node) => {
    if (node && node.scrollHeight > node.clientHeight) {
      maxScrollTop = Math.max(maxScrollTop, Number(node.scrollTop || 0));
    }
  });

  return maxScrollTop;
};

const useScrollState = (threshold = 28, forceActive = false) => {
  const [scrollY, setScrollY] = useState(0);
  const frameRef = useRef(null);
  const lastScrollRef = useRef(0);
  const scrollablesRef = useRef([]);

  useEffect(() => {
    const flush = () => {
      frameRef.current = null;
      setScrollY(lastScrollRef.current);
    };

    const schedule = (nextScrollTop) => {
      lastScrollRef.current = nextScrollTop;
      if (frameRef.current) return;
      frameRef.current = window.requestAnimationFrame(flush);
    };

    const refreshFromAllScrollables = () => {
      schedule(readAllScrollTops());
    };

    const onScroll = (event) => {
      schedule(Math.max(readScrollTop(event), readAllScrollTops()));
    };

    const attachScrollables = () => {
      scrollablesRef.current.forEach((node) => node.removeEventListener('scroll', onScroll));
      scrollablesRef.current = Array.from(document.querySelectorAll(scrollableSelector)).filter(
        (node) => node && node.scrollHeight > node.clientHeight,
      );
      scrollablesRef.current.forEach((node) => node.addEventListener('scroll', onScroll, { passive: true }));
    };

    attachScrollables();
    refreshFromAllScrollables();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('wheel', refreshFromAllScrollables, { passive: true });
    window.addEventListener('touchmove', refreshFromAllScrollables, { passive: true });
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });

    const observer = new MutationObserver(() => {
      attachScrollables();
      refreshFromAllScrollables();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', refreshFromAllScrollables);
      window.removeEventListener('touchmove', refreshFromAllScrollables);
      document.removeEventListener('scroll', onScroll, { capture: true });
      scrollablesRef.current.forEach((node) => node.removeEventListener('scroll', onScroll));
      observer.disconnect();
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return {
    scrollY,
    isScrolled: forceActive || scrollY > threshold,
  };
};

export default useScrollState;
