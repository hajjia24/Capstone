"use client";

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../providers';

function Modal({ open, onClose, children, size = 'md' }: { open: boolean; onClose: () => void; children: React.ReactNode; size?: 'md' | 'lg' }) {
  if (!open) return null;
  const sizeClass = size === 'lg' ? 'w-96' : 'w-80';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className={`bg-white rounded p-6 ${sizeClass}`}>
        {children}
        <div className="mt-4 text-right">
          <button onClick={onClose} className="text-sm text-gray-600">Close</button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const router = useRouter();

  const [isSignInOpen, setSignInOpen] = useState(true);
  const [isSignUpOpen, setSignUpOpen] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const doSignIn = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn(email, password);
    setLoading(false);
    if (res.ok) {
      router.push('/');
    } else {
      setError(res.error || 'Sign in failed');
    }
  };

  const doSignUp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signUp(email, password);
    setLoading(false);
    if (res.ok) {
      setConfirmationSent(true);
    } else {
      setError(res.error || 'Sign up failed');
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-100">
      <button
        onClick={() => {
          setSignInOpen(true);
        }}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Sign In
      </button>

      <Modal open={isSignInOpen && !isSignUpOpen} onClose={() => setSignInOpen(false)} size="lg">
        <h2 className="text-xl font-bold mb-4 text-black">Sign In</h2>
        <form onSubmit={doSignIn}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mb-3 p-2 border-2 border-gray-600 rounded text-gray-800"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mb-4 p-2 border-2 border-gray-600 rounded text-gray-800"
            required
          />
          {error && <div className="text-red-500 mb-2 text-sm">{error}</div>}
          <button type="submit" disabled={loading} className="w-full bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-black text-sm mb-3">Don't have an account?</p>
          <button
            onClick={() => {
              setSignUpOpen(true);
              setEmail('');
              setPassword('');
              setError(null);
            }}
            className="w-full bg-green-500 text-white px-4 py-2 rounded text-sm"
          >
            Create account
          </button>
        </div>
      </Modal>

      <Modal open={isSignUpOpen} onClose={() => { setSignUpOpen(false); setSignInOpen(true); }} size="md">
        {confirmationSent ? (
          <div className="text-center">
            <h2 className="text-xl font-bold mb-4 text-black">Check your email</h2>
            <p className="text-black mb-6">We've sent you a confirmation email. Please check your inbox and click the link to verify your account.</p>
            <button
              onClick={() => {
                setSignUpOpen(false);
                setConfirmationSent(false);
                setSignInOpen(true);
                setEmail('');
                setPassword('');
                setError(null);
              }}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold mb-4 text-black">Create Account</h2>
            <form onSubmit={doSignUp}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mb-3 p-2 border-2 border-gray-600 rounded text-gray-800"
                required
              />
              <input
                type="password"
                placeholder="Password (min 6 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full mb-4 p-2 border-2 border-gray-600 rounded text-gray-800"
                required
              />
              {error && <div className="text-red-500 mb-2 text-sm">{error}</div>}
              <button type="submit" disabled={loading} className="w-full bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50">
                {loading ? 'Creating...' : 'Create account'}
              </button>
            </form>
          </>
        )}
      </Modal>
    </main>
  );
}