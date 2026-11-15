import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  AlertTriangle,
  Clock,
  Send,
  Users,
  CheckCircle2,
  X,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { api } from '../api/client';
import { useProfile } from '../context/ProfileContext';

export function EscalationSimulatorModal({ isOpen, onClose, onEscalationTriggered }) {
  const { activeProfile } = useProfile();
  const [doses, setDoses] = useState([]);
  const [selectedLogId, setSelectedLogId] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState(null);

  const loadStatus = async () => {
    if (!activeProfile) return;
    try {
      setLoading(true);
      const res = await api.getEscalationStatus(activeProfile.id);
      setDoses(res.items || []);
      if (res.items?.length > 0 && !selectedLogId) {
        setSelectedLogId(res.items[0].logId);
      }
    } catch (err) {
      console.error('Failed to load escalation status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStatus();
      setResultMessage(null);
    }
  }, [isOpen, activeProfile]);

  const handleSimulate = async (targetLevel) => {
    if (!selectedLogId || !activeProfile) return;
    try {
      setLoading(true);
      const res = await api.simulateEscalation(activeProfile.id, {
        logId: selectedLogId,
        targetLevel,
      });

      setResultMessage(res.message);
      await loadStatus();
      if (onEscalationTriggered) onEscalationTriggered();
    } catch (err) {
      console.error('Simulation error:', err);
      setResultMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentDose = doses.find(d => d.logId === selectedLogId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Smart Missed-Dose Escalation Engine
              </h3>
              <p className="text-xs text-slate-500">
                Autonomous multi-stage adherence protection & caregiver notification simulator
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visual Workflow Pipeline Diagram */}
        <div className="my-6">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Multi-Tier Automated Escalation Architecture
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Step 1 */}
            <div className={`p-3.5 rounded-xl border transition-all ${
              currentDose?.escalationLevel === 0
                ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">T + 0 min</span>
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
              <p className="font-bold text-slate-800 text-sm mt-1">Scheduled Dose</p>
              <p className="text-xs text-slate-500 mt-1">Pending confirmation from elderly user.</p>
            </div>

            {/* Step 2 */}
            <div className={`p-3.5 rounded-xl border transition-all ${
              currentDose?.escalationLevel === 1
                ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-600">T + 15 min</span>
                <Send className="w-4 h-4 text-amber-500" />
              </div>
              <p className="font-bold text-slate-800 text-sm mt-1">Tier 1: Gentle Alert</p>
              <p className="text-xs text-slate-500 mt-1">Unconfirmed: In-app prompt & reminder email sent to elderly user.</p>
            </div>

            {/* Step 3 */}
            <div className={`p-3.5 rounded-xl border transition-all ${
              currentDose?.escalationLevel === 2
                ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-600">T + 45 min</span>
                <Users className="w-4 h-4 text-rose-500" />
              </div>
              <p className="font-bold text-slate-800 text-sm mt-1">Tier 2: Caregiver Escalation</p>
              <p className="text-xs text-slate-500 mt-1">Marked missed: Urgent email & alert dispatched to care circle.</p>
            </div>
          </div>
        </div>

        {/* Medication Dose Selector */}
        <div className="mb-6">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Select Today's Medication Dose to Test:
          </label>
          {doses.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No scheduled medication doses found for today.</p>
          ) : (
            <div className="space-y-2">
              {doses.map(dose => (
                <label
                  key={dose.logId}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedLogId === dose.logId
                      ? 'border-purple-500 bg-purple-50/60 ring-2 ring-purple-200'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="escalation_dose"
                      value={dose.logId}
                      checked={selectedLogId === dose.logId}
                      onChange={() => setSelectedLogId(dose.logId)}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <span className="font-bold text-slate-900 text-sm">{dose.medicationName}</span>
                      <span className="text-xs text-slate-500 ml-2 font-mono">({dose.dosage} at {dose.scheduledTime})</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                      dose.status === 'taken' ? 'bg-emerald-100 text-emerald-800'
                      : dose.status === 'missed' ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                    }`}>
                      {dose.status}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      Tier {dose.escalationLevel}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Action Trigger Buttons */}
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Simulate Stage Transition
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              onClick={() => handleSimulate(1)}
              disabled={loading || !selectedLogId}
              className="px-3.5 py-2.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Simulate Tier 1 (+15m)</span>
            </button>

            <button
              onClick={() => handleSimulate(2)}
              disabled={loading || !selectedLogId}
              className="px-3.5 py-2.5 rounded-xl border border-rose-300 bg-rose-50 text-rose-900 hover:bg-rose-100 font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-50"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Simulate Tier 2 (+45m)</span>
            </button>

            <button
              onClick={() => handleSimulate(0)}
              disabled={loading || !selectedLogId}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-50"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Reset to Pending (Tier 0)</span>
            </button>
          </div>
        </div>

        {/* Result Message Box */}
        {resultMessage && (
          <div className="mt-4 p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-start space-x-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{resultMessage}</p>
              <p className="text-purple-700 mt-0.5">
                Check the <strong>Notifications Log</strong> and your Nodemailer inbox to see the generated escalation alert.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
