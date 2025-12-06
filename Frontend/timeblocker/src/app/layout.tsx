'use client'

import './globals.css'
import { Providers } from './providers'
import Navbar from '@/components/Navbar'
import { Suspense } from 'react'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="application-name" content="TimeBlocker" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="TimeBlocker" />
        <meta name="description" content="Time blocking calendar app for managing your daily schedule" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#2563eb" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192x192.svg" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="bg-white">
        <Providers>
          <Suspense fallback={<div className="h-16 bg-blue-600" />}>
            <Navbar />
          </Suspense>
          <main className="pt-28 sm:pt-16 bg-white min-h-screen">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  )
}

