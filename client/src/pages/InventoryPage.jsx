import React, { useState, useEffect } from 'react';
import {
  Package,
  AlertTriangle,
  Calendar,
  Plus,
  RefreshCw,
  CheckCircle2,
  X,
  Sparkles,
} from 'lucide-react';
import { api } from '../api/client';
import { useProfile } from '../context/ProfileContext';
import { useElderlyMode } from '../context/ElderlyModeContext';

export function InventoryPage() {
  const { activeProfile } = useProfile();
  const { elderlyMode } = useElderlyMode();

  const [inventory, setInventory] = useState([]);
  const [summary, setSummary] = useState({ totalItems: 0, lowStockCount: 0, expiringSoonCount: 0 });
  const [loading, setLoading] = useState(true);
  const [restockModalItem, setRestockModalItem] = useState(null);
  const [quantityToAdd, setQuantityToAdd] = useState('30');
  const [newExpiry, setNewExpiry] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadInventory = async () => {
    if (!activeProfile) return;
    try {
      setLoading(true);
      const res = await api.getInventory(activeProfile.id);
      setInventory(res.inventory || []);
      setSummary(res.summary || { totalItems: 0, lowStockCount: 0, expiringSoonCount: 0 });
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, [activeProfile]);

  const openRestock = (item) => {
    setRestockModalItem(item);
    setQuantityToAdd('30');
    setNewExpiry(item.expiryDate || '');
  };

  const handleRestock = async (e) => {
    e.preventDefault();
    if (!activeProfile || !restockModalItem) return;
    setSubmitting(true);

    try {
      await api.restockInventory(activeProfile.id, restockModalItem.id, {
        quantityToAdd,
        newExpiryDate: newExpiry || undefined,
      });

      setRestockModalItem(null);
      await loadInventory();
    } catch (err) {
      alert(`Restock failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className={`font-black text-slate-900 ${elderlyMode ? 'text-3xl' : 'text-2xl'}`}>
          Medicine Inventory & Supply
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Automatic stock tracking, reserve thresholds, and replenishment warnings for {activeProfile?.displayName}.
        </p>
      </div>

      {/* Snapshot Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-soft">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Total Tracked Medicines
          </span>
          <div className="text-3xl font-black text-slate-900 mt-1">{summary.totalItems}</div>
          <span className="text-xs text-slate-500">active inventory records</span>
        </div>

        <div className={`border rounded-2xl p-5 shadow-soft ${
          summary.lowStockCount > 0 ? 'bg-rose-50 border-rose-200 text-rose-950' : 'bg-white border-slate-200'
        }`}>
          <span className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center space-x-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock Alerts</span>
          </span>
          <div className="text-3xl font-black text-rose-700 mt-1">{summary.lowStockCount}</div>
          <span className="text-xs text-rose-700">below safety threshold</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-soft">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Expiring Soon / Expired
          </span>
          <div className="text-3xl font-black text-amber-700 mt-1">{summary.expiringSoonCount}</div>
          <span className="text-xs text-slate-500">within 30 days</span>
        </div>
      </div>

      {/* Inventory List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map(n => <div key={n} className="h-48 bg-slate-200 rounded-3xl animate-pulse"></div>)
        ) : inventory.length === 0 ? (
          <div className="col-span-full bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-soft">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-bold text-slate-700">No inventory tracked yet.</p>
            <p className="text-xs text-slate-500 mt-1">Add medications to track quantities and receive stock depletion alerts.</p>
          </div>
        ) : (
          inventory.map((item) => {
            const isLow = item.isLowStock;
            const isExp = item.isExpired;
            const isSoon = item.isExpiringSoon;

            return (
              <div
                key={item.id}
                className={`bg-white rounded-3xl p-5 border transition-all shadow-soft flex flex-col justify-between ${
                  isLow ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                        {item.dosage} • {item.frequency}
                      </span>
                      <h3 className={`font-black text-slate-900 mt-1 ${elderlyMode ? 'text-2xl' : 'text-lg'}`}>
                        {item.medicationName}
                      </h3>
                    </div>

                    {isLow && (
                      <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Refill Needed</span>
                      </span>
                    )}
                  </div>

                  {/* Quantity Display */}
                  <div className="mt-4 bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                        Remaining Stock
                      </span>
                      <span className={`text-2xl font-black font-mono ${isLow ? 'text-rose-700' : 'text-slate-900'}`}>
                        {item.currentQuantity} <span className="text-sm font-semibold">{item.unit}</span>
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                        Threshold
                      </span>
                      <span className="text-sm font-mono font-bold text-slate-600">
                        &le; {item.lowStockThreshold} {item.unit}
                      </span>
                    </div>
                  </div>

                  {/* Expiry Date */}
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Expires:</span>
                    </span>
                    <span className={`font-mono font-bold ${
                      isExp ? 'text-rose-600' : isSoon ? 'text-amber-600' : 'text-slate-700'
                    }`}>
                      {item.expiryDate || 'Not specified'} {isExp ? '(Expired)' : isSoon ? '(Soon)' : ''}
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Auto-decrements when taken
                  </span>

                  <button
                    onClick={() => openRestock(item)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs border border-emerald-200 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Restock</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Restock Modal */}
      {restockModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Restock Medicine</h3>
                <p className="text-xs text-slate-500 mt-0.5">{restockModalItem.medicationName} ({restockModalItem.dosage})</p>
              </div>
              <button
                onClick={() => setRestockModalItem(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRestock} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Quantity to Add ({restockModalItem.unit}) *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={quantityToAdd}
                  onChange={(e) => setQuantityToAdd(e.target.value)}
                  className="block w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-slate-900 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  New Package Expiry Date (Optional)
                </label>
                <input
                  type="date"
                  value={newExpiry}
                  onChange={(e) => setNewExpiry(e.target.value)}
                  className="block w-full px-3.5 py-2 border border-slate-300 rounded-xl text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setRestockModalItem(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow transition-transform active:scale-95 disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : `Confirm +${quantityToAdd} ${restockModalItem.unit}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
