import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../services/api.js';

export const Recovery: React.FC = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState('admin');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setStatus('error');
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setStatus('error');
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      await api.post('/v1/auth/recovery-code/verify', {
        username,
        recoveryCode,
        newPassword,
      });

      setStatus('success');
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'Recovery verification failed. Please check the code.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-brand-espresso to-slate-950 p-4 sm:p-6">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-brand-orange transition mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Sign In</span>
        </Link>

        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-terracotta/20 text-brand-orange">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="mt-3 text-xl font-bold tracking-tight text-white">Reset Password</h1>
          <p className="mt-1 text-xs text-slate-400">
            Use the Super Admin Recovery Code provided during initial installation.
          </p>
        </div>

        {status === 'success' && (
          <div className="mt-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-center text-xs text-emerald-300">
            <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-400 mb-1" />
            <p className="font-semibold">Password reset successfully!</p>
            <p className="mt-1 text-emerald-200">Redirecting to login page...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {status !== 'success' && (
          <form onSubmit={handleReset} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800/80 py-2 px-3 text-sm text-white focus:border-brand-orange focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300">Setup Recovery Code</label>
              <input
                type="text"
                required
                placeholder="e.g. UB-RECOVER-388001"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800/80 py-2 px-3 font-mono text-sm text-brand-sand placeholder-slate-500 focus:border-brand-orange focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300">New Password</label>
              <input
                type="password"
                required
                placeholder="Min 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800/80 py-2 px-3 text-sm text-white focus:border-brand-orange focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300">Confirm New Password</label>
              <input
                type="password"
                required
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800/80 py-2 px-3 text-sm text-white focus:border-brand-orange focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="btn-primary w-full py-2.5 text-sm font-bold shadow-lg"
            >
              {status === 'loading' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span>Reset Password</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
