import React, { useEffect, useMemo, useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';

const DISMISS_KEY = 'roomradar_pwa_install_dismissed';
const DISMISS_UNTIL_KEY = 'roomradar_pwa_install_dismissed_until';
const CANCEL_UNTIL_KEY = 'roomradar_pwa_install_cancelled_until';
const INSTALLED_KEY = 'roomradar_pwa_installed';
const SESSION_KEY = 'roomradar_pwa_install_seen_session';

const DAY_MS = 24 * 60 * 60 * 1000;
const SHOW_AFTER_MS = 8000;
const DISMISS_COOLDOWN_MS = 3 * DAY_MS;
const CANCEL_COOLDOWN_MS = 7 * DAY_MS;

let promptSeenInMemory = false;

const hasBrowser = typeof window !== 'undefined';

const isStandalone = () => (
  hasBrowser
  && (window.matchMedia?.('(display-mode: standalone)').matches
    || window.navigator.standalone === true)
);

const readStorage = (key) => {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    return null;
  }
};

const writeStorage = (key, value) => {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    // Some privacy modes block storage. The install prompt still works for this session.
  }
};

const removeStorage = (key) => {
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    // Storage is best-effort.
  }
};

const readUntil = (key) => {
  const value = Number(readStorage(key) || 0);
  return Number.isFinite(value) ? value : 0;
};

const writeUntil = (key, duration) => {
  const until = Date.now() + duration;
  writeStorage(key, String(until));
  return until;
};

const migrateLegacyDismiss = () => {
  if (readStorage(DISMISS_KEY) !== 'true' || readStorage(DISMISS_UNTIL_KEY)) return 0;

  const until = writeUntil(DISMISS_UNTIL_KEY, DISMISS_COOLDOWN_MS);
  removeStorage(DISMISS_KEY);
  return until;
};

const getSuppressedUntil = () => {
  if (!hasBrowser) return Number.POSITIVE_INFINITY;
  if (readStorage(INSTALLED_KEY) === 'true' || isStandalone()) return Number.POSITIVE_INFINITY;

  const now = Date.now();
  const legacyUntil = migrateLegacyDismiss();
  const until = Math.max(legacyUntil, readUntil(DISMISS_UNTIL_KEY), readUntil(CANCEL_UNTIL_KEY));

  if (until <= now) {
    removeStorage(DISMISS_UNTIL_KEY);
    removeStorage(CANCEL_UNTIL_KEY);
    return 0;
  }

  return until;
};

const hasSeenThisSession = () => {
  if (promptSeenInMemory) return true;

  try {
    return window.sessionStorage.getItem(SESSION_KEY) === 'true';
  } catch (error) {
    return false;
  }
};

const markSeenThisSession = () => {
  promptSeenInMemory = true;
  try {
    window.sessionStorage.setItem(SESSION_KEY, 'true');
  } catch (error) {
    // Session storage is best-effort.
  }
};

const PWAInstallPrompt = ({ hidden = false }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [suppressedUntil, setSuppressedUntil] = useState(getSuppressedUntil);
  const [visible, setVisible] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  const isIos = useMemo(() => (
    hasBrowser && /iphone|ipad|ipod/i.test(window.navigator.userAgent || '')
  ), []);

  const canShow = visible
    && !hidden
    && Date.now() >= suppressedUntil
    && !isStandalone()
    && (deferredPrompt || isIos);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setSuppressedUntil(getSuppressedUntil());
    };

    const handleInstalled = () => {
      writeStorage(INSTALLED_KEY, 'true');
      setDeferredPrompt(null);
      setVisible(false);
      setSuppressedUntil(Number.POSITIVE_INFINITY);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  useEffect(() => {
    setSuppressedUntil(getSuppressedUntil());
  }, [hidden]);

  useEffect(() => {
    if (
      hidden
      || isStandalone()
      || hasSeenThisSession()
      || Date.now() < suppressedUntil
      || (!deferredPrompt && !isIos)
    ) {
      setVisible(false);
      return undefined;
    }

    let interactionTimer = null;
    const showPrompt = () => {
      if (hasSeenThisSession()) return;
      markSeenThisSession();
      setVisible(true);
    };

    const delayTimer = window.setTimeout(showPrompt, SHOW_AFTER_MS);
    const showAfterEngagement = () => {
      if (interactionTimer) return;
      interactionTimer = window.setTimeout(showPrompt, 2200);
    };

    window.addEventListener('scroll', showAfterEngagement, { passive: true, once: true });
    window.addEventListener('pointerdown', showAfterEngagement, { passive: true, once: true });

    return () => {
      window.clearTimeout(delayTimer);
      if (interactionTimer) window.clearTimeout(interactionTimer);
      window.removeEventListener('scroll', showAfterEngagement);
      window.removeEventListener('pointerdown', showAfterEngagement);
    };
  }, [deferredPrompt, hidden, isIos, suppressedUntil]);

  const suppressFor = (key, duration) => {
    const until = writeUntil(key, duration);
    setSuppressedUntil(until);
    setVisible(false);
    setShowIosHint(false);
  };

  const handleInstall = async () => {
    if (isIos && !deferredPrompt) {
      setShowIosHint((value) => !value);
      return;
    }

    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);

    if (choice?.outcome === 'dismissed') {
      suppressFor(CANCEL_UNTIL_KEY, CANCEL_COOLDOWN_MS);
    }
  };

  const dismiss = () => {
    suppressFor(DISMISS_UNTIL_KEY, DISMISS_COOLDOWN_MS);
  };

  if (!canShow) return null;

  return (
    <div className="pwa-install-shell fixed bottom-[calc(var(--rr-bottom-nav-height)+0.95rem)] left-3 right-[4.75rem] z-40 max-w-md md:bottom-5 md:left-auto md:right-5 md:w-[22rem]">
      <div className="pwa-install-card overflow-hidden rounded-[1.35rem] border border-white/70 bg-white/92 p-3 text-slate-950 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.55)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/92 dark:text-white">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-rose-500 text-white shadow-lg shadow-cyan-500/20">
            <Smartphone className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black leading-tight">Install RoomRadar</p>
            <p className="mt-0.5 text-[11px] font-semibold leading-4 text-slate-500 dark:text-slate-400">
              Faster launch, smoother tabs, app-style navigation.
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"
            aria-label="Dismiss install prompt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {showIosHint && (
          <p className="mt-2 rounded-2xl bg-cyan-500/10 px-3 py-2 text-[11px] font-bold leading-5 text-cyan-800 dark:text-cyan-200">
            iPhone par Share button dabao, phir Add to Home Screen choose karo.
          </p>
        )}

        <button
          type="button"
          onClick={handleInstall}
          className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition active:scale-[0.98] dark:bg-white dark:text-slate-950"
        >
          <Download className="h-4 w-4" />
          Install app
        </button>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
