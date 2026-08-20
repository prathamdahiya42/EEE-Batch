'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminLogin } from '@/lib/actions';
import Link from 'next/link';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await adminLogin(email, password);
      if (result.error) {
        setError(result.error);
      } else {
        router.push('/admin');
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Floating Glass Card */}
        <div className="glass-card p-8 sm:p-10 shadow-lg">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/70 border border-[#FFD9E8] mb-4 shadow-2xs">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF4F9A] pulse-pink-glow" />
              <span className="font-display text-sm font-bold text-[#3D2C36] tracking-tight">
                Admin Access
              </span>
            </div>
            <h2 className="font-display text-2xl font-extrabold text-[#3D2C36] mb-1">
              Sign In to Pulse
            </h2>
            <p className="font-mono text-xs text-[#3D2C36]/60 tracking-wide uppercase">
              Authorized batch administrators only
            </p>
          </div>

          {/* Login form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block font-mono text-[11px] font-semibold text-[#C2185B] tracking-wider uppercase mb-1.5"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 glass-input text-sm text-[#3D2C36] placeholder-[#3D2C36]/30 font-medium"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block font-mono text-[11px] font-semibold text-[#C2185B] tracking-wider uppercase mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 glass-input text-sm text-[#3D2C36] placeholder-[#3D2C36]/30 font-medium"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-2xl bg-rose-50 border border-rose-200">
                <p className="font-mono text-xs text-rose-700 font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 glass-btn-primary font-display text-sm font-bold tracking-wide cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Back link */}
          <div className="mt-8 text-center pt-6 border-t border-[#FFD9E8]/60">
            <Link
              href="/"
              className="font-mono text-xs text-[#3D2C36]/60 hover:text-[#FF4F9A] transition-colors tracking-wide uppercase font-medium"
            >
              ← Back to public view
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
