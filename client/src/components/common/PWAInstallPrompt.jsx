import React, { useEffect, useMemo, useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';

const DISMISS_KEY = 'roomradar_pwa_install_dismissed';
const DISMISS_UNTIL_KEY = 'roomradar_pwa_install_dismissed_until';
const CANCEL_UNTIL_KEY = 'roomradar_pwa_install_cancelled_until';
const INSTALLED_KEY = 'roomradar_pwa_installed';
const SESSION_KEY = 'roomradar_pwa_install_seen_session';
const PROMPT_VERSION_KEY = 'roomradar_pwa_install_version';
const PROMPT_VERSION = 'mobile-fallback-v2';

const DAY_MS = 24 * 60 * 60 * 1000;
const SHOW_AFTER_MS = 4500;
const MOBILE_SHOW_AFTER_MS = 6500;
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

const syncPromptVersion = () => {
  if (readStorage(PROMPT_VERSION_KEY) === PROMPT_VERSION) return;
  removeStorage(DISMISS_KEY);
  removeStorage(DISMISS_UNTIL_KEY);
  removeStorage(CANCEL_UNTIL_KEY);
  removeStorage(INSTALLED_KEY);
  writeStorage(PROMPT_VERSION_KEY, PROMPT_VERSION);
};

const getSuppressedUntil = () => {
  if (!hasBrowser) return Number.POSITIVE_INFINITY;
  if (isStandalone()) return Number.POSITIVE_INFINITY;

  syncPromptVersion();

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

const getCapturedInstallPrompt = () => {
  if (!hasBrowser) return null;
  return window.roomRadarDeferredInstallPrompt || null;
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
  const [deferredPrompt, setDeferredPrompt] = useState(getCapturedInstallPrompt);
  const [suppressedUntil, setSuppressedUntil] = useState(getSuppressedUntil);
  const [visible, setVisible] = useState(false);
  const [showManualHint, setShowManualHint] = useState(false);

  const isIos = useMemo(() => (
    hasBrowser && /iphone|ipad|ipod/i.test(window.navigator.userAgent || '')
  ), []);
  const isAndroid = useMemo(() => (
    hasBrowser && /android/i.test(window.navigator.userAgent || '')
  ), []);
  const isMobileBrowser = useMemo(() => (
    hasBrowser
    && !isStandalone()
    && (
      window.matchMedia?.('(max-width: 768px)').matches
      || /android|iphone|ipad|ipod|mobile/i.test(window.navigator.userAgent || '')
    )
  ), []);

  const canShow = visible
    && !hidden
    && Date.now() >= suppressedUntil
    && !isStandalone()
    && (deferredPrompt || isIos || isMobileBrowser);

  const manualInstallText = isIos
    ? 'On iPhone, tap the Share button, then choose Add to Home Screen.'
    : isAndroid
      ? 'On Android, open the browser menu and tap Install app or Add to Home screen.'
      : 'Open the browser menu and choose Install app or Add to Home screen.';

  useEffect(() => {
    const syncCapturedPrompt = () => {
      const capturedPrompt = getCapturedInstallPrompt();
      if (capturedPrompt) {
        setDeferredPrompt(capturedPrompt);
        setSuppressedUntil(getSuppressedUntil());
      }
    };

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      window.roomRadarDeferredInstallPrompt = event;
      setSuppressedUntil(getSuppressedUntil());
    };

    const handleInstalled = () => {
      writeStorage(INSTALLED_KEY, 'true');
      window.roomRadarDeferredInstallPrompt = null;
      setDeferredPrompt(null);
      setVisible(false);
      setSuppressedUntil(Number.POSITIVE_INFINITY);
    };

    syncCapturedPrompt();
    window.addEventListener('roomradar:pwa-install-ready', syncCapturedPrompt);
    window.addEventListener('roomradar:pwa-installed', handleInstalled);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('roomradar:pwa-install-ready', syncCapturedPrompt);
      window.removeEventListener('roomradar:pwa-installed', handleInstalled);
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
      || (!deferredPrompt && !isIos && !isMobileBrowser)
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

    const delayTimer = window.setTimeout(showPrompt, isMobileBrowser ? MOBILE_SHOW_AFTER_MS : SHOW_AFTER_MS);
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
  }, [deferredPrompt, hidden, isIos, isMobileBrowser, suppressedUntil]);

  const suppressFor = (key, duration) => {
    const until = writeUntil(key, duration);
    setSuppressedUntil(until);
    setVisible(false);
    setShowManualHint(false);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) {
      setShowManualHint((value) => !value);
      return;
    }

    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    window.roomRadarDeferredInstallPrompt = null;
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
    <div className="pwa-install-shell">
      <div className="pwa-install-card overflow-hidden rounded-[1.25rem] border border-white/70 bg-white/95 p-3 text-slate-950 shadow-[0_18px_46px_-30px_rgba(15,23,42,0.55)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/94 dark:text-white">
        <div className="pwa-install-row flex items-start gap-2.5">
          <span className="pwa-install-icon flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <Smartphone className="h-5 w-5" />
          </span>
          <div className="pwa-install-copy min-w-0 flex-1">
            <p className="pwa-install-title text-sm font-black leading-tight">Install RoomRadar</p>
            <p className="pwa-install-subtitle mt-0.5 text-[11px] font-semibold leading-4 text-slate-500 dark:text-slate-400">
              Fast launch, saved rooms, chat, aur booking updates.
            </p>
          </div>
          <div className="pwa-install-actions flex flex-shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={handleInstall}
              className="pwa-install-action inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full bg-slate-950 px-3 text-xs font-black text-white transition active:scale-[0.98] dark:bg-white dark:text-slate-950"
            >
              <Download className="h-3.5 w-3.5" />
              {deferredPrompt ? 'Install' : 'Steps'}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="pwa-install-dismiss flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"
              aria-label="Dismiss install prompt"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {showManualHint && (
          <p className="mt-2 rounded-2xl bg-cyan-500/10 px-3 py-2 text-[11px] font-bold leading-5 text-cyan-800 dark:text-cyan-200">
            {manualInstallText}
          </p>
        )}
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
