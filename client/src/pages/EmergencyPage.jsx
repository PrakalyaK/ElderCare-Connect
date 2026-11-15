import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Phone,
  AlertTriangle,
  Heart,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  FileText,
  Printer,
  X,
} from 'lucide-react';
import { api } from '../api/client';
import { useProfile } from '../context/ProfileContext';
import { useElderlyMode } from '../context/ElderlyModeContext';
import { SafetyDisclaimer } from '../components/SafetyDisclaimer';

export function EmergencyPage() {
  const { activeProfile } = useProfile();
  const { elderlyMode } = useElderlyMode();

  const [emergencyData, setEmergencyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [healthModalOpen, setHealthModalOpen] = useState(false);

  // Contact Form
  const [contactName, setContactName] = useState('');
  const [contactRelationship, setContactRelationship] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [canMakeMedicalDecisions, setCanMakeMedicalDecisions] = useState(false);

  // Health Profile Form
  const [allergiesText, setAllergiesText] = useState('');
  const [conditionsText, setConditionsText] = useState('');
  const [bloodType, setBloodType] = useState('O+');
  const [dnrStatus, setDnrStatus] = useState('No DNR on file');
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState('');
  const [preferredHospital, setPreferredHospital] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    if (!activeProfile) return;
    try {
      setLoading(true);
      const res = await api.getEmergencyDetails(activeProfile.id);
      setEmergencyData(res);

      if (res.healthDetails) {
        setAllergiesText((res.healthDetails.allergies || []).join(', '));
        setConditionsText((res.healthDetails.conditions || []).join(', '));
        setBloodType(res.bloodGroup || 'O+');
        setDnrStatus(res.healthDetails.dnrStatus || 'No DNR on file');
        setInsuranceProvider(res.healthDetails.insuranceProvider || '');
        setInsurancePolicyNumber(res.healthDetails.insurancePolicyNumber || '');
        setPreferredHospital(res.healthDetails.preferredHospital || '');
      }
    } catch (err) {
      console.error('Failed to load emergency data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeProfile]);

  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!activeProfile) return;
    setSubmitting(true);

    try {
      await api.addEmergencyContact(activeProfile.id, {
        name: contactName,
        relationship: contactRelationship,
        phone: contactPhone,
        secondaryPhone: secondaryPhone || null,
        isPrimary,
        canMakeMedicalDecisions,
      });

      setContactModalOpen(false);
      setContactName('');
      setContactRelationship('');
      setContactPhone('');
      setSecondaryPhone('');
      await loadData();
    } catch (err) {
      alert(`Error adding contact: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteContact = async (contactId) => {
    if (!confirm('Are you sure you want to delete this emergency contact?')) return;
    try {
      await api.deleteEmergencyContact(activeProfile.id, contactId);
      await loadData();
    } catch (err) {
      alert(`Delete error: ${err.message}`);
    }
  };

  const handleSaveHealthDetails = async (e) => {
    e.preventDefault();
    if (!activeProfile) return;
    setSubmitting(true);

    try {
      const parsedAllergies = allergiesText
        .split(',')
        .map(a => a.trim())
        .filter(a => a.length > 0);

      const parsedConditions = conditionsText
        .split(',')
        .map(c => c.trim())
        .filter(c => c.length > 0);

      await api.updateHealthDetails(activeProfile.id, {
        allergies: parsedAllergies,
        conditions: parsedConditions,
        bloodType,
        dnrStatus,
        insuranceProvider,
        insurancePolicyNumber,
        preferredHospital,
      });

      setHealthModalOpen(false);
      await loadData();
    } catch (err) {
      alert(`Error saving medical details: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading || !emergencyData) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="h-10 bg-slate-200 rounded-xl w-1/4 animate-pulse"></div>
        <div className="h-64 bg-slate-200 rounded-3xl animate-pulse"></div>
      </div>
    );
  }

  const { elderlyName, dateOfBirth, gender, bloodGroup, primaryPhysician, physicianPhone, healthDetails, contacts, activeMedications } = emergencyData;
  const primaryContact = contacts.find(c => c.isPrimary) || contacts[0];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* 911 Emergency Alert Notice */}
      <SafetyDisclaimer variant="emergency" />

      {/* Header & Quick Print */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-rose-700">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>Emergency Profile Sheet</span>
          </div>
          <h1 className={`font-black text-slate-900 mt-1 ${elderlyMode ? 'text-3xl' : 'text-2xl'}`}>
            Medical Emergency & Quick Contact
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Vital health parameters, allergies, emergency contacts, and active prescriptions for first responders.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs sm:text-sm shadow transition-colors"
        >
          <Printer className="w-4 h-4" />
          <span>Print Emergency Sheet</span>
        </button>
      </div>

      {/* 1-Click Dial Hero Card */}
      {primaryContact && (
        <div className="bg-gradient-to-r from-rose-500 via-rose-600 to-red-600 text-white rounded-3xl p-6 sm:p-8 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-200 bg-rose-700/60 px-2.5 py-0.5 rounded-full">
                Primary Emergency Contact
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
                {primaryContact.name} ({primaryContact.relationship})
              </h2>
              <p className="text-rose-100 text-sm">
                Authorized medical decision maker: {primaryContact.canMakeMedicalDecisions ? 'Yes' : 'Contact immediately'}
              </p>
            </div>

            <a
              href={`tel:${primaryContact.phone}`}
              className="inline-flex items-center justify-center space-x-3 bg-white text-rose-700 hover:bg-rose-50 font-black px-8 py-4 rounded-2xl shadow-xl text-lg transition-transform active:scale-95"
            >
              <Phone className="w-6 h-6 text-rose-600 animate-pulse" />
              <span>Call {primaryContact.phone}</span>
            </a>
          </div>
        </div>
      )}

      {/* Grid: Medical Details & Contacts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Health Parameters & Allergies */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-soft space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-lg flex items-center space-x-2">
              <Heart className="w-5 h-5 text-rose-600" />
              <span>Critical Health Information</span>
            </h3>
            <button
              onClick={() => setHealthModalOpen(true)}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center space-x-1"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Details</span>
            </button>
          </div>

          {/* Vitals Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Blood Group</span>
              <span className="text-xl font-black text-slate-900">{bloodGroup || 'Unknown'}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">DOB / Age</span>
              <span className="text-sm font-bold text-slate-900">{dateOfBirth || 'N/A'}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">DNR Directive</span>
              <span className="text-xs font-bold text-slate-900 truncate block">{healthDetails.dnrStatus || 'No DNR'}</span>
            </div>
          </div>

          {/* Allergies Highlight */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center space-x-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>Known Drug & Food Allergies:</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(healthDetails.allergies || []).length === 0 ? (
                <span className="text-xs text-slate-500 italic">No allergies recorded</span>
              ) : (
                healthDetails.allergies.map((allergy, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-rose-100 text-rose-900 border border-rose-300 rounded-xl text-xs font-bold shadow-2xs"
                  >
                    ⚠️ {allergy}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Chronic Conditions */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
              Existing Medical Conditions:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(healthDetails.conditions || []).length === 0 ? (
                <span className="text-xs text-slate-500 italic">None recorded</span>
              ) : (
                healthDetails.conditions.map((cond, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl text-xs font-semibold"
                  >
                    • {cond}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Physician & Hospital */}
          <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-700">
            <div><strong>Primary Physician:</strong> {primaryPhysician || 'None'} ({physicianPhone || 'No phone'})</div>
            <div><strong>Preferred Emergency Hospital:</strong> {healthDetails.preferredHospital || 'Nearest ER facility'}</div>
            <div><strong>Insurance / Medicare:</strong> {healthDetails.insuranceProvider || 'N/A'} ({healthDetails.insurancePolicyNumber || ''})</div>
          </div>
        </div>

        {/* Right: Emergency Contacts List */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-lg flex items-center space-x-2">
              <Phone className="w-5 h-5 text-emerald-600" />
              <span>Emergency Contacts ({contacts.length})</span>
            </h3>
            <button
              onClick={() => setContactModalOpen(true)}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Contact</span>
            </button>
          </div>

          <div className="space-y-3">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 text-sm">{contact.name}</span>
                    <span className="text-xs text-slate-500">({contact.relationship})</span>
                    {contact.isPrimary && (
                      <span className="text-[10px] font-bold px-2 py-0.2 bg-rose-100 text-rose-800 rounded-full">
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-mono font-bold text-slate-800 mt-1">
                    {contact.phone}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <a
                    href={`tel:${contact.phone}`}
                    className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors"
                    title="Call"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => handleDeleteContact(contact.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-slate-200 transition-colors"
                    title="Delete contact"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Medications List for Responders */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-soft space-y-4">
        <h3 className="font-bold text-slate-900 text-lg flex items-center space-x-2">
          <FileText className="w-5 h-5 text-sky-600" />
          <span>Current Active Prescription Medications List (For Paramedics & Doctors)</span>
        </h3>

        {activeMedications.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No active prescriptions listed.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {activeMedications.map((m, idx) => (
              <div key={idx} className="bg-sky-50/50 border border-sky-200 rounded-2xl p-3.5 space-y-1">
                <span className="font-bold text-slate-900 text-sm block">{m.name}</span>
                <span className="text-xs font-mono font-bold text-sky-800">{m.dosage} • {m.frequency}</span>
                {m.instructions && (
                  <p className="text-[11px] text-slate-500 italic mt-0.5">{m.instructions}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Emergency Contact Modal */}
      {contactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-xl font-bold text-slate-900">Add Emergency Contact</h3>
              <button
                onClick={() => setContactModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddContact} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="e.g. Sarah Vance"
                  className="block w-full px-3.5 py-2 border border-slate-300 rounded-xl text-slate-900 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Relationship *
                </label>
                <input
                  type="text"
                  required
                  value={contactRelationship}
                  onChange={(e) => setContactRelationship(e.target.value)}
                  placeholder="e.g. Daughter, Neighbor, Doctor"
                  className="block w-full px-3.5 py-2 border border-slate-300 rounded-xl text-slate-900 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Primary Phone *
                </label>
                <input
                  type="tel"
                  required
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="(555) 000-0000"
                  className="block w-full px-3.5 py-2 border border-slate-300 rounded-xl text-slate-900 text-sm font-semibold"
                />
              </div>

              <div className="space-y-2 pt-2">
                <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPrimary}
                    onChange={(e) => setIsPrimary(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>Mark as primary emergency contact</span>
                </label>

                <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canMakeMedicalDecisions}
                    onChange={(e) => setCanMakeMedicalDecisions(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>Has medical power of attorney / healthcare proxy</span>
                </label>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setContactModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow transition-transform active:scale-95 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Add Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Health Details Modal */}
      {healthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-xl font-bold text-slate-900">Edit Health & Emergency Info</h3>
              <button
                onClick={() => setHealthModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHealthDetails} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Allergies (comma-separated)
                </label>
                <input
                  type="text"
                  value={allergiesText}
                  onChange={(e) => setAllergiesText(e.target.value)}
                  placeholder="e.g. Penicillin, Peanuts, Sulfa"
                  className="block w-full px-3.5 py-2 border border-slate-300 rounded-xl text-slate-900 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Existing Medical Conditions (comma-separated)
                </label>
                <input
                  type="text"
                  value={conditionsText}
                  onChange={(e) => setConditionsText(e.target.value)}
                  placeholder="e.g. Type 2 Diabetes, Hypertension, Glaucoma"
                  className="block w-full px-3.5 py-2 border border-slate-300 rounded-xl text-slate-900 text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Blood Group
                  </label>
                  <select
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 text-sm font-medium"
                  >
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    DNR Directive
                  </label>
                  <input
                    type="text"
                    value={dnrStatus}
                    onChange={(e) => setDnrStatus(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Preferred Emergency Hospital / Facility
                </label>
                <input
                  type="text"
                  value={preferredHospital}
                  onChange={(e) => setPreferredHospital(e.target.value)}
                  placeholder="e.g. St. Jude Heart & Vascular Hospital ER"
                  className="block w-full px-3.5 py-2 border border-slate-300 rounded-xl text-slate-900 text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Insurance Provider
                  </label>
                  <input
                    type="text"
                    value={insuranceProvider}
                    onChange={(e) => setInsuranceProvider(e.target.value)}
                    placeholder="e.g. Blue Cross Senior"
                    className="block w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Policy #
                  </label>
                  <input
                    type="text"
                    value={insurancePolicyNumber}
                    onChange={(e) => setInsurancePolicyNumber(e.target.value)}
                    placeholder="e.g. BCS-992-8174"
                    className="block w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 text-sm font-medium"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setHealthModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow transition-transform active:scale-95 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Health Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
