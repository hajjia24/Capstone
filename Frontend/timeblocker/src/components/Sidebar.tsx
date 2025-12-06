'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '../app/providers'
import { useSidebar } from '../lib/sidebarContext'

export default function Sidebar() {
  const { isOpen, toggleSidebar } = useSidebar()
  const { user, signOut } = useAuth()
  const [btnHover, setBtnHover] = useState(false)

  return (
    <>
      {/* Top Bar */}
      <div className="fixed top-0 left-0 w-full h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-50">
        <div className="text-xl font-bold text-gray-800">Timeblocker</div>
        <div>
          {user ? (
            <button
              onClick={() => signOut()}
              className="text-sm text-gray-600 hover:text-red-500"
            >
              Sign Out
            </button>
          ) : (
            <Link href="/login" className="text-sm text-gray-600 hover:text-green-500">
              Sign In
            </Link>
          )}
        </div>
      </div>

      {/* Sidebar with attached toggle button */}
      {/* We'll compute explicit pixel widths so transitions are smooth and predictable */}
      {(() => {
        const baseClosed = 40; // previous closed width in px (approx w-10)
        const baseOpen = 256; // previous open width in px (approx w-64)
        const closedWidth = Math.round(baseClosed / 2); // halve the closed width (e.g., 40 -> 20)
        const openWidth = baseOpen - (baseClosed - closedWidth); // reduce open by same delta
        const containerWidth = isOpen ? openWidth : closedWidth;
        const buttonLeft = containerWidth; // button sits at the edge of the container

        return (
          <div
            style={{ width: `${containerWidth}px`, transition: 'width 300ms ease' }}
            className={`fixed top-16 left-0 h-full z-40`}
          >
            {/* Sidebar content responds to isOpen so it visually collapses */}
            <aside
              style={{ width: `${containerWidth}px`, transition: 'width 300ms ease', padding: isOpen ? '1.5rem' : '0.25rem' }}
              className="h-full bg-gray-50 border-r border-gray-200 overflow-hidden"
            >
              <nav className="space-y-4 text-gray-700 font-medium">
                <Link href="/?view=week" className={`block hover:text-blue-600 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  Week
                </Link>
                <Link href="/?view=day" className={`block hover:text-blue-600 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  Day
                </Link>
                <Link href="/dashboard" className={`block hover:text-blue-600 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  Dashboard
                </Link>
                <Link href="/tasks" className={`block hover:text-blue-600 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  Tasks
                </Link>
                <Link href="/settings" className={`block hover:text-blue-600 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  Settings
                </Link>
              </nav>
            </aside>

            {/* right-edge sliver that visually matches the button (acts as buffer) */}
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                width: `${closedWidth}px`,
                height: '100%',
                transition: 'width 300ms ease',
              }}
              className={`${btnHover ? 'bg-gray-300' : 'bg-gray-200'} z-40`}
            />

            {/* Toggle Button attached to sidebar - fixed so it sits on the viewport edge */}
            <button
              style={{ left: `${buttonLeft}px`, transition: 'left 300ms ease' }}
              className={`fixed top-20 -translate-x-1/2 w-10 h-10 ${btnHover ? 'bg-gray-300' : 'bg-gray-200'} hover:bg-gray-300 text-gray-700 flex items-center justify-center rounded-r-full border border-l-0 border-gray-200 z-50`}
              onClick={toggleSidebar}
              onMouseEnter={() => setBtnHover(true)}
              onMouseLeave={() => setBtnHover(false)}
              aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {isOpen ? '←' : '→'}
            </button>
          </div>
        );
      })()}
    </>
  )
}
