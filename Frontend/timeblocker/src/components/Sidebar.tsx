'use client'

import Link from 'next/link'
import { useAuth } from '../app/providers'

export default function Sidebar() {
  const { user, signOut } = useAuth()

  return (
    <>
      {/* Top Bar */}
      <div className="fixed top-0 left-0 w-full h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-50">
        <div className="text-xl font-bold text-gray-800">Timeblocker</div>
        <div className="flex items-center gap-4">
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
    </>
  )
}
