import React, { useState, useEffect } from 'react';
import {
  History,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Calendar,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { api } from '../api/client';
import { useProfile } from '../context/ProfileContext';
import { useElderlyMode } from '../context/ElderlyModeContext';
import { SafetyDisclaimer } from '../components/SafetyDisclaimer';

export function MedicationHistoryPage() {
  const { activeProfile } = useProfile();
  const { elderlyMode } = useElderlyMode();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadHistory = async () => {
    if (!activeProfile) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await api.getMedicationHistory(activeProfile.id, queryString);
      setHistory(res.history || []);
    } catch (err) {
      console.error('History load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [activeProfile, statusFilter, startDate, endDate]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className={`font-black text-slate-900 ${elderlyMode ? 'text-3xl' : 'text-2xl'}`}>
          Medication Intake History
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Audited log of all confirmed, missed, and scheduled medication doses for {activeProfile?.displayName}.
        </p>
      </div>

      <SafetyDisclaimer variant="medication" />

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-soft flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Filter By:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Statuses</option>
            <option value="taken">Taken</option>
            <option value="missed">Missed</option>
            <option value="skipped">Skipped</option>
            <option value="pending">Pending</option>
          </select>

          <div className="flex items-center space-x-2 text-xs">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-xl font-medium text-slate-700"
              placeholder="From date"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-xl font-medium text-slate-700"
              placeholder="To date"
            />
          </div>
        </div>

        <button
          onClick={() => {
            setStatusFilter('');
            setStartDate('');
            setEndDate('');
          }}
          className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
        >
          Reset Filters
        </button>
      </div>

      {/* History Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-soft">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="h-12 bg-slate-100 rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-sm">No historical dose records found matching your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold uppercase text-slate-500 tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Scheduled Date & Time</th>
                  <th className="py-3.5 px-6">Medication</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Confirmed By / At</th>
                  <th className="py-3.5 px-6">Notes / Alert Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((item) => {
                  const isTaken = item.status === 'taken';
                  const isMissed = item.status === 'missed';
                  const isSkipped = item.status === 'skipped';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-6 font-mono text-xs font-semibold text-slate-700">
                        {item.scheduledDate} at {item.scheduledTime}
                      </td>

                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900">{item.name}</div>
                        <div className="text-xs text-slate-500 font-medium">{item.dosage}</div>
                      </td>

                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                          isTaken ? 'bg-emerald-100 text-emerald-800'
                          : isMissed ? 'bg-rose-100 text-rose-800'
                          : isSkipped ? 'bg-slate-200 text-slate-700'
                          : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isTaken ? <CheckCircle2 className="w-3.5 h-3.5" />
                            : isMissed ? <AlertTriangle className="w-3.5 h-3.5" />
                            : isSkipped ? <XCircle className="w-3.5 h-3.5" />
                            : <Clock className="w-3.5 h-3.5" />}
                          <span>{item.status}</span>
                        </span>
                      </td>

                      <td className="py-4 px-6 text-xs text-slate-600">
                        {isTaken ? (
                          <div>
                            <span className="font-semibold text-slate-800">{item.recordedByName || 'Patient'}</span>
                            <div className="text-[11px] text-slate-400">
                              {item.recordedAt ? new Date(item.recordedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : ''}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-xs">
                        {item.escalationLevel > 0 ? (
                          <span className="font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                            Escalation Tier {item.escalationLevel}
                          </span>
                        ) : (
                          <span className="text-slate-500">{item.notes || 'Normal routine'}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
