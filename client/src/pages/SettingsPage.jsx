import React, { useState, useEffect } from 'react';
import {
  Settings,
  KeyRound,
  ShieldCheck,
  Eye,
  RefreshCw,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { api } from '../api/client';
import { useProfile } from '../context/ProfileContext';
import { useElderlyMode } from '../context/ElderlyModeContext';
import { useAuth } from '../context/AuthContext';

export function SettingsPage() {
  const { activeProfile, loadProfiles } = useProfile();
  const { elderlyMode, toggle: toggleElderlyMode } = useElderlyMode();
  const { user } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [escalationTimeout, setEscalationTimeout] = useState('45');
  const [primaryPhysician, setPrimaryPhysician] = useState('');
  const [physicianPhone, setPhysicianPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [generatedPasscode, setGeneratedPasscode] = useState(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [resettingDemo, setResettingDemo] = useState(false);

  useEffect(() => {
    if (activeProfile) {
      setDisplayName(activeProfile.displayName || '');
      setEscalationTimeout(String(activeProfile.escalationTimeoutMinutes || 45));
      setPrimaryPhysician(activeProfile.primaryPhysician || '');
      setPhysicianPhone(activeProfile.physicianPhone || '');
      setNotes(activeProfile.notes || '');
    }
  }, [activeProfile]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!activeProfile) return;
    setSaving(true);
    setSaveSuccess(false);

    try {
      await api.updateProfile(activeProfile.id, {
        displayName,
        escalationTimeoutMinutes: parseInt(escalationTimeout, 10),
        primaryPhysician,
        physicianPhone,
        notes,
      });

      setSaveSuccess(true);
      await loadProfiles();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleResetPasscode = async () => {
    if (!activeProfile) return;
    if (!confirm('Generating a new passcode will require all family members and caregivers to update their stored passcode. Proceed?')) {
      return;
    }

    try {
      const res = await api.resetPasscode(activeProfile.id, newPasscode || undefined);
      setGeneratedPasscode(res.passcode);
      setNewPasscode('');
      alert(`New access passcode generated: ${res.passcode}`);
    } catch (err) {
      alert(`Failed to reset passcode: ${err.message}`);
    }
  };

  const copyPasscode = () => {
    if (!generatedPasscode) return;
    navigator.clipboard.writeText(generatedPasscode);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleResetDemo = async () => {
    if (!confirm('This will reset the entire database to the default hackathon demo dataset. Continue?')) return;
    try {
      setResettingDemo(true);
      await api.resetDemoData();
      alert('Database restored to default demo state.');
      window.location.reload();
    } catch (err) {
      alert(`Reset error: ${err.message}`);
    } finally {
      setResettingDemo(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className={`font-black text-slate-900 ${elderlyMode ? 'text-3xl' : 'text-2xl'}`}>
          Settings & Access Management
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Configure profile settings, regenerate caregiver passcodes, and customize interface modes.
        </p>
      </div>

      {/* Elderly Mode Control Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Eye className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-base">Elderly-Friendly High Contrast Mode</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Enlarges all typography, expands button touch targets, increases color contrast, and simplifies navigation.
          </p>
        </div>

        <button
          onClick={() => toggleElderlyMode()}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all ${
            elderlyMode
              ? 'bg-emerald-700 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          {elderlyMode ? 'Enabled (ON)' : 'Disabled (OFF)'}
        </button>
      </div>

      {/* Passcode Management Box */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-soft space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
              <KeyRound className="w-5 h-5 text-sky-600" />
              <span>Care Profile Access Credentials</span>
            </h3>
            <p className="text-xs text-slate-500">
              Unique ID and secure passcode for family members and caregivers to connect to this profile.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Profile ID
            </span>
            <span className="text-2xl font-black font-mono text-slate-900">
              {activeProfile?.profileId}
            </span>
          </div>

          {generatedPasscode ? (
            <div className="flex items-center space-x-2">
              <div className="text-right">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 block">
                  New Passcode:
                </span>
                <span className="text-2xl font-black font-mono text-emerald-700">
                  {generatedPasscode}
                </span>
              </div>
              <button
                onClick={copyPasscode}
                className="p-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-xs"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          ) : (
            <span className="text-xs text-slate-500 italic">
              Passcode is hashed securely in the database.
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <input
            type="text"
            maxLength={10}
            value={newPasscode}
            onChange={(e) => setNewPasscode(e.target.value.toUpperCase())}
            placeholder="Custom Passcode (or leave empty to auto-generate)"
            className="block w-full sm:w-80 px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-mono uppercase focus:ring-2 focus:ring-sky-500"
          />
          <button
            onClick={handleResetPasscode}
            className="w-full sm:w-auto px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Regenerate Passcode</span>
          </button>
        </div>
      </div>

      {/* Edit Profile Form */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-soft space-y-4">
        <h3 className="font-bold text-slate-900 text-base">
          Profile Settings
        </h3>

        {saveSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Profile settings saved successfully!</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Display Name
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="block w-full px-3.5 py-2 border border-slate-300 rounded-xl text-slate-900 text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Missed-Dose Escalation Delay (Minutes)
              </label>
              <input
                type="number"
                min={15}
                max={180}
                value={escalationTimeout}
                onChange={(e) => setEscalationTimeout(e.target.value)}
                className="block w-full px-3.5 py-2 border border-slate-300 rounded-xl text-slate-900 text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
              />
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
                className="block w-full px-3.5 py-2 border border-slate-300 rounded-xl text-slate-900 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Physician Phone
              </label>
              <input
                type="tel"
                value={physicianPhone}
                onChange={(e) => setPhysicianPhone(e.target.value)}
                className="block w-full px-3.5 py-2 border border-slate-300 rounded-xl text-slate-900 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              General Care Notes / Routine Preferences
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="block w-full px-3.5 py-2 border border-slate-300 rounded-xl text-slate-900 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow transition-transform active:scale-95 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Danger Zone: Demo Reset */}
      <div className="bg-rose-50/60 border border-rose-200 rounded-3xl p-6 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-rose-950 text-base flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <span>Reset Demo Healthcare Dataset</span>
          </h3>
          <p className="text-xs text-rose-800 mt-1">
            Restores the application to the original pre-seeded state for Margaret, Sarah, and David.
          </p>
        </div>

        <button
          onClick={handleResetDemo}
          disabled={resettingDemo}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-50"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${resettingDemo ? 'animate-spin' : ''}`} />
          <span>{resettingDemo ? 'Resetting...' : 'Reset Demo Data'}</span>
        </button>
      </div>
    </div>
  );
}
