import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Utensils,
  Info,
  ChevronRight,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { api } from '../api/client';
import { useElderlyMode } from '../context/ElderlyModeContext';

export function MedicationTimeline({ schedule, profileId, onDoseUpdated }) {
  const { elderlyMode } = useElderlyMode();
  const [markingId, setMarkingId] = useState(null);

  const handleMarkTaken = async (doseId, medName) => {
    try {
      setMarkingId(doseId);
      await api.markDoseTaken(profileId, doseId);
      if (onDoseUpdated) onDoseUpdated();
    } catch (err) {
      alert(`Could not mark medication taken: ${err.message}`);
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkSkipped = async (doseId) => {
    const reason = prompt('Please enter reason for skipping this dose (optional):');
    try {
      setMarkingId(doseId);
      await api.markDoseSkipped(profileId, doseId, reason || 'Skipped by user');
      if (onDoseUpdated) onDoseUpdated();
    } catch (err) {
      alert(`Could not mark skipped: ${err.message}`);
    } finally {
      setMarkingId(null);
    }
  };

  if (!schedule || schedule.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
        <p className="text-slate-500 font-medium">No medications are scheduled for today.</p>
      </div>
    );
  }

  return (
    <div className="relative pl-6 sm:pl-8 border-l-2 border-slate-200 space-y-6">
      {schedule.map((dose, idx) => {
        const isTaken = dose.status === 'taken';
        const isMissed = dose.status === 'missed';
        const isSkipped = dose.status === 'skipped';
        const isPending = dose.status === 'pending';
        const isBusy = markingId === dose.id;

        // Food instructions badge text
        const foodText = dose.foodRelation === 'with_food' ? 'Take with food'
          : dose.foodRelation === 'before_food' ? 'Before meal'
          : dose.foodRelation === 'after_food' ? 'After meal'
          : 'Can take anytime';

        return (
          <div key={dose.id} className="relative group">
            {/* Timeline bullet icon */}
            <div className={`absolute -left-[35px] sm:-left-[43px] top-4 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2 shadow-xs transition-colors ${
              isTaken ? 'bg-emerald-500 border-emerald-600 text-white'
              : isMissed ? 'bg-rose-500 border-rose-600 text-white animate-bounce'
              : isSkipped ? 'bg-slate-400 border-slate-500 text-white'
              : 'bg-white border-amber-400 text-amber-600'
            }`}>
              {isTaken ? <Check className="w-4 h-4" />
                : isMissed ? <AlertTriangle className="w-4 h-4" />
                : isSkipped ? <XCircle className="w-4 h-4" />
                : <Clock className="w-4 h-4" />}
            </div>

            {/* Dose Card */}
            <div className={`rounded-2xl border transition-all ${
              isTaken ? 'bg-emerald-50/40 border-emerald-200'
              : isMissed ? 'bg-rose-50/50 border-rose-300 ring-2 ring-rose-200'
              : 'bg-white border-slate-200 shadow-soft hover:border-emerald-300'
            } ${elderlyMode ? 'p-6 sm:p-7' : 'p-4 sm:p-5'}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Left: Dose details */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {dose.scheduledTime}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                      isTaken ? 'bg-emerald-100 text-emerald-800'
                      : isMissed ? 'bg-rose-100 text-rose-800'
                      : isSkipped ? 'bg-slate-200 text-slate-700'
                      : 'bg-amber-100 text-amber-800'
                    }`}>
                      {dose.status}
                    </span>
                    {dose.escalationLevel > 0 && isPending && (
                      <span className="text-[11px] font-bold px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full animate-pulse">
                        Tier {dose.escalationLevel} Overdue
                      </span>
                    )}
                  </div>

                  <h3 className={`font-bold text-slate-900 ${elderlyMode ? 'text-2xl font-black' : 'text-lg'}`}>
                    {dose.name}
                  </h3>

                  <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">
                      {dose.dosage}
                    </span>
                    <span className="flex items-center space-x-1 text-slate-500">
                      <Utensils className="w-3.5 h-3.5" />
                      <span>{foodText}</span>
                    </span>
                    {dose.instructions && (
                      <span className="text-slate-500 italic truncate max-w-sm">
                        • {dose.instructions}
                      </span>
                    )}
                  </div>

                  {/* Confirmation note / who confirmed */}
                  {isTaken && dose.recordedByName && (
                    <div className="text-xs text-emerald-700 font-medium flex items-center space-x-1 pt-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Confirmed by {dose.recordedByName} at {dose.recordedAt ? new Date(dose.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                    </div>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center space-x-2">
                  {isPending || isMissed ? (
                    <>
                      <button
                        onClick={() => handleMarkTaken(dose.id, dose.name)}
                        disabled={isBusy}
                        className={`flex items-center justify-center space-x-2 font-bold text-white rounded-xl shadow transition-transform active:scale-95 disabled:opacity-50 ${
                          elderlyMode
                            ? 'bg-emerald-700 hover:bg-emerald-800 text-xl px-6 py-4'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-sm px-4 py-2.5'
                        }`}
                      >
                        <CheckCircle2 className={elderlyMode ? 'w-6 h-6' : 'w-4 h-4'} />
                        <span>{isBusy ? 'Saving...' : 'Mark as Taken'}</span>
                      </button>

                      <button
                        onClick={() => handleMarkSkipped(dose.id)}
                        disabled={isBusy}
                        className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Skip this dose"
                      >
                        Skip
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center space-x-1 text-emerald-700 font-bold text-sm bg-emerald-100/70 px-3 py-1.5 rounded-xl border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Completed</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
