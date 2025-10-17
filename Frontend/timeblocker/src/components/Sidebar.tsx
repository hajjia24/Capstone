'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import Link from 'next/link';

export default function Sidebar() {
  const { data: session, status } = useSession();

  return (
    <aside className="h-screen w-64 bg-gray-900 text-white flex flex-col p-4">
      <h1 className="text-2xl font-bold mb-6">My App</h1>

      {/* Add more nav links here later */}
      <nav className="flex flex-col gap-4">
        <Link href="/" className="hover:underline">Home</Link>
        {/* Future links go here */}
      </nav>

      <div className="mt-auto">
        {status === 'loading' ? (
          <p>Loading...</p>
        ) : session ? (
          <button
            onClick={() => signOut()}
            className="w-full bg-red-600 hover:bg-red-700 py-2 mt-4 rounded"
          >
            Sign Out
          </button>
        ) : (
          <button
            onClick={() => signIn('github', { prompt: 'login' })}
            className="w-full bg-blue-600 hover:bg-blue-700 py-2 mt-4 rounded"
          >
            Sign In
          </button>
        )}
      </div>
    </aside>
  );
}
