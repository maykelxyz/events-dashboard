'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const serif = { fontFamily: 'var(--font-cormorant), serif' };

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Invalid email or password');
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5E6E0] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Heading */}
        <div className="text-center mb-10">
          <p
            className="text-xs tracking-[0.3em] uppercase text-[#8B7468] mb-3"
            style={serif}
          >
            Welcome
          </p>
          <h1
            className="text-5xl text-[#6B4F43] italic mb-4"
            style={serif}
          >
            Events Dashboard
          </h1>
          <div className="w-12 h-px bg-[#C4A88A] mx-auto" />
        </div>

        {/* Form card */}
        <div className="bg-white/70 border border-[#C4A88A]/40 p-8">
          <form onSubmit={handleLogin} className="flex flex-col gap-6">
            <div>
              <label
                className="block text-xs tracking-[0.25em] uppercase text-[#8B7468] mb-2"
                style={serif}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full border border-[#C4A88A]/40 bg-white/60 px-4 py-3 text-[#3A3A3A] placeholder:text-[#8B7468]/40 focus:outline-none focus:border-[#6B4F43] transition-colors text-sm"
                style={serif}
              />
            </div>

            <div>
              <label
                className="block text-xs tracking-[0.25em] uppercase text-[#8B7468] mb-2"
                style={serif}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full border border-[#C4A88A]/40 bg-white/60 px-4 py-3 text-[#3A3A3A] placeholder:text-[#8B7468]/40 focus:outline-none focus:border-[#6B4F43] transition-colors text-sm"
              />
            </div>

            {error && (
              <p
                className="text-xs tracking-[0.1em] text-red-500 text-center -mt-2"
                style={serif}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-[#6B4F43] text-white text-xs tracking-[0.25em] uppercase py-4 hover:bg-[#5A3F33] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              style={serif}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
