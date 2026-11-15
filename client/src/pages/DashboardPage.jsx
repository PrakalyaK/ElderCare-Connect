import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Pill,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Users,
  Package,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Volume2,
  Check,
  ChevronRight,
} from 'lucide-react';
import { api } from '../api/client';
import { useProfile } from '../context/ProfileContext';
import { useElderlyMode } from '../context/ElderlyModeContext';
import { DailySummaryCard } from '../components/DailySummaryCard';
import { MedicationTimeline } from '../components/MedicationTimeline';
import { SafetyDisclaimer } from '../components/SafetyDisclaimer';
import { ElderlyModeBanner } from '../components/ElderlyModeBanner';

export function DashboardPage({ onOpenVoiceAssistant, onOpenEscalationSimulator }) {
  const { activeProfile, hasProfile, loading: profileLoading } = useProfile();
  const { elderlyMode } = useElderlyMode();
  const navigate = useNavigate();

  const [scheduleData, setScheduleData] = useState(null);
  const [adherenceData, setAdherenceData] = useState(null);
  const [appointmentsData, setAppointmentsData] = useState(null);
  const [inventoryData, setInventoryData] = useState(null);
  const [activityData, setActivityData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadDashboardData = async () => {
    if (!activeProfile) return;
    try {
      setLoading(true);
      const [schedRes, adhRes, apptRes, invRes, actRes] = await Promise.all([
        api.getTodaySchedule(activeProfile.id).catch(() => null),
        api.getAdherence(activeProfile.id).catch(() => null),
        api.getAppointments(activeProfile.id).catch(() => null),
        api.getInventory(activeProfile.id).catch(() => null),
        api.getActivityLogs(activeProfile.id, 6).catch(() => ({ activity: [] })),
      ]);

      setScheduleData(schedRes);
      setAdherenceData(adhRes);
      setAppointmentsData(apptRes);
      setInventoryData(invRes);
      setActivityData(actRes?.activity || []);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!profileLoading && !hasProfile) {
      navigate('/create-profile');
    } else if (activeProfile) {
      loadDashboardData();
    }
  }, [activeProfile, hasProfile, profileLoading, refreshKey]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleMarkNextDose = async (doseId) => {
    if (!activeProfile || !doseId) return;
    try {
      await api.markDoseTaken(activeProfile.id, doseId, 'Marked taken from Dashboard Spotlight');
      handleRefresh();
    } catch (err) {
      alert(`Error marking dose: ${err.message}`);
    }
  };

  if (profileLoading || loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="h-10 bg-slate-200 rounded-xl w-1/4 animate-pulse"></div>
        <div className="h-40 bg-slate-200 rounded-2xl animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-60 bg-slate-200 rounded-2xl animate-pulse"></div>
          <div className="h-60 bg-slate-200 rounded-2xl animate-pulse"></div>
          <div className="h-60 bg-slate-200 rounded-2xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!activeProfile) {
    return (
      <div className="p-12 text-center max-w-md mx-auto">
        <h2 className="text-xl font-bold text-slate-800">No active healthcare profile</h2>
        <p className="text-sm text-slate-500 mt-2">Create an elderly profile or join an existing one using an access passcode.</p>
        <div className="mt-6 flex flex-col gap-3">
          <Link to="/create-profile" className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold">
            Create Elderly Profile
          </Link>
          <Link to="/join-profile" className="px-4 py-2.5 border border-slate-300 rounded-xl font-semibold">
            Join with Passcode
          </Link>
        </div>
      </div>
    );
  }

  const nextUpcoming = scheduleData?.nextUpcoming;
  const todaySummary = scheduleData?.summary || { total: 0, taken: 0, pending: 0, missed: 0 };
  const adherencePct = adherenceData?.today?.adherencePercentage ?? 100;
  const nextAppt = appointmentsData?.nextAppointment;
  const lowStockItems = inventoryData?.inventory?.filter(i => i.isLowStock) || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Elderly Mode Header Banner */}
      <ElderlyModeBanner
        onOpenVoiceAssistant={onOpenVoiceAssistant}
        onEmergencyClick={() => navigate('/emergency')}
      />

      {/* Daily Care Summary Card with Speech Synthesis */}
      <DailySummaryCard refreshKey={refreshKey} />

      {/* Next Upcoming Dose Spotlight Banner (Most Important Action Directly Accessible) */}
      {nextUpcoming ? (
        <div className={`rounded-2xl border transition-all ${
          elderlyMode
            ? 'bg-amber-100 border-amber-300 p-6 sm:p-7 shadow-md'
            : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 p-5 sm:p-6 shadow-soft'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-amber-800">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Next Scheduled Medication Dose</span>
              </div>
              <h3 className={`font-black text-slate-900 ${elderlyMode ? 'text-3xl' : 'text-xl'}`}>
                {nextUpcoming.name} — {nextUpcoming.dosage}
              </h3>
              <p className="text-sm font-medium text-slate-700">
                Scheduled for <strong>{nextUpcoming.scheduledTime}</strong> • {nextUpcoming.foodRelation === 'with_food' ? 'Take with food/meal' : 'Routine dose'}
                {nextUpcoming.instructions ? ` • ${nextUpcoming.instructions}` : ''}
              </p>
            </div>

            <button
              onClick={() => handleMarkNextDose(nextUpcoming.id)}
              className={`flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow transition-transform active:scale-95 ${
                elderlyMode ? 'text-xl px-8 py-4 shadow-lg' : 'text-sm px-6 py-3'
              }`}
            >
              <CheckCircle2 className={elderlyMode ? 'w-6 h-6' : 'w-5 h-5'} />
              <span>Mark This Dose as Taken</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-emerald-800 font-medium text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>All scheduled medication doses for today have been completed!</span>
          </div>
          <Link to="/medications" className="text-xs font-bold text-emerald-700 hover:underline">
            View All Meds →
          </Link>
        </div>
      )}

      {/* Main Grid: Schedule Timeline & Dashboard Side Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Today's Schedule Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-soft">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100">
              <div>
                <h3 className={`font-bold text-slate-900 ${elderlyMode ? 'text-2xl font-black' : 'text-lg'}`}>
                  Today's Medication Routine
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {todaySummary.taken} of {todaySummary.total} completed • {todaySummary.pending} pending
                </p>
              </div>
              <Link
                to="/medications"
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center space-x-1"
              >
                <span>Manage Medicines</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <MedicationTimeline
              schedule={scheduleData?.schedule || []}
              profileId={activeProfile.id}
              onDoseUpdated={handleRefresh}
            />
          </div>

          {/* Safety Clinical Advisory */}
          <SafetyDisclaimer variant="medication" />
        </div>

        {/* Right Column (1 Col): Adherence, Appointments, Stock & Activity */}
        <div className="space-y-6">
          {/* Adherence Percentage Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Today's Adherence
              </span>
              <Link to="/adherence" className="text-xs font-semibold text-emerald-600 hover:underline">
                Analytics →
              </Link>
            </div>

            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-black text-slate-900">{adherencePct}%</span>
              <span className="text-xs text-slate-500 font-medium">
                ({todaySummary.taken}/{todaySummary.total} scheduled doses taken)
              </span>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-3 mt-3 overflow-hidden">
              <div
                className="bg-emerald-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${adherencePct}%` }}
              ></div>
            </div>

            {adherenceData?.weekly?.averageAdherence !== undefined && (
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-medium">
                <span>7-Day Average Adherence:</span>
                <span className="font-bold text-emerald-700">{adherenceData.weekly.averageAdherence}%</span>
              </div>
            )}
          </div>

          {/* Upcoming Doctor Appointment Widget */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-600" />
                <span>Next Doctor Visit</span>
              </span>
              <Link to="/appointments" className="text-xs font-semibold text-sky-600 hover:underline">
                Calendar →
              </Link>
            </div>

            {nextAppt ? (
              <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-3.5 space-y-1">
                <p className="font-bold text-slate-900 text-sm">
                  Dr. {nextAppt.doctorName}
                </p>
                <p className="text-xs text-sky-900 font-medium">
                  {nextAppt.specialization} • {nextAppt.hospitalClinic}
                </p>
                <div className="text-xs font-bold text-sky-700 pt-1 flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{nextAppt.appointmentDate} at {nextAppt.appointmentTime}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-2">
                No upcoming appointments scheduled.
              </p>
            )}
          </div>

          {/* Low Medicine Stock Alert */}
          {lowStockItems.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 shadow-soft">
              <div className="flex items-center space-x-2 text-rose-800 font-bold text-xs uppercase tracking-wider mb-2">
                <Package className="w-4 h-4 text-rose-600" />
                <span>Refill Required ({lowStockItems.length})</span>
              </div>
              <p className="text-xs text-rose-700 mb-3 font-medium">
                The following medicines have dropped below safe reserve threshold:
              </p>
              <div className="space-y-1.5">
                {lowStockItems.slice(0, 3).map(item => (
                  <div key={item.id} className="flex items-center justify-between text-xs bg-white/80 p-2 rounded-lg border border-rose-200">
                    <span className="font-bold text-slate-900">{item.medicationName}</span>
                    <span className="font-mono text-rose-700 font-bold">
                      {item.currentQuantity} {item.unit} left
                    </span>
                  </div>
                ))}
              </div>
              <Link
                to="/inventory"
                className="mt-3 block text-center py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs transition-colors"
              >
                Manage & Restock Inventory
              </Link>
            </div>
          )}

          {/* Recent Care Circle Activity Feed */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>Care Circle Activity</span>
              </span>
              <Link to="/care-circle" className="text-xs font-semibold text-emerald-600 hover:underline">
                View All →
              </Link>
            </div>

            {activityData.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">No activity recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {activityData.slice(0, 4).map(act => (
                  <div key={act.id} className="text-xs border-l-2 border-emerald-400 pl-2.5 py-0.5">
                    <p className="text-slate-800 font-medium leading-relaxed">{act.details}</p>
                    <span className="text-[10px] text-slate-400">
                      {new Date(act.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
