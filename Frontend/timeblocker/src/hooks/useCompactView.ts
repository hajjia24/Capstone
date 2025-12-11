"use client";

import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'compactViewEnabled';

type CompactViewState = boolean;

export function useCompactView() {
  const [compact, setCompact] = useState<CompactViewState>(false);

  // Read from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') setCompact(true);
  }, []);

  // Persist changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, compact ? 'true' : 'false');
  }, [compact]);

  // Respond to storage events (other tabs)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue !== null) {
        setCompact(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const toggleCompact = useCallback(() => setCompact((prev) => !prev), []);

  return { compact, setCompact, toggleCompact };
}
