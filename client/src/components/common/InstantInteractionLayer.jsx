import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { triggerHaptic } from '../../utils/haptics';
import { prefetchRoute } from '../../utils/routePrefetch';

const PRESSABLE_SELECTOR = [
  'a[href]',
  'button',
  '[role="button"]',
  'input[type="button"]',
  'input[type="submit"]',
  'input[type="reset"]',
].join(',');

const HAPTIC_SELECTOR = [
  '.rr-bottom-item',
  '.rr-card-heart-btn',
  '.btn-primary',
  '.btn-outline',
  '.btn-secondary',
  '.btn-success',
  '.btn-danger',
  '.btn-cancel',
  '[data-haptic="tap"]',
].join(',');

const isDisabled = (element) => Boolean(
  element?.disabled
  || element?.getAttribute?.('aria-disabled') === 'true'
  || element?.closest?.('[disabled], [aria-disabled="true"]')
);

const getInternalPath = (anchor) => {
  if (!anchor?.href || typeof window === 'undefined') return null;

  try {
    const url = new URL(anchor.href, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    if (url.pathname === window.location.pathname && !url.search) return null;
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
};

const getPressableTarget = (target) => {
  if (!(target instanceof Element)) return null;
  const element = target.closest(PRESSABLE_SELECTOR);
  return element && !isDisabled(element) ? element : null;
};

function InstantInteractionLayer() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

    const pressed = new Set();
    let pressTimer = null;

    const clearPressed = () => {
      pressed.forEach((element) => element.classList.remove('rr-is-pressing'));
      pressed.clear();
      if (pressTimer) {
        window.clearTimeout(pressTimer);
        pressTimer = null;
      }
    };

    const pressElement = (element) => {
      clearPressed();
      element.classList.add('rr-is-pressing');
      pressed.add(element);
      pressTimer = window.setTimeout(clearPressed, 420);
    };

    const prefetchFromTarget = (element) => {
      const anchor = element.matches?.('a[href]') ? element : element.closest?.('a[href]');
      const path = getInternalPath(anchor);
      if (path) prefetchRoute(path);
    };

    const handlePointerDown = (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      const element = getPressableTarget(event.target);
      if (!element) return;

      const pointerType = event.pointerType || 'touch';
      if (pointerType !== 'mouse') {
        document.documentElement.classList.add('rr-touch-input');
        pressElement(element);
        if (element.matches(HAPTIC_SELECTOR) || element.closest(HAPTIC_SELECTOR)) {
          triggerHaptic('tap');
        }
      }

      prefetchFromTarget(element);
    };

    const handleFocusIn = (event) => {
      const element = getPressableTarget(event.target);
      if (element) prefetchFromTarget(element);
    };

    window.addEventListener('pointerdown', handlePointerDown, { capture: true, passive: true });
    window.addEventListener('pointerup', clearPressed, { capture: true, passive: true });
    window.addEventListener('pointercancel', clearPressed, { capture: true, passive: true });
    window.addEventListener('scroll', clearPressed, { capture: true, passive: true });
    document.addEventListener('focusin', handleFocusIn, true);

    return () => {
      clearPressed();
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('pointerup', clearPressed, true);
      window.removeEventListener('pointercancel', clearPressed, true);
      window.removeEventListener('scroll', clearPressed, true);
      document.removeEventListener('focusin', handleFocusIn, true);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined' || !('IntersectionObserver' in window)) {
      return undefined;
    }

    const observed = new WeakSet();
    let scanTimer = null;
    const schedule = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 700));
    const cancel = window.cancelIdleCallback || window.clearTimeout;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const path = getInternalPath(entry.target);
        if (path) prefetchRoute(path);
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '220px 0px', threshold: 0.01 });

    const scanLinks = () => {
      document.querySelectorAll('a[href]').forEach((anchor) => {
        if (observed.has(anchor) || !getInternalPath(anchor)) return;
        observed.add(anchor);
        observer.observe(anchor);
      });
    };

    const idleHandle = schedule(scanLinks);
    const mutationObserver = new MutationObserver(() => {
      if (scanTimer) window.clearTimeout(scanTimer);
      scanTimer = window.setTimeout(scanLinks, 240);
    });

    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancel(idleHandle);
      if (scanTimer) window.clearTimeout(scanTimer);
      mutationObserver.disconnect();
      observer.disconnect();
    };
  }, [location.pathname]);

  return null;
}

export default InstantInteractionLayer;
