import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, Lock, User, Eye, EyeOff, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@UmaBhavan2026');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(username, password, rememberMe);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-brand-espresso to-slate-950 p-4 sm:p-6">
      {/* Background ambient accents */}
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-brand-orange/20 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-brand-terracotta/20 blur-3xl" />

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl">
        {/* Top Logo and Title */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-terracotta to-brand-orange text-white shadow-glow">
            <Building2 className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-white">UMA BHAVAN</h1>
          <p className="mt-1 text-xs text-brand-sand font-medium uppercase tracking-wider">
            Anand, Gujarat (388001)
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Authorized Single-Samaj Community Management System
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300">Username</label>
            <div className="relative mt-1">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter operator username"
                className="w-full rounded-lg border border-slate-700 bg-slate-800/80 py-2.5 pl-9 pr-4 text-sm text-white placeholder-slate-500 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300">Password</label>
              <Link
                to="/recovery"
                className="text-[11px] font-semibold text-brand-orange hover:text-brand-light transition"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter account password"
                className="w-full rounded-lg border border-slate-700 bg-slate-800/80 py-2.5 pl-9 pr-10 text-sm text-white placeholder-slate-500 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Remember me checkbox */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-brand-terracotta focus:ring-brand-orange"
              />
              <span className="text-xs text-slate-300">Remember me (30 days)</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full py-2.5 text-sm font-bold shadow-lg"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                <span>Sign In to Dashboard</span>
              </>
            )}
          </button>
        </form>

        {/* Security Notice */}
        <div className="mt-6 border-t border-slate-800 pt-4 text-center">
          <p className="text-[11px] text-slate-500">
            5 failed attempts trigger a 5-minute security lock.
          </p>
        </div>
      </div>
    </div>
  );
};
