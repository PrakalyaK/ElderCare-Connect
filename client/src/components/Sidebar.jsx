import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Pill,
  History,
  TrendingUp,
  Calendar,
  Package,
  Users,
  ShieldAlert,
  Bell,
  Settings,
  PlusCircle,
  KeyRound,
} from 'lucide-react';
import { useElderlyMode } from '../context/ElderlyModeContext';
import { useProfile } from '../context/ProfileContext';

export function Sidebar() {
  const { elderlyMode } = useElderlyMode();
  const { activeProfile } = useProfile();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/medications', label: 'Medications Routine', icon: Pill },
    { to: '/history', label: 'Medication History', icon: History },
    { to: '/adherence', label: 'Smart Adherence', icon: TrendingUp },
    { to: '/appointments', label: 'Doctor Appointments', icon: Calendar },
    { to: '/inventory', label: 'Medicine Inventory', icon: Package },
    { to: '/care-circle', label: 'Care Circle', icon: Users },
    { to: '/emergency', label: 'Emergency Info', icon: ShieldAlert, highlight: true },
    { to: '/notifications', label: 'Notifications Log', icon: Bell },
    { to: '/settings', label: 'Access & Passcodes', icon: Settings },
  ];

  return (
    <aside className={`w-64 flex-shrink-0 bg-white border-r border-slate-200 min-h-[calc(100vh-65px)] flex flex-col justify-between p-4 ${
      elderlyMode ? 'w-72 bg-emerald-50/20' : ''
    }`}>
      <div className="space-y-6">
        {/* Active Profile Info Banner in Sidebar */}
        {activeProfile && (
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-3.5 shadow-soft">
            <div className="text-xs uppercase font-bold text-emerald-800 tracking-wider">Active Patient</div>
            <div className="text-base font-bold text-slate-900 truncate mt-0.5">{activeProfile.displayName}</div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
              <span className="font-mono bg-white border border-emerald-300 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                {activeProfile.profileId}
              </span>
              <span className="font-medium text-emerald-700 capitalize">{activeProfile.relationship || 'Owner'}</span>
            </div>
          </div>
        )}

        {/* Navigation list */}
        <nav className="space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-medium transition-all ${
                    elderlyMode ? 'text-lg py-3' : 'text-sm'
                  } ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                      : item.highlight
                      ? 'text-rose-700 hover:bg-rose-50 hover:text-rose-800'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`
                }
              >
                <Icon className={`${elderlyMode ? 'w-6 h-6' : 'w-5 h-5'} flex-shrink-0`} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile Links */}
      <div className="pt-4 border-t border-slate-100 space-y-2">
        <NavLink
          to="/create-profile"
          className="flex items-center space-x-2 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 p-2 rounded-lg transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create New Elderly Profile</span>
        </NavLink>
        <NavLink
          to="/join-profile"
          className="flex items-center space-x-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 p-2 rounded-lg transition-colors"
        >
          <KeyRound className="w-4 h-4" />
          <span>Join with Profile Passcode</span>
        </NavLink>
      </div>
    </aside>
  );
}
