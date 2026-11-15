import React from 'react';
import { AlertCircle, ShieldAlert } from 'lucide-react';

export function SafetyDisclaimer({ variant = 'medication' }) {
  if (variant === 'emergency') {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs sm:text-sm text-rose-900 flex items-start space-x-3 shadow-xs">
        <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Medical Emergency Notice</p>
          <p className="mt-0.5 text-rose-800">
            ElderCare Connect is an assistive care and medication management tool, NOT a replacement for 911 or emergency medical services. In any life-threatening situation or acute distress, call 911 immediately.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs sm:text-sm text-amber-900 flex items-start space-x-3 shadow-xs">
      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-bold">Important Clinical Safety Directive</p>
        <p className="mt-0.5 text-amber-800">
          <strong>Never double or take an extra dose</strong> to make up for a missed medication. If a dose is missed or delayed, consult your prescribing physician or pharmacist before taking action.
        </p>
      </div>
    </div>
  );
}
