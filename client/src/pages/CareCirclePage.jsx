import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  KeyRound,
  UserPlus,
  Trash2,
  Clock,
  Activity,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { api } from '../api/client';
import { useProfile } from '../context/ProfileContext';
import { useElderlyMode } from '../context/ElderlyModeContext';

export function CareCirclePage() {
  const { activeProfile } = useProfile();
  const { elderlyMode } = useElderlyMode();

  const [circleData, setCircleData] = useState(null);
  const [activityData, setActivityData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const loadCircle = async () => {
    if (!activeProfile) return;
    try {
      setLoading(true);
      const [circleRes, actRes] = await Promise.all([
        api.getCareCircle(activeProfile.id),
        api.getActivityLogs(activeProfile.id, 25),
      ]);

      setCircleData(circleRes);
      setActivityData(actRes.activity || []);
    } catch (err) {
      console.error('Care circle load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCircle();
  }, [activeProfile]);

  const handleRevoke = async (accessId, memberName) => {
    if (!confirm(`Are you sure you want to revoke Care Circle access for ${memberName}? They will no longer be able to view or log medications for this profile.`)) {
      return;
    }

    try {
      await api.revokeCareCircleMember(activeProfile.id, accessId);
      await loadCircle();
    } catch (err) {
      alert(`Revoke failed: ${err.message}`);
    }
  };

  const handleTogglePermission = async (member, field, currentVal) => {
    if (member.isOwner) return;
    try {
      await api.updateCareCircleMember(activeProfile.id, member.accessId, {
        [field]: !currentVal,
      });
      await loadCircle();
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    }
  };

  const copyInvite = () => {
    if (!activeProfile) return;
    const text = `Join ${activeProfile.displayName}'s Care Circle on ElderCare Connect:\nProfile ID: ${activeProfile.profileId}\nWebsite: ${window.location.origin}/join-profile`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (loading || !circleData) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="h-10 bg-slate-200 rounded-xl w-1/4 animate-pulse"></div>
        <div className="h-64 bg-slate-200 rounded-3xl animate-pulse"></div>
      </div>
    );
  }

  const { members, isCallerOwner } = circleData;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
            <Users className="w-4 h-4 text-emerald-600" />
            <span>Care Circle Network</span>
          </div>
          <h1 className={`font-black text-slate-900 mt-1 ${elderlyMode ? 'text-3xl' : 'text-2xl'}`}>
            Care Circle Collaboration
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Authorized family members, nurses, and caregivers supporting {activeProfile?.displayName}.
          </p>
        </div>

        <button
          onClick={copyInvite}
          className="flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow transition-transform active:scale-95"
        >
          {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? 'Invite Details Copied!' : 'Copy Circle Invite Info'}</span>
        </button>
      </div>

      {/* Invite Info Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-950">
        <div>
          <span className="font-bold">Share Profile ID: </span>
          <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-emerald-300 text-emerald-900 ml-1">
            {activeProfile?.profileId}
          </span>
          <span className="ml-2 text-emerald-800">
            Family and nurses can click "Join with Profile Passcode" on the portal and enter the patient's passcode.
          </span>
        </div>
        <span className="text-emerald-700 font-medium">Passcode can be viewed in Settings.</span>
      </div>

      {/* Circle Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map((member) => {
          const isRevoked = member.status === 'revoked';

          return (
            <div
              key={member.accessId}
              className={`bg-white rounded-3xl p-6 border transition-all shadow-soft flex flex-col justify-between ${
                isRevoked ? 'opacity-60 border-slate-200 bg-slate-50' : 'border-slate-200 hover:border-emerald-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 border border-emerald-300 text-emerald-800 font-black text-base flex items-center justify-center shadow-xs">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{member.name}</h3>
                      <div className="text-xs text-slate-500 font-medium">
                        {member.relationship} • <span className="capitalize">{member.role}</span>
                      </div>
                    </div>
                  </div>

                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full capitalize ${
                    member.isOwner ? 'bg-purple-100 text-purple-800'
                    : isRevoked ? 'bg-rose-100 text-rose-800'
                    : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {member.isOwner ? 'Owner' : member.status}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                  <div><strong>Email:</strong> {member.email}</div>
                  {member.phone && <div><strong>Phone:</strong> {member.phone}</div>}
                  <div className="text-slate-400 text-[11px]">
                    Joined: {new Date(member.joinedAt).toLocaleDateString()}
                  </div>
                </div>

                {/* Granular Permissions (Interactive toggles for profile owner) */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Permissions:
                  </span>
                  <div className="space-y-1.5 text-xs text-slate-700">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={!isCallerOwner || member.isOwner || isRevoked}
                        checked={member.canRecordMeds}
                        onChange={() => handleTogglePermission(member, 'canRecordMeds', member.canRecordMeds)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Can mark medications taken</span>
                    </label>

                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={!isCallerOwner || member.isOwner || isRevoked}
                        checked={member.canEditSchedule}
                        onChange={() => handleTogglePermission(member, 'canEditSchedule', member.canEditSchedule)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Can edit schedules & meds</span>
                    </label>

                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={!isCallerOwner || member.isOwner || isRevoked}
                        checked={member.canReceiveAlerts}
                        onChange={() => handleTogglePermission(member, 'canReceiveAlerts', member.canReceiveAlerts)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Receives missed-dose alerts</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Revoke Button (Owner only, not on owner self) */}
              {isCallerOwner && !member.isOwner && !isRevoked && (
                <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => handleRevoke(member.accessId, member.name)}
                    className="flex items-center space-x-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Revoke Access</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Shared Activity Feed (Audit Trail) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-soft space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              <span>Care Circle Audit & Activity Trail</span>
            </h3>
            <p className="text-xs text-slate-500">
              Verifiable log of which authorized member made changes or logged medication doses.
            </p>
          </div>
        </div>

        {activityData.length === 0 ? (
          <p className="text-sm text-slate-500 italic py-4">No recent activity logs.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {activityData.map((act) => (
              <div key={act.id} className="py-3 flex items-start justify-between text-xs gap-4">
                <div className="space-y-0.5">
                  <p className="text-slate-900 font-medium text-sm leading-relaxed">
                    {act.details}
                  </p>
                  <div className="flex items-center space-x-2 text-slate-500">
                    <span className="font-semibold text-emerald-800">{act.actorName}</span>
                    <span>•</span>
                    <span className="capitalize bg-slate-100 px-1.5 py-0.2 rounded font-mono">{act.actorRole}</span>
                    <span>•</span>
                    <span>Action: {act.action}</span>
                  </div>
                </div>

                <span className="text-[11px] text-slate-400 whitespace-nowrap font-mono flex-shrink-0">
                  {new Date(act.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
