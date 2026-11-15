import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Lock, Mail, ArrowRight, AlertCircle, KeyRound, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center space-x-2 text-emerald-600 font-bold text-2xl">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
            <Heart className="w-6 h-6 fill-white" />
          </div>
          <span className="text-slate-900 font-extrabold tracking-tight">
            ElderCare<span className="text-emerald-600">Connect</span>
          </span>
        </Link>
        <h2 className="mt-4 text-2xl sm:text-3xl font-black text-slate-900">
          Sign in to your care portal
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Or{' '}
          <Link to="/register" className="font-semibold text-emerald-600 hover:text-emerald-500">
            create a new account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-soft rounded-3xl sm:px-10 border border-slate-200">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Email Address
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Password
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors disabled:opacity-50"
            >
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Autofill helper */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Instant Hackathon Demo Login</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillCredentials('margaret@eldercare.test', 'password123')}
                className="p-2 border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition-colors"
              >
                👵 Margaret (Elderly)
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('sarah.vance@eldercare.test', 'password123')}
                className="p-2 border border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100 rounded-lg text-xs font-semibold transition-colors"
              >
                👩 Sarah (Family)
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('david.miller@eldercare.test', 'password123')}
                className="p-2 border border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100 rounded-lg text-xs font-semibold transition-colors"
              >
                🩺 David (Caregiver)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
