import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Heart, KeyRound, Copy, Check, ArrowRight, ShieldCheck, AlertCircle, LogIn, UserPlus } from 'lucide-react';
import { api } from '../api/client';
import { useProfile } from '../context/ProfileContext';
import { useAuth } from '../context/AuthContext';

export function CreateProfilePage() {
  const navigate = useNavigate();
  const { loadProfiles } = useProfile();
  const { user, isAuthenticated, loading: authLoading, refreshUser } = useAuth();

  const [accountEmail, setAccountEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('Female');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [primaryPhysician, setPrimaryPhysician] = useState('');
  const [physicianPhone, setPhysicianPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [escalationTimeoutMinutes, setEscalationTimeoutMinutes] = useState('45');
  const [customPasscode, setCustomPasscode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdResult, setCreatedResult] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user?.fullName && !displayName) {
      setDisplayName(user.fullName);
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let res;
      const token = localStorage.getItem('eldercare_token');

      if (user && token) {
        res = await api.createProfile({
          displayName,
          dateOfBirth,
          gender,
          bloodGroup,
          primaryPhysician,
          physicianPhone,
          notes,
          escalationTimeoutMinutes,
          customPasscode: customPasscode || undefined,
        });
      } else {
        // Unauthenticated or expired: all-in-one registration + profile creation
        if (!accountEmail || !accountPassword) {
          throw new Error('Please enter your email and password to create your account.');
        }

        res = await api.registerAndCreateProfile({
          email: accountEmail,
          password: accountPassword,
          fullName: displayName,
          displayName,
          dateOfBirth,
          gender,
          bloodGroup,
          primaryPhysician,
          physicianPhone,
          notes,
          escalationTimeoutMinutes,
          customPasscode: customPasscode || undefined,
        });

        if (res.token) {
          localStorage.setItem('eldercare_token', res.token);
          await refreshUser();
        }
      }

      setCreatedResult(res);
      await loadProfiles();
    } catch (err) {
      setError(err.message || 'Failed to create healthcare profile');
    } finally {
      setLoading(false);
    }
  };

  const copyCredentials = () => {
    if (!createdResult) return;
    const text = `ElderCare Connect Profile Access:\nProfile ID: ${createdResult.profile.profileId}\nPasscode: ${createdResult.plainPasscode}\nPatient: ${createdResult.profile.displayName}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Step Indicator */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-emerald-600 rounded-2xl text-white flex items-center justify-center mx-auto mb-3 shadow-md">
            <Heart className="w-6 h-6 fill-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Create Healthcare Profile
          </h1>
          <p className="mt-1 text-slate-600 text-sm">
            Set up the elderly person's core profile and generate a secure access passcode for family and caregivers.
          </p>
        </div>

        {/* If Profile Created: Show Success & Passcode Card */}
        {createdResult ? (
          <div className="bg-white border-2 border-emerald-400 rounded-3xl p-6 sm:p-8 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-2 text-emerald-700 font-bold uppercase tracking-wider text-xs mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Healthcare Profile Registered</span>
            </div>

            <h2 className="text-2xl font-black text-slate-900">
              {createdResult.profile.displayName}'s Profile is Ready
            </h2>

            <p className="text-slate-600 text-sm mt-2 leading-relaxed">
              Family members and caregivers can request authorized access using this unique Profile ID and Passcode.
            </p>

            {/* Access Passcode Box */}
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 my-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    Profile ID
                  </span>
                  <div className="text-3xl font-black font-mono text-emerald-950 mt-1">
                    {createdResult.profile.profileId}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    Secure Caregiver Passcode
                  </span>
                  <div className="text-3xl font-black font-mono text-emerald-700 mt-1">
                    {createdResult.plainPasscode}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-emerald-200 flex items-center justify-between">
                <span className="text-xs text-emerald-800 font-medium">
                  Hashed securely in database. Store or share this passcode safely.
                </span>
                <button
                  onClick={copyCredentials}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Info'}</span>
                </button>
              </div>
            </div>

            <button
              onClick={() => navigate('/dashboard')}
              className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow transition-transform active:scale-95"
            >
              <span>Proceed to Care Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* Profile Form */
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-soft">
            {error && (
              <div className="mb-5 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
                {(error.includes('User account not found') || error.includes('session')) && (
                  <Link
                    to="/login"
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs flex items-center space-x-1 self-start sm:self-auto flex-shrink-0"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In Again</span>
                  </Link>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* If not logged in, include user account fields seamlessly */}
              {!user && (
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 mb-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                      Step 1: Your Care Account Credentials
                    </span>
                    <Link to="/login" className="text-xs font-semibold text-emerald-700 hover:underline">
                      Already registered? Sign In →
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Your Email Address *</label>
                      <input
                        type="email"
                        required
                        value={accountEmail}
                        onChange={(e) => setAccountEmail(e.target.value)}
                        placeholder="your.email@example.com"
                        className="block w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Create Password *</label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={accountPassword}
                        onChange={(e) => setAccountPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="block w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Elderly Patient Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Margaret Vance"
                  className="block w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-medium"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Blood Group
                  </label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-medium"
                  >
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Primary Physician
                  </label>
                  <input
                    type="text"
                    value={primaryPhysician}
                    onChange={(e) => setPrimaryPhysician(e.target.value)}
                    placeholder="e.g. Dr. Robert Smith"
                    className="block w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Doctor Phone
                  </label>
                  <input
                    type="tel"
                    value={physicianPhone}
                    onChange={(e) => setPhysicianPhone(e.target.value)}
                    placeholder="(555) 678-1234"
                    className="block w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Missed-Dose Escalation Delay (Minutes)
                </label>
                <input
                  type="number"
                  min={15}
                  max={180}
                  value={escalationTimeoutMinutes}
                  onChange={(e) => setEscalationTimeoutMinutes(e.target.value)}
                  className="block w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-medium"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  How many minutes after a dose is unconfirmed before alerting caregivers (Default: 45 mins).
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Custom Access Passcode (Optional - or auto-generated)
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={customPasscode}
                  onChange={(e) => setCustomPasscode(e.target.value.toUpperCase())}
                  placeholder="e.g. CARE78 (leave blank to auto-generate)"
                  className="block w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-slate-900 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-medium"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow transition-transform active:scale-95 disabled:opacity-50"
                >
                  <span>{loading ? 'Creating Profile...' : 'Save & Generate Passcode'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
