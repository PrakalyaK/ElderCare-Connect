import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Heart,
  Mic,
  Bell,
  AlertTriangle,
  User,
  LogOut,
  ChevronDown,
  Sparkles,
  Sliders,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { useElderlyMode } from '../context/ElderlyModeContext';

export function Navbar({ onOpenVoiceAssistant, onOpenEscalationSimulator }) {
  const { user, logout } = useAuth();
  const { profiles, activeProfile, switchProfile } = useProfile();
  const { elderlyMode, toggle: toggleElderlyMode } = useElderlyMode();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className={`bg-white border-b border-slate-200 sticky top-0 z-40 transition-all ${
      elderlyMode ? 'py-3 bg-emerald-50/50 border-emerald-200 shadow-sm' : 'py-2.5'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Left: Brand Logo */}
        <div className="flex items-center space-x-3">
          <Link to="/" className="flex items-center space-x-2.5 focus:outline-none">
            <div className={`rounded-xl flex items-center justify-center text-white shadow-md ${
              elderlyMode ? 'w-11 h-11 bg-emerald-700' : 'w-9 h-9 bg-emerald-600'
            }`}>
              <Heart className={elderlyMode ? 'w-6 h-6 fill-white' : 'w-5 h-5 fill-white'} />
            </div>
            <div>
              <span className={`font-bold tracking-tight text-slate-900 ${
                elderlyMode ? 'text-2xl text-emerald-950 font-extrabold' : 'text-xl'
              }`}>
                ElderCare<span className="text-emerald-600">Connect</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                Healthcare Ecosystem
              </span>
            </div>
          </Link>
        </div>

        {/* Center / Right: Profile Switcher & Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Active Profile Pill (If logged in & profile exists) */}
          {activeProfile && (
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                  elderlyMode
                    ? 'bg-white border-emerald-300 text-emerald-950 hover:bg-emerald-50 text-base py-2 px-4 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="font-semibold">{activeProfile.displayName}</span>
                <span className="text-xs bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                  {activeProfile.profileId}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {/* Profile dropdown */}
              {profileDropdownOpen && (
                <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Switch Care Profile
                  </div>
                  {profiles.map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        switchProfile(p);
                        setProfileDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-slate-50 ${
                        p.id === activeProfile.id ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'text-slate-700'
                      }`}
                    >
                      <div>
                        <div>{p.displayName}</div>
                        <div className="text-xs text-slate-400 font-mono">{p.profileId} • {p.relationship || 'Owner'}</div>
                      </div>
                      {p.id === activeProfile.id && <span className="text-emerald-600 text-xs font-bold">Active</span>}
                    </button>
                  ))}
                  <div className="border-t border-slate-100 mt-1 pt-1 px-2">
                    <Link
                      to="/join-profile"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="block px-2 py-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium hover:bg-emerald-50 rounded"
                    >
                      + Connect Another Profile with Passcode
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Voice Assistant Button (Differentiating Feature) */}
          <button
            onClick={onOpenVoiceAssistant}
            title="Voice-Assisted Elderly Mode (Speech Recognition & Audio Readout)"
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border font-medium transition-all ${
              elderlyMode
                ? 'bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200 text-base px-4 py-2 shadow'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 text-sm'
            }`}
          >
            <Mic className={`w-4 h-4 ${elderlyMode ? 'w-5 h-5 text-amber-700' : 'text-emerald-600'}`} />
            <span className="hidden sm:inline">Voice Assistant</span>
          </button>

          {/* Escalation Simulator (Hackathon Demo Tool) */}
          <button
            onClick={onOpenEscalationSimulator}
            title="Interactive Smart Missed-Dose Escalation Simulator"
            className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 text-sm font-medium transition-colors"
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>Escalation Simulator</span>
          </button>

          {/* Elderly Mode Toggle */}
          <button
            onClick={() => toggleElderlyMode()}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-sm font-semibold transition-all ${
              elderlyMode
                ? 'bg-emerald-700 border-emerald-800 text-white shadow-md text-base px-4 py-2'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
            title="Toggle Elderly-Friendly High Contrast & Large Text Mode"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">{elderlyMode ? 'Elderly Mode: ON' : 'Elderly Mode'}</span>
          </button>

          {/* Notifications Link */}
          {user && activeProfile && (
            <Link
              to="/notifications"
              className="p-2 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-slate-100 relative transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
            </Link>
          )}

          {/* User Menu */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center space-x-1.5 p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 border border-transparent hover:border-slate-200"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center font-bold text-xs uppercase">
                  {user.fullName?.charAt(0) || 'U'}
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-sm font-bold text-slate-900">{user.fullName}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    <span className="inline-block mt-1 text-[11px] font-semibold px-2 py-0.2 rounded bg-slate-100 text-slate-700 capitalize">
                      Role: {user.role}
                    </span>
                  </div>
                  <Link
                    to="/dashboard"
                    onClick={() => setUserDropdownOpen(false)}
                    className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 font-medium"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setUserDropdownOpen(false)}
                    className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 font-medium"
                  >
                    Settings & Passcodes
                  </Link>
                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 flex items-center space-x-2 font-medium"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                to="/login"
                className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
