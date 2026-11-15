import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  ShieldAlert,
  Clock,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { api } from '../api/client';
import { useProfile } from '../context/ProfileContext';
import { useElderlyMode } from '../context/ElderlyModeContext';
import { SafetyDisclaimer } from '../components/SafetyDisclaimer';

export function AdherencePage() {
  const { activeProfile } = useProfile();
  const { elderlyMode } = useElderlyMode();

  const [adherenceData, setAdherenceData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!activeProfile) return;
    try {
      setLoading(true);
      const res = await api.getAdherence(activeProfile.id);
      setAdherenceData(res);
    } catch (err) {
      console.error('Failed to load adherence:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeProfile]);

  if (loading || !adherenceData) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="h-10 bg-slate-200 rounded-xl w-1/4 animate-pulse"></div>
        <div className="h-64 bg-slate-200 rounded-3xl animate-pulse"></div>
      </div>
    );
  }

  const { today, weekly, missedDoses, safetyAdvisory } = adherenceData;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <span>Smart Adherence Analytics</span>
        </div>
        <h1 className={`font-black text-slate-900 mt-1 ${elderlyMode ? 'text-3xl' : 'text-2xl'}`}>
          Medication Adherence & Reliability
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Caregiver and family visibility into routine adherence, confirmed intake, and missed dose trends.
        </p>
      </div>

      {/* Safety Notice */}
      <SafetyDisclaimer variant="medication" />

      {/* Key Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today Adherence */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-soft">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Today's Adherence
          </span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-3xl font-black text-emerald-700">{today.adherencePercentage}%</span>
            <span className="text-xs text-slate-500 font-medium">({today.taken}/{today.total} doses taken)</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-2.5 rounded-full"
              style={{ width: `${today.adherencePercentage}%` }}
            ></div>
          </div>
        </div>

        {/* 7-Day Average */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-soft">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            7-Day Weekly Average
          </span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-3xl font-black text-sky-700">{weekly.averageAdherence}%</span>
            <span className="text-xs text-slate-500 font-medium">({weekly.totalTaken}/{weekly.totalScheduled} total)</span>
          </div>
          <p className="text-xs text-slate-500 mt-3">Calculated over past 7 consecutive days.</p>
        </div>

        {/* Pending Today */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-soft">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Pending Doses Today
          </span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-3xl font-black text-amber-700">{today.pending}</span>
            <span className="text-xs text-slate-500 font-medium">remaining</span>
          </div>
          <p className="text-xs text-slate-500 mt-3">Scheduled for later today.</p>
        </div>

        {/* Missed This Week */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-soft">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Missed Doses (Past 7 Days)
          </span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-3xl font-black text-rose-700">{missedDoses.length}</span>
            <span className="text-xs text-slate-500 font-medium">unconfirmed</span>
          </div>
          <p className="text-xs text-slate-500 mt-3">Visible to authorized care circle.</p>
        </div>
      </div>

      {/* 7-Day Interactive Adherence Trend Chart (Recharts) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-soft">
        <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              7-Day Daily Adherence Trend
            </h3>
            <p className="text-xs text-slate-500">
              Daily percentage of confirmed doses taken vs scheduled.
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200">
            Goal: &gt; 85%
          </span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weekly.trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="adherenceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748b' }} unit="%" />
              <Tooltip
                formatter={(val) => [`${val}%`, 'Adherence Rate']}
                labelFormatter={(label) => `Day: ${label}`}
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}
              />
              <Area
                type="monotone"
                dataKey="adherenceRate"
                stroke="#10b981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#adherenceGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Missed Doses Caregiver Audit Table */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-soft">
        <div className="flex items-center space-x-2 text-rose-800 font-bold uppercase tracking-wider text-xs mb-1">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>Caregiver Visibility: Unconfirmed or Missed Doses</span>
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-4">
          Missed Doses Audit Feed
        </h3>

        {missedDoses.length === 0 ? (
          <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-2xl">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="font-semibold text-sm text-slate-800">No missed medication doses on record for the past 7 days!</p>
            <p className="text-xs text-slate-500 mt-0.5">Great adherence across all scheduled medications.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {missedDoses.map((dose) => (
              <div key={dose.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-900 text-sm">{dose.medicationName} ({dose.dosage})</div>
                  <div className="text-xs text-slate-500 font-mono">
                    Scheduled on {dose.date} at {dose.time}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                    Missed Dose
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    Tier {dose.escalationLevel} Escalated
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
