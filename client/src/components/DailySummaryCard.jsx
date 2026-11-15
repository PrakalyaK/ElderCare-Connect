import React, { useState, useEffect } from 'react';
import {
  Sun,
  Moon,
  Volume2,
  VolumeX,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  Package,
} from 'lucide-react';
import { api } from '../api/client';
import { useProfile } from '../context/ProfileContext';
import { useElderlyMode } from '../context/ElderlyModeContext';

export function DailySummaryCard({ refreshKey }) {
  const { activeProfile } = useProfile();
  const { elderlyMode } = useElderlyMode();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (!activeProfile) return;
    setLoading(true);
    api.getDailySummary(activeProfile.id)
      .then(res => setSummary(res))
      .catch(err => console.error('Failed to load summary:', err))
      .finally(() => setLoading(false));

    return () => {
      window.speechSynthesis?.cancel();
    };
  }, [activeProfile, refreshKey]);

  const toggleSpeak = () => {
    if (!summary?.spokenText) return;

    if (isSpeaking) {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis?.cancel();
      const utterance = new SpeechSynthesisUtterance(summary.spokenText);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis?.speak(utterance);
    }
  };

  if (loading || !summary) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-soft animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-slate-100 rounded w-full mb-2"></div>
        <div className="h-4 bg-slate-100 rounded w-2/3"></div>
      </div>
    );
  }

  const { greeting, displayName, spokenText, metrics, takenMedicines, pendingMedicines, missedMedicines, lowStockList } = summary;

  return (
    <div className={`rounded-2xl border transition-all ${
      elderlyMode
        ? 'bg-emerald-50/70 border-emerald-300 p-6 sm:p-8 shadow-md'
        : 'bg-gradient-to-r from-emerald-50/60 via-teal-50/30 to-sky-50/40 border-emerald-200/80 p-6 shadow-soft'
    }`}>
      {/* Top Header with Audio Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-emerald-200/60">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
            {new Date().getHours() < 17 ? <Sun className="w-5 h-5 text-amber-300" /> : <Moon className="w-5 h-5 text-indigo-200" />}
          </div>
          <div>
            <h2 className={`font-bold text-slate-900 ${elderlyMode ? 'text-2xl font-black text-emerald-950' : 'text-xl'}`}>
              {greeting}, {displayName}!
            </h2>
            <p className="text-xs text-slate-500 font-medium">Daily Care Routine Briefing</p>
          </div>
        </div>

        {/* Audio Speech Button */}
        <button
          onClick={toggleSpeak}
          className={`inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl font-bold transition-all shadow-sm ${
            isSpeaking
              ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
          title="Listen to this daily summary read aloud"
        >
          {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          <span className="text-xs">{isSpeaking ? 'Stop Reading' : 'Listen Aloud'}</span>
        </button>
      </div>

      {/* Spoken Text in Simple Large Plain Language */}
      <p className={`my-4 text-slate-800 leading-relaxed font-medium ${
        elderlyMode ? 'text-xl leading-relaxed font-semibold text-slate-900' : 'text-base'
      }`}>
        {spokenText}
      </p>

      {/* Snapshot Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        <div className="bg-white/90 border border-emerald-200 rounded-xl p-3 shadow-xs">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Taken</span>
          </div>
          <p className="text-xl font-black text-slate-900 mt-1">{metrics.takenCount}</p>
          <span className="text-[11px] text-slate-500">doses confirmed</span>
        </div>

        <div className="bg-white/90 border border-amber-200 rounded-xl p-3 shadow-xs">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-700">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Pending</span>
          </div>
          <p className="text-xl font-black text-slate-900 mt-1">{metrics.pendingCount}</p>
          <span className="text-[11px] text-slate-500">upcoming today</span>
        </div>

        <div className="bg-white/90 border border-rose-200 rounded-xl p-3 shadow-xs">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-rose-700">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>Unconfirmed</span>
          </div>
          <p className="text-xl font-black text-slate-900 mt-1">{metrics.missedCount}</p>
          <span className="text-[11px] text-slate-500">requires attention</span>
        </div>

        <div className="bg-white/90 border border-sky-200 rounded-xl p-3 shadow-xs">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-sky-700">
            <Calendar className="w-3.5 h-3.5 text-sky-600" />
            <span>Appointments</span>
          </div>
          <p className="text-xl font-black text-slate-900 mt-1">{metrics.hasAppointmentsToday ? '1 Today' : 'None today'}</p>
          <span className="text-[11px] text-slate-500 truncate block">
            {metrics.appointmentToday ? `Dr. ${metrics.appointmentToday.doctorName}` : 'All caught up'}
          </span>
        </div>
      </div>
    </div>
  );
}
