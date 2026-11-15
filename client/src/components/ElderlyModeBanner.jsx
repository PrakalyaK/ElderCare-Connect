import React from 'react';
import { Sparkles, Volume2, ShieldAlert, CheckCircle2, Mic } from 'lucide-react';
import { useElderlyMode } from '../context/ElderlyModeContext';

export function ElderlyModeBanner({ onOpenVoiceAssistant, onReadSummary, onEmergencyClick }) {
  const { elderlyMode } = useElderlyMode();

  if (!elderlyMode) return null;

  return (
    <div className="bg-emerald-700 text-white rounded-2xl p-5 mb-6 shadow-md border-2 border-emerald-800">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-100 font-bold uppercase tracking-wider text-xs">
            <Sparkles className="w-4 h-4 text-emerald-300" />
            <span>Elderly Assisted Mode Active</span>
          </div>
          <h2 className="text-2xl font-extrabold mt-1 text-white">
            Welcome to your simple, large-button care portal
          </h2>
          <p className="text-emerald-100 text-base mt-1">
            Tap any large button below or use your voice to get assistance anytime.
          </p>
        </div>

        {/* Action Quick Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onOpenVoiceAssistant}
            className="flex items-center space-x-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold px-4 py-3 rounded-xl shadow text-base transition-transform active:scale-95"
          >
            <Mic className="w-5 h-5 text-slate-900" />
            <span>Speak with Voice</span>
          </button>

          {onReadSummary && (
            <button
              onClick={onReadSummary}
              className="flex items-center space-x-2 bg-white hover:bg-emerald-50 text-emerald-900 font-bold px-4 py-3 rounded-xl shadow text-base transition-transform active:scale-95"
            >
              <Volume2 className="w-5 h-5 text-emerald-700" />
              <span>Listen to Summary</span>
            </button>
          )}

          <button
            onClick={onEmergencyClick}
            className="flex items-center space-x-2 bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-3 rounded-xl shadow text-base transition-transform active:scale-95"
          >
            <ShieldAlert className="w-5 h-5" />
            <span>Emergency Contacts</span>
          </button>
        </div>
      </div>
    </div>
  );
}
