import React, { useState, useEffect } from 'react';
import {
  Pill,
  Plus,
  Edit2,
  Trash2,
  Clock,
  Utensils,
  AlertTriangle,
  Package,
  Calendar,
  X,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { api } from '../api/client';
import { useProfile } from '../context/ProfileContext';
import { useElderlyMode } from '../context/ElderlyModeContext';

export function MedicationsPage() {
  const { activeProfile } = useProfile();
  const { elderlyMode } = useElderlyMode();

  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('Once Daily');
  const [instructions, setInstructions] = useState('');
  const [foodRelation, setFoodRelation] = useState('with_food');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [colorTag, setColorTag] = useState('emerald');
  const [shape, setShape] = useState('tablet');
  const [timeOfDay, setTimeOfDay] = useState('08:00');
  const [initialQuantity, setInitialQuantity] = useState('30');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [expiryDate, setExpiryDate] = useState('2027-12-31');
  const [submitting, setSubmitting] = useState(false);

  const loadMeds = async () => {
    if (!activeProfile) return;
    try {
      setLoading(true);
      const res = await api.getMedications(activeProfile.id);
      setMedications(res.medications || []);
    } catch (err) {
      console.error('Failed to load medications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeds();
  }, [activeProfile]);

  const openAddModal = () => {
    setEditingMed(null);
    setName('');
    setDosage('');
    setFrequency('Once Daily');
    setInstructions('');
    setFoodRelation('with_food');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setColorTag('emerald');
    setShape('tablet');
    setTimeOfDay('08:00');
    setInitialQuantity('30');
    setLowStockThreshold('5');
    setExpiryDate('2027-12-31');
    setModalOpen(true);
  };

  const openEditModal = (med) => {
    setEditingMed(med);
    setName(med.name);
    setDosage(med.dosage);
    setFrequency(med.frequency);
    setInstructions(med.instructions || '');
    setFoodRelation(med.foodRelation || 'with_food');
    setStartDate(med.startDate);
    setEndDate(med.endDate || '');
    setColorTag(med.colorTag || 'emerald');
    setShape(med.shape || 'tablet');
    setTimeOfDay(med.schedules?.[0]?.timeOfDay || '08:00');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!activeProfile) return;
    setSubmitting(true);

    try {
      if (editingMed) {
        await api.updateMedication(activeProfile.id, editingMed.id, {
          name,
          dosage,
          frequency,
          instructions,
          foodRelation,
          startDate,
          endDate: endDate || null,
          colorTag,
          shape,
          schedules: [{ timeOfDay, label: 'Dose' }],
        });
      } else {
        await api.addMedication(activeProfile.id, {
          name,
          dosage,
          frequency,
          instructions,
          foodRelation,
          startDate,
          endDate: endDate || null,
          colorTag,
          shape,
          schedules: [{ timeOfDay, label: 'Daily Dose' }],
          initialQuantity,
          lowStockThreshold,
          expiryDate: expiryDate || null,
          unit: shape === 'liquid' ? 'ml' : shape === 'drops' ? 'bottles' : 'tablets',
        });
      }

      setModalOpen(false);
      await loadMeds();
    } catch (err) {
      alert(`Save error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (medId) => {
    if (!confirm('Are you sure you want to remove this medication and its daily schedule?')) return;
    try {
      await api.deleteMedication(activeProfile.id, medId);
      await loadMeds();
    } catch (err) {
      alert(`Delete error: ${err.message}`);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`font-black text-slate-900 ${elderlyMode ? 'text-3xl' : 'text-2xl'}`}>
            Medication Management
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Configure prescriptions, daily scheduled times, and inventory tracking for {activeProfile?.displayName}.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className={`flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow transition-transform active:scale-95 ${
            elderlyMode ? 'text-lg py-3.5 px-6' : 'text-sm py-2.5 px-4'
          }`}
        >
          <Plus className="w-5 h-5" />
          <span>Add New Medicine</span>
        </button>
      </div>

      {/* Medication List Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-56 bg-slate-200 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : medications.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-soft max-w-lg mx-auto">
          <Pill className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900">No medications added yet</h3>
          <p className="text-slate-500 text-sm mt-1">
            Add prescriptions and vitamins so ElderCare Connect can generate daily routine timelines.
          </p>
          <button
            onClick={openAddModal}
            className="mt-6 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm"
          >
            + Add First Medication
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {medications.map(med => {
            const schedList = med.schedules || [];
            const inv = med.inventory;
            const isLowStock = inv && inv.currentQuantity <= inv.lowStockThreshold;

            return (
              <div
                key={med.id}
                className="bg-white border border-slate-200 rounded-3xl p-5 shadow-soft hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                        {med.dosage} • {med.frequency}
                      </span>
                      <h3 className={`font-black text-slate-900 mt-1 ${elderlyMode ? 'text-2xl' : 'text-lg'}`}>
                        {med.name}
                      </h3>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => openEditModal(med)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100 transition-colors"
                        title="Edit medicine"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(med.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                        title="Delete medicine"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Scheduled Times */}
                  <div className="mt-4 space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Scheduled Timings:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {schedList.map(s => (
                        <span key={s.id} className="inline-flex items-center space-x-1 text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-lg">
                          <Clock className="w-3 h-3 text-emerald-600" />
                          <span>{s.timeOfDay}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Instructions */}
                  {med.instructions && (
                    <p className="mt-3 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                      "{med.instructions}"
                    </p>
                  )}
                </div>

                {/* Bottom Inventory / Status */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1 text-slate-500 font-medium">
                    <Package className="w-3.5 h-3.5" />
                    <span>
                      Stock: <strong>{inv?.currentQuantity ?? 'N/A'}</strong> {inv?.unit || 'tablets'}
                    </span>
                  </div>

                  {isLowStock && (
                    <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Low Stock</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-xl font-bold text-slate-900">
                {editingMed ? 'Edit Medication' : 'Add New Prescription / Medication'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Medicine Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Lisinopril"
                    className="block w-full px-3.5 py-2 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Dosage *
                  </label>
                  <input
                    type="text"
                    required
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    placeholder="e.g. 10 mg or 1 tablet"
                    className="block w-full px-3.5 py-2 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Frequency *
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-medium"
                  >
                    <option value="Once Daily">Once Daily</option>
                    <option value="Twice Daily">Twice Daily</option>
                    <option value="Three Times Daily">Three Times Daily</option>
                    <option value="Every 8 Hours">Every 8 Hours</option>
                    <option value="As Needed (PRN)">As Needed (PRN)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Scheduled Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={timeOfDay}
                    onChange={(e) => setTimeOfDay(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Food Relationship
                  </label>
                  <select
                    value={foodRelation}
                    onChange={(e) => setFoodRelation(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-medium"
                  >
                    <option value="with_food">Take with meal / food</option>
                    <option value="before_food">Take before meal (empty stomach)</option>
                    <option value="after_food">Take after meal</option>
                    <option value="independent">Can take anytime</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Doctor's Instructions
                </label>
                <textarea
                  rows={2}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Take with a full glass of water. Do not crush."
                  className="block w-full px-3.5 py-2 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-medium"
                />
              </div>

              {!editingMed && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Initial Inventory & Expiry
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Quantity</label>
                      <input
                        type="number"
                        min={1}
                        value={initialQuantity}
                        onChange={(e) => setInitialQuantity(e.target.value)}
                        className="block w-full px-3 py-1.5 border border-slate-300 rounded-xl text-slate-900 text-sm font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Low-Stock Alert Level</label>
                      <input
                        type="number"
                        min={1}
                        value={lowStockThreshold}
                        onChange={(e) => setLowStockThreshold(e.target.value)}
                        className="block w-full px-3 py-1.5 border border-slate-300 rounded-xl text-slate-900 text-sm font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Expiry Date</label>
                      <input
                        type="date"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        className="block w-full px-3 py-1.5 border border-slate-300 rounded-xl text-slate-900 text-sm font-medium"
                      />
                    </div>
                  </div>
                </div>
              )}

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
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow transition-transform active:scale-95 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Medication'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
