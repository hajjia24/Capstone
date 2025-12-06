"use client";

import React from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers';

export default function Navbar() {
  const { user, loading, signOut } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const view = searchParams?.get('view') || 'week';
  const [pwaPrompt, setPwaPrompt] = React.useState<any>(null);
  const [isStandalone, setIsStandalone] = React.useState(false);
  const [canInstall, setCanInstall] = React.useState(false);

  const setView = (v: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('view', v);
    router.replace(`${pathname}?${params.toString()}`);
  };

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(display-mode: standalone)');
    setIsStandalone((window.navigator as any).standalone === true || mq.matches);
    const handleChange = () => setIsStandalone((window.navigator as any).standalone === true || mq.matches);
    mq.addEventListener('change', handleChange);

    const handler = (e: Event) => {
      e.preventDefault();
      setPwaPrompt(e as any);
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // On localhost without beforeinstallprompt, still show the button on mobile
    const isMobile = /iPhone|iPad|iPod|Android/.test(navigator.userAgent);
    if (isMobile) {
      setCanInstall(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      mq.removeEventListener('change', handleChange);
    };
  }, []);

  const handleInstall = async () => {
    if (pwaPrompt) {
      pwaPrompt.prompt();
      await pwaPrompt.userChoice;
      setPwaPrompt(null);
      return;
    }
    const ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/.test(ua)) {
      alert('To install: tap Share → "Add to Home Screen".');
    } else {
      alert('To install: open your browser menu and choose "Add to Home Screen" (or Install App).');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-40 flex flex-col sm:flex-row sm:h-16 px-4 py-2 gap-2 sm:gap-0">
      <div className="flex items-center justify-between sm:justify-start w-full">
        <div className="text-lg font-semibold text-black">Timeblocker</div>
        <div className="hidden sm:flex items-center gap-2 ml-4">
          <button
            onClick={() => setView('week')}
            className={`px-3 py-1 text-sm rounded ${view === 'week' ? 'text-gray-800 bg-gray-100 font-semibold' : 'text-gray-500 hover:text-gray-800'}`}>
            Week
          </button>
          <button
            onClick={() => setView('day')}
            className={`px-3 py-1 text-sm rounded ${view === 'day' ? 'text-gray-800 bg-gray-100 font-semibold' : 'text-gray-500 hover:text-gray-800'}`}>
            Day
          </button>
        </div>
        {!isStandalone && canInstall && (
          <button
            onClick={handleInstall}
            className="sm:hidden ml-2 px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 whitespace-nowrap flex items-center justify-center"
          >
            Add to Home Screen
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:ml-4 sm:flex-nowrap">
        <div className="flex sm:hidden items-center gap-2">
          <button
            onClick={() => setView('week')}
            className={`px-3 py-1 text-sm rounded ${view === 'week' ? 'text-gray-800 bg-gray-100 font-semibold' : 'text-gray-500 hover:text-gray-800'}`}>
            Week
          </button>
          <button
            onClick={() => setView('day')}
            className={`px-3 py-1 text-sm rounded ${view === 'day' ? 'text-gray-800 bg-gray-100 font-semibold' : 'text-gray-500 hover:text-gray-800'}`}>
            Day
          </button>
        </div>

        {!isStandalone && canInstall && (
          <button
            onClick={handleInstall}
            className="hidden sm:inline-flex px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 whitespace-nowrap min-w-[180px] items-center justify-center"
          >
            Add to Home Screen
          </button>
        )}

        <div className="sm:ml-auto flex items-center space-x-3">
          {!loading && user ? (
            <button onClick={() => signOut()} className="text-sm text-gray-700 px-5 py-1 rounded hover:bg-gray-100 whitespace-nowrap">Sign out</button>
          ) : (
            <button onClick={() => router.push('/login')} className="text-sm text-gray-700 px-5 py-1 rounded hover:bg-gray-100 whitespace-nowrap">Sign in</button>
          )}
        </div>
      </div>
    </header>
  );
}
