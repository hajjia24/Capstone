// PWA Service Worker Registration
export async function registerServiceWorker() {
  if (typeof window === 'undefined') {
    return;
  }

  // Only register SW in production or if explicitly enabled
  if (process.env.NODE_ENV !== 'production' && !process.env.NEXT_PUBLIC_ENABLE_PWA) {
    console.debug('PWA disabled in development');
    return;
  }

  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      console.log('Service Worker registered successfully:', registration);
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
}
