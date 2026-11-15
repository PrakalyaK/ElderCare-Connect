import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Heart,
  ShieldCheck,
  BellRing,
  Mic,
  Users,
  Pill,
  Sparkles,
  ArrowRight,
  CheckCircle,
  Activity,
  Calendar,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useElderlyMode } from '../context/ElderlyModeContext';
import { api } from '../api/client';

export function LandingPage() {
  const { isAuthenticated, login } = useAuth();
  const { elderlyMode, toggle: toggleElderlyMode } = useElderlyMode();
  const navigate = useNavigate();
  const [resetting, setResetting] = React.useState(false);

  const quickLogin = async (email, password) => {
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      alert(`Login error: ${err.message}`);
    }
  };

  const handleResetDemoData = async () => {
    try {
      setResetting(true);
      await api.resetDemoData();
      alert('Demo healthcare database refreshed! You can now log in as Margaret, Sarah, or David.');
    } catch (err) {
      alert(`Reset failed: ${err.message}`);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-slate-200 bg-gradient-to-b from-white via-emerald-50/20 to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-bold uppercase tracking-wider mb-6">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>PromptWars × Catalyst • Elderly Care Platform</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight">
              Caring for those who <span className="text-emerald-600">cared for us.</span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-slate-600 leading-relaxed font-normal max-w-2xl mx-auto">
              A thoughtful, interconnected healthcare ecosystem uniting elderly patients, family members, and caregivers with smart medication adherence, voice assistance, and automated escalation.
            </p>

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-600/20 flex items-center justify-center space-x-2 transition-transform active:scale-95"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-600/20 flex items-center justify-center space-x-2 transition-transform active:scale-95"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link
                    to="/login"
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold shadow-xs flex items-center justify-center space-x-2"
                  >
                    <span>Sign In</span>
                  </Link>
                </>
              )}

              <button
                onClick={handleResetDemoData}
                disabled={resetting}
                className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100 font-semibold text-sm flex items-center justify-center space-x-2"
                title="Reset database to realistic pre-seeded hackathon sample dataset"
              >
                <RotateCcw className={`w-4 h-4 ${resetting ? 'animate-spin' : ''}`} />
                <span>{resetting ? 'Resetting DB...' : 'Reset Demo Dataset'}</span>
              </button>
            </div>
          </div>

          {/* Quick Demo Credential Cards (Hackathon Evaluator Showcase) */}
          <div className="mt-14 max-w-4xl mx-auto">
            <div className="text-center mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                1-Click Quick Demo Sign-In (Pre-Seeded Roles)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Role 1: Elderly */}
              <div className="bg-white border-2 border-emerald-300 rounded-2xl p-5 shadow-soft hover:shadow-md transition-all text-left">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Elderly Patient
                  </span>
                  <Heart className="w-4 h-4 text-emerald-600" />
                </div>
                <h4 className="font-bold text-slate-900 text-lg">Margaret Vance</h4>
                <p className="text-xs text-slate-500 font-mono mt-0.5">Profile: ELD-7842 (PIN: CARE78)</p>
                <p className="text-xs text-slate-600 mt-2">
                  High-contrast simplified mode, today's schedule, voice assistant, daily summary.
                </p>
                <button
                  onClick={() => quickLogin('margaret@eldercare.test', 'password123')}
                  className="w-full mt-4 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1"
                >
                  <span>Sign In as Margaret</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Role 2: Family */}
              <div className="bg-white border-2 border-sky-300 rounded-2xl p-5 shadow-soft hover:shadow-md transition-all text-left">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                    Family Member
                  </span>
                  <Users className="w-4 h-4 text-sky-600" />
                </div>
                <h4 className="font-bold text-slate-900 text-lg">Sarah Vance</h4>
                <p className="text-xs text-slate-500 mt-0.5">Daughter (Full Access)</p>
                <p className="text-xs text-slate-600 mt-2">
                  Shared care circle, appointment scheduling, adherence reports & real-time alerts.
                </p>
                <button
                  onClick={() => quickLogin('sarah.vance@eldercare.test', 'password123')}
                  className="w-full mt-4 py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1"
                >
                  <span>Sign In as Sarah</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Role 3: Caregiver */}
              <div className="bg-white border-2 border-teal-300 rounded-2xl p-5 shadow-soft hover:shadow-md transition-all text-left">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                    Caregiver / Nurse
                  </span>
                  <Activity className="w-4 h-4 text-teal-600" />
                </div>
                <h4 className="font-bold text-slate-900 text-lg">David Miller, RN</h4>
                <p className="text-xs text-slate-500 mt-0.5">Home Health Nurse</p>
                <p className="text-xs text-slate-600 mt-2">
                  Dose verification, inventory tracking, missed-dose escalation recipient.
                </p>
                <button
                  onClick={() => quickLogin('david.miller@eldercare.test', 'password123')}
                  className="w-full mt-4 py-2 px-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1"
                >
                  <span>Sign In as David</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Innovation Pillars */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Thoughtful, purpose-built features for elderly dignity
            </h2>
            <p className="mt-4 text-base text-slate-600">
              Unlike generic medicine reminder apps, ElderCare Connect coordinates the entire care network with real safety checks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 hover:border-emerald-300 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-4">
                <BellRing className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Smart Missed-Dose Escalation</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Multi-tier escalation triggers reminders at 15 minutes and caregiver alerts at 45 minutes if a medication remains unconfirmed.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 hover:border-emerald-300 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
                <Mic className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Voice-Assisted Elderly Mode</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Hands-free voice recognition and speech synthesis: ask about today's routine, mark doses taken, or listen to care summaries.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 hover:border-emerald-300 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Care Circle Collaboration</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Passcode-authenticated family and caregiver access with audit logging of who administered which dose and when.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 hover:border-emerald-300 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center mb-4">
                <Pill className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Inventory & Expiry Tracking</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Automatic stock decrements upon dose confirmation, proactive low-stock alerts, and expiry date monitoring.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-white">
            <Heart className="w-5 h-5 text-emerald-400 fill-emerald-400" />
            <span className="font-bold">ElderCare Connect</span>
            <span className="text-xs text-slate-500 font-normal">| PromptWars × Catalyst</span>
          </div>
          <p className="text-xs text-slate-500 text-center sm:text-right">
            Clinical Reminder: Never take an extra or double dose after a missed dose. Direct questions to your physician.
          </p>
        </div>
      </footer>
    </div>
  );
}
