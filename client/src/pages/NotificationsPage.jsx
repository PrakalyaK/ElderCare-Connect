import React, { useState, useEffect } from 'react';
import {
  Bell,
  Mail,
  Send,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  Check,
  Package,
  Calendar,
} from 'lucide-react';
import { api } from '../api/client';
import { useProfile } from '../context/ProfileContext';
import { useElderlyMode } from '../context/ElderlyModeContext';

export function NotificationsPage() {
  const { activeProfile } = useProfile();
  const { elderlyMode } = useElderlyMode();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState(null);

  const loadNotifications = async () => {
    if (!activeProfile) return;
    try {
      setLoading(true);
      const res = await api.getNotifications(activeProfile.id, unreadOnly);
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [activeProfile, unreadOnly]);

  const handleMarkRead = async (id) => {
    if (!activeProfile) return;
    try {
      await api.markNotificationRead(activeProfile.id, id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleSendTestEmail = async () => {
    if (!activeProfile) return;
    const targetEmail = prompt('Enter destination email address for live test notification:');
    if (!targetEmail) return;

    try {
      setTestEmailSending(true);
      const res = await api.sendTestEmail(activeProfile.id, targetEmail.trim());
      setTestEmailResult(res);
      await loadNotifications();
    } catch (err) {
      alert(`Test notification failed: ${err.message}`);
    } finally {
      setTestEmailSending(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
            <Bell className="w-4 h-4 text-emerald-600" />
            <span>Delivery & Audit Center</span>
          </div>
          <h1 className={`font-black text-slate-900 mt-1 ${elderlyMode ? 'text-3xl' : 'text-2xl'}`}>
            Notifications & Automated Reminders
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Real-time delivery log of Nodemailer email reminders, missed-dose escalation alerts, and appointment updates.
          </p>
        </div>

        <button
          onClick={handleSendTestEmail}
          disabled={testEmailSending}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow transition-transform active:scale-95 disabled:opacity-50"
        >
          <Mail className="w-4 h-4" />
          <span>{testEmailSending ? 'Sending Test...' : 'Test Live Nodemailer Delivery'}</span>
        </button>
      </div>

      {/* Test Email Result Banner (Showing Preview URL if Ethereal is active) */}
      {testEmailResult && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 animate-in fade-in flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 font-bold text-emerald-900 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Nodemailer Verification Successful!</span>
            </div>
            <p className="text-xs text-emerald-800">
              Notification dispatched to <strong>{testEmailResult.recipient}</strong> (Status: {testEmailResult.deliveryStatus}).
            </p>
          </div>

          {testEmailResult.previewUrl && (
            <a
              href={testEmailResult.previewUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 font-bold rounded-lg text-xs hover:bg-emerald-100 transition-colors shadow-2xs flex-shrink-0"
            >
              <span>View Ethereal Web Inbox</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}

      {/* Notification Types Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-soft flex items-center justify-between">
        <div className="flex items-center space-x-3 text-xs font-semibold">
          <span className="text-slate-500 font-bold uppercase tracking-wider">Status:</span>
          <button
            onClick={() => setUnreadOnly(false)}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              !unreadOnly ? 'bg-slate-900 text-white font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Logs ({notifications.length})
          </button>
          <button
            onClick={() => setUnreadOnly(true)}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              unreadOnly ? 'bg-slate-900 text-white font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Unread Only ({unreadCount})
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-soft divide-y divide-slate-100">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3].map(n => <div key={n} className="h-16 bg-slate-100 rounded-2xl animate-pulse"></div>)}
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-sm">No notifications found.</p>
          </div>
        ) : (
          notifications.map((item) => {
            const isEscalation = item.type === 'caregiver_escalation';
            const isMissed = item.type === 'missed_medication';
            const isReminder = item.type === 'medication_reminder';
            const isAppt = item.type === 'appointment_reminder';
            const isInventory = item.type === 'inventory_alert';

            const previewUrl = item.metadata?.previewUrl;

            return (
              <div
                key={item.id}
                className={`p-5 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  !item.isRead ? 'bg-emerald-50/20' : 'hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-start space-x-3.5">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xs ${
                    isEscalation ? 'bg-rose-100 text-rose-700'
                    : isMissed ? 'bg-amber-100 text-amber-700'
                    : isAppt ? 'bg-sky-100 text-sky-700'
                    : isInventory ? 'bg-orange-100 text-orange-700'
                    : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {isEscalation ? <AlertTriangle className="w-5 h-5" />
                      : isMissed ? <Clock className="w-5 h-5" />
                      : isAppt ? <Calendar className="w-5 h-5" />
                      : isInventory ? <Package className="w-5 h-5" />
                      : <Bell className="w-5 h-5" />}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                      {!item.isRead && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">{item.message}</p>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 font-medium">
                      <span>To: <strong>{item.recipientEmail}</strong></span>
                      <span>•</span>
                      <span className="capitalize">Channel: {item.deliveryChannel}</span>
                      <span>•</span>
                      <span>Status: <strong className="text-emerald-700 uppercase">{item.status}</strong></span>
                      <span>•</span>
                      <span>{new Date(item.sentAt || item.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0 self-end sm:self-center">
                  {previewUrl && (
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 flex items-center space-x-1"
                      title="Open Ethereal email preview"
                    >
                      <span>Email Preview</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}

                  {!item.isRead && (
                    <button
                      onClick={() => handleMarkRead(item.id)}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
