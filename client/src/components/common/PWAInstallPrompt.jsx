import React, { useEffect, useMemo, useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';

const DISMISS_KEY = 'roomradar_pwa_install_dismissed';

const isStandalone = () => (
  window.matchMedia?.('(display-mode: standalone)').matches
  || window.navigator.standalone === true
);

const readDismissed = () => {
  try {
    return localStorage.getItem(DISMISS_KEY) === 'true';
  } catch (error) {
    return false;
  }
};

const writeDismissed = () => {
  try {
    localStorage.setItem(DISMISS_KEY, 'true');
  } catch (error) {
    // Some privacy modes block storage. The install prompt still works for this session.
  }
};

const PWAInstallPrompt = ({ hidden = false }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(readDismissed);
  const [showIosHint, setShowIosHint] = useState(false);

  const isIos = useMemo(() => /iphone|ipad|ipod/i.test(window.navigator.userAgent || ''), []);
  const canShow = !hidden && !dismissed && !isStandalone() && (deferredPrompt || isIos);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };

    const handleInstalled = () => {
      setDeferredPrompt(null);
      setDismissed(true);
      writeDismissed();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (isIos && !deferredPrompt) {
      setShowIosHint((value) => !value);
      return;
    }

    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setDismissed(true);
    writeDismissed();
  };

  if (!canShow) return null;

  return (
    <div className="fixed bottom-[calc(var(--rr-bottom-nav-height)+0.95rem)] left-3 right-[4.75rem] z-40 max-w-md md:bottom-5 md:left-auto md:right-5 md:w-[22rem]">
      <div className="overflow-hidden rounded-[1.35rem] border border-white/70 bg-white/92 p-3 text-slate-950 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.55)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/92 dark:text-white">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-rose-500 text-white shadow-lg shadow-cyan-500/20">
            <Smartphone className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black leading-tight">Install RoomRadar</p>
            <p className="mt-0.5 text-[11px] font-semibold leading-4 text-slate-500 dark:text-slate-400">
              Open faster from your home screen with app-style navigation.
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
