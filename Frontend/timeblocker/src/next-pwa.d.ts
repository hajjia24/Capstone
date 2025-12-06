declare module 'next-pwa' {
  import type { NextConfig } from 'next';
  
  interface PWAConfig {
    dest?: string;
    register?: boolean;
    skipWaiting?: boolean;
    disable?: boolean;
    scope?: string;
    sw?: string;
    publicExcludes?: string[];
    buildExcludes?: string[];
    manifestTransforms?: any[];
    transformManifest?: (manifest: any) => any;
    workboxOptions?: any;
    runtimeCaching?: any[];
    reloadOnOnline?: boolean;
    fallbacks?: {
      image?: string;
      font?: string;
      document?: string;
    };
    images?: string[];
    fonts?: string[];
    documents?: string[];
  }
  
  interface PWAPlugin {
    (config: PWAConfig): (nextConfig: NextConfig) => NextConfig;
  }
  
  const withPWA: PWAPlugin;
  export default withPWA;
}
