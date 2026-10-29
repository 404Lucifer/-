import React, { useState } from 'react';
import {
  Boxes,
  Lock,
  Shield,
  Eye,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Database
} from 'lucide-react';
import { googleSignIn, emailSignIn, emailSignUp, BOOTSTRAP_ADMIN_EMAIL } from '../firebase';
import { UserRole } from '../types';

interface AuthScreenProps {
  onAuthComplete: (user: any, token: string | null) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthComplete }) => {
  const [authMode, setAuthMode] = useState<'google' | 'email'>('google');
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await googleSignIn();
      if (result) {
        onAuthComplete(result.user, result.accessToken);
      }
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      setErrorMessage(err.message || 'Google Sign-In failed or popup was closed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setIsLoading(true);
    setErrorMessage(null);
    try {
      if (isRegister) {
        const cred = await emailSignUp(email.trim(), password);
        onAuthComplete(cred.user, null);
      } else {
        const cred = await emailSignIn(email.trim(), password);
        onAuthComplete(cred.user, null);
      }
    } catch (err: any) {
      console.error('Email Auth Error:', err);
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100">
      <div className="max-w-md w-full space-y-6">
        {/* Branding & Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3.5 bg-indigo-600 rounded-2xl shadow-xl text-white mb-2">
            <Boxes className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            StockVault System
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
            Audit-controlled storage & inventory management platform with ACID transactional stock enforcement
          </p>
        </div>

        {/* Auth Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
          {/* Official Google Sign-In Button */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">
              Recommended Authentication
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-3 bg-white hover:bg-slate-100 text-slate-800 font-medium py-3 px-4 rounded-xl border border-slate-300 shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              {/* Google G Logo SVG */}
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span className="text-sm font-semibold">Sign in with Google</span>
            </button>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center space-x-1.5 text-slate-300 font-semibold">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Includes Google Sheets Export Integration</span>
              </div>
              <p className="text-slate-500">
                Grants permission to export inventory audit sheets directly to your Google Drive spreadsheet.
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-3 text-slate-500 text-xs uppercase tracking-wider">or sign in with password</span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Email / Username
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {errorMessage && (
              <div className="bg-rose-950/80 border border-rose-800 text-rose-200 text-xs rounded-xl p-3 flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-4 rounded-xl text-xs sm:text-sm transition shadow cursor-pointer disabled:opacity-50"
            >
              {isLoading ? 'Authenticating...' : isRegister ? 'Create Account' : 'Sign In with Password'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsRegister(!isRegister)}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition cursor-pointer"
              >
                {isRegister ? 'Already have an account? Sign in' : 'New user? Register account'}
              </button>
            </div>
          </form>
        </div>

        {/* Security & Integrity Footer */}
        <div className="text-center text-xs text-slate-500 flex items-center justify-center space-x-4">
          <span className="flex items-center space-x-1">
            <Lock className="w-3 h-3 text-indigo-400" />
            <span>Zero Manual Edits</span>
          </span>
          <span>•</span>
          <span className="flex items-center space-x-1">
            <Database className="w-3 h-3 text-emerald-400" />
            <span>Firestore ACID Rules</span>
          </span>
          <span>•</span>
          <span className="flex items-center space-x-1">
            <Shield className="w-3 h-3 text-amber-400" />
            <span>Strict RBAC</span>
          </span>
        </div>
      </div>
    </div>
  );
};
