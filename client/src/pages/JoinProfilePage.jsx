import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Users, ShieldCheck, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { api } from '../api/client';
import { useProfile } from '../context/ProfileContext';

export function JoinProfilePage() {
  const navigate = useNavigate();
  const { loadProfiles, switchProfile } = useProfile();

  const [profileId, setProfileId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [relationship, setRelationship] = useState('');
  const [role, setRole] = useState('family');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.joinProfile({
        profileId: profileId.trim().toUpperCase(),
        passcode: passcode.trim().toUpperCase(),
        relationship: relationship.trim(),
        role,
      });

      await loadProfiles();
      if (res.profile) {
        switchProfile(res.profile);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to authenticate profile access with provided passcode.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setProfileId('ELD-7842');
    setPasscode('CARE78');
    setRelationship('Daughter');
    setRole('family');
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-sky-600 rounded-2xl text-white flex items-center justify-center mx-auto mb-3 shadow-md">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Connect to Elderly Profile
          </h1>
          <p className="mt-1 text-slate-600 text-sm">
            Enter the unique Profile ID and Passcode provided by the elderly user or care administrator.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-soft">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Your Role
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('family')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold text-center transition-all ${
                    role === 'family'
                      ? 'border-sky-600 bg-sky-50 text-sky-800 ring-2 ring-sky-500/20 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Family Member
                </button>
                <button
                  type="button"
                  onClick={() => setRole('caregiver')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold text-center transition-all ${
                    role === 'caregiver'
                      ? 'border-teal-600 bg-teal-50 text-teal-800 ring-2 ring-teal-500/20 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Caregiver / Nurse
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Relationship to Patient *
              </label>
              <input
                type="text"
                required
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                placeholder="e.g. Daughter, Son, Home Nurse"
                className="block w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 sm:text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Profile ID *
              </label>
              <input
                type="text"
                required
                value={profileId}
                onChange={(e) => setProfileId(e.target.value.toUpperCase())}
                placeholder="e.g. ELD-7842"
                className="block w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-slate-900 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-sky-500 sm:text-sm font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Access Passcode *
              </label>
              <input
                type="text"
                required
                value={passcode}
                onChange={(e) => setPasscode(e.target.value.toUpperCase())}
                placeholder="e.g. CARE78"
                className="block w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-slate-900 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-sky-500 sm:text-sm font-bold"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow transition-transform active:scale-95 disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating Passcode...' : 'Verify Passcode & Connect'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Autofill button */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={fillDemo}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-sky-700 bg-slate-50 hover:bg-sky-50 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Fill Pre-Seeded Profile Demo (ELD-7842 / CARE78)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
