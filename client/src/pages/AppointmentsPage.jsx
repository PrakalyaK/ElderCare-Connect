import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Clock,
  MapPin,
  Send,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Sparkles,
} from 'lucide-react';
import { api } from '../api/client';
import { useProfile } from '../context/ProfileContext';
import { useElderlyMode } from '../context/ElderlyModeContext';

export function AppointmentsPage() {
  const { activeProfile } = useProfile();
  const { elderlyMode } = useElderlyMode();

  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAppt, setEditingAppt] = useState(null);

  // Form State
  const [doctorName, setDoctorName] = useState('');
  const [specialization, setSpecialization] = useState('Cardiology');
  const [hospitalClinic, setHospitalClinic] = useState('');
  const [location, setLocation] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('10:00');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reminderSendingId, setReminderSendingId] = useState(null);

  const loadAppointments = async () => {
    if (!activeProfile) return;
    try {
      setLoading(true);
      const res = await api.getAppointments(activeProfile.id);
      setUpcoming(res.upcoming || []);
      setPast(res.past || []);
    } catch (err) {
      console.error('Failed to load appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, [activeProfile]);

  const openAddModal = () => {
    setEditingAppt(null);
    setDoctorName('');
    setSpecialization('Cardiology');
    setHospitalClinic('');
    setLocation('');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    setAppointmentDate(tomorrow.toISOString().split('T')[0]);
    setAppointmentTime('10:00');
    setNotes('');
    setModalOpen(true);
  };

  const openEditModal = (appt) => {
    setEditingAppt(appt);
    setDoctorName(appt.doctorName);
    setSpecialization(appt.specialization);
    setHospitalClinic(appt.hospitalClinic);
    setLocation(appt.location || '');
    setAppointmentDate(appt.appointmentDate);
    setAppointmentTime(appt.appointmentTime);
    setNotes(appt.notes || '');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!activeProfile) return;
    setSubmitting(true);

    try {
      if (editingAppt) {
        await api.updateAppointment(activeProfile.id, editingAppt.id, {
          doctorName,
          specialization,
          hospitalClinic,
          location,
          appointmentDate,
          appointmentTime,
          notes,
        });
      } else {
        await api.addAppointment(activeProfile.id, {
          doctorName,
          specialization,
          hospitalClinic,
          location,
          appointmentDate,
          appointmentTime,
          notes,
        });
      }

      setModalOpen(false);
      await loadAppointments();
    } catch (err) {
      alert(`Error saving appointment: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (apptId) => {
    if (!confirm('Are you sure you want to cancel and remove this appointment?')) return;
    try {
      await api.deleteAppointment(activeProfile.id, apptId);
      await loadAppointments();
    } catch (err) {
      alert(`Delete error: ${err.message}`);
    }
  };

  const handleSendReminder = async (apptId) => {
    try {
      setReminderSendingId(apptId);
      const res = await api.sendAppointmentReminder(activeProfile.id, apptId);
      alert(`Appointment reminder dispatched! Delivery status: ${res.deliveryStatus}`);
      await loadAppointments();
    } catch (err) {
      alert(`Failed to send reminder: ${err.message}`);
    } finally {
      setReminderSendingId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`font-black text-slate-900 ${elderlyMode ? 'text-3xl' : 'text-2xl'}`}>
            Doctor Appointments
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Coordinate healthcare visits, specialists, and appointment notifications for {activeProfile?.displayName}.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className={`flex items-center justify-center space-x-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow transition-transform active:scale-95 ${
            elderlyMode ? 'text-lg py-3.5 px-6' : 'text-sm py-2.5 px-4'
          }`}
        >
          <Plus className="w-5 h-5" />
          <span>Schedule New Appointment</span>
        </button>
      </div>

      {/* Upcoming Appointments Section */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-sky-600" />
          <span>Upcoming Appointments ({upcoming.length})</span>
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-44 bg-slate-200 rounded-3xl animate-pulse"></div>
            <div className="h-44 bg-slate-200 rounded-3xl animate-pulse"></div>
          </div>
        ) : upcoming.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 shadow-soft">
            <p className="text-slate-500 text-sm">No upcoming appointments scheduled.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcoming.map((appt) => (
              <div
                key={appt.id}
                className="bg-white border border-slate-200 rounded-3xl p-6 shadow-soft hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                        {appt.specialization}
                      </span>
                      <h3 className={`font-black text-slate-900 mt-2 ${elderlyMode ? 'text-2xl' : 'text-lg'}`}>
                        Dr. {appt.doctorName}
                      </h3>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => openEditModal(appt)}
                        className="p-1.5 text-slate-400 hover:text-sky-600 rounded-lg hover:bg-slate-100"
                        title="Edit appointment"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(appt.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100"
                        title="Cancel appointment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5 text-sm text-slate-700">
                    <div className="flex items-center space-x-2 font-bold text-slate-900">
                      <Clock className="w-4 h-4 text-sky-600" />
                      <span>{appt.appointmentDate} at {appt.appointmentTime}</span>
                    </div>

                    <div className="flex items-center space-x-2 text-xs text-slate-600">
                      <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span>{appt.hospitalClinic} {appt.location ? `(${appt.location})` : ''}</span>
                    </div>

                    {appt.notes && (
                      <p className="text-xs text-slate-500 italic pt-1 bg-slate-50 p-2 rounded-xl border border-slate-100">
                        Notes: {appt.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className={`text-xs font-semibold ${appt.reminderSent ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {appt.reminderSent ? '✓ Reminder Sent' : 'Pending reminder'}
                  </span>

                  <button
                    onClick={() => handleSendReminder(appt.id)}
                    disabled={reminderSendingId === appt.id}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{reminderSendingId === appt.id ? 'Sending...' : 'Send Reminder Email'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past Appointments History */}
      {past.length > 0 && (
        <div className="pt-6 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Past Appointment History ({past.length})
          </h2>
          <div className="bg-white border border-slate-200 rounded-3xl divide-y divide-slate-100 overflow-hidden shadow-soft">
            {past.map(appt => (
              <div key={appt.id} className="p-4 flex items-center justify-between text-sm">
                <div>
                  <span className="font-bold text-slate-900">Dr. {appt.doctorName}</span>
                  <span className="text-xs text-slate-500 ml-2 font-mono">({appt.appointmentDate})</span>
                  <div className="text-xs text-slate-500">{appt.specialization} • {appt.hospitalClinic}</div>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full capitalize">
                  {appt.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Appointment Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-xl font-bold text-slate-900">
                {editingAppt ? 'Edit Appointment' : 'Schedule Doctor Appointment'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Doctor Name *
                </label>
                <input
                  type="text"
                  required
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="e.g. Robert Smith"
                  className="block w-full px-3.5 py-2 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 sm:text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Specialization *
                  </label>
                  <input
                    type="text"
                    required
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    placeholder="e.g. Cardiology, Optometry"
                    className="block w-full px-3.5 py-2 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 sm:text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Hospital / Clinic *
                  </label>
                  <input
                    type="text"
                    required
                    value={hospitalClinic}
                    onChange={(e) => setHospitalClinic(e.target.value)}
                    placeholder="e.g. St. Jude Pavilion"
                    className="block w-full px-3.5 py-2 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 sm:text-sm font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 sm:text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={appointmentTime}
                    onChange={(e) => setAppointmentTime(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Location / Suite (Optional)
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Suite 402, North Tower"
                  className="block w-full px-3.5 py-2 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 sm:text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Preparation Notes / Checklist
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Bring recent blood pressure log and insurance card."
                  className="block w-full px-3.5 py-2 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 sm:text-sm font-medium"
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-bold shadow transition-transform active:scale-95 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
