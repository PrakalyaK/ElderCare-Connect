const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('eldercare_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      // Clear stale or orphaned session tokens so user is never stuck in an invalid state
      localStorage.removeItem('eldercare_token');
      localStorage.removeItem('eldercare_active_profile_id');
    }
    const errorMsg = data.error || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  // Auth
  register: (body) => request('/auth/register', { method: 'POST', body }),
  login: (body) => request('/auth/login', { method: 'POST', body }),
  getMe: () => request('/auth/me'),
  toggleElderlyMode: (enabled) => request('/auth/toggle-elderly-mode', { method: 'PUT', body: { enabled } }),

  // Profiles
  createProfile: (body) => request('/profiles', { method: 'POST', body }),
  registerAndCreateProfile: (body) => request('/profiles/register-and-create', { method: 'POST', body }),
  getMyProfiles: () => request('/profiles/my'),
  getProfile: (profileId) => request(`/profiles/${profileId}`),
  updateProfile: (profileId, body) => request(`/profiles/${profileId}`, { method: 'PUT', body }),
  joinProfile: (body) => request('/profiles/join', { method: 'POST', body }),
  resetPasscode: (profileId, newPasscode) => request(`/profiles/${profileId}/passcode/reset`, { method: 'POST', body: { newPasscode } }),

  // Medications
  getMedications: (profileId) => request(`/profiles/${profileId}/medications`),
  addMedication: (profileId, body) => request(`/profiles/${profileId}/medications`, { method: 'POST', body }),
  updateMedication: (profileId, medId, body) => request(`/profiles/${profileId}/medications/${medId}`, { method: 'PUT', body }),
  deleteMedication: (profileId, medId) => request(`/profiles/${profileId}/medications/${medId}`, { method: 'DELETE' }),
  getTodaySchedule: (profileId) => request(`/profiles/${profileId}/medications/today-schedule`),
  markDoseTaken: (profileId, logId, notes) => request(`/profiles/${profileId}/medications/logs/${logId}/mark-taken`, { method: 'POST', body: { notes } }),
  markDoseSkipped: (profileId, logId, reason) => request(`/profiles/${profileId}/medications/logs/${logId}/mark-skipped`, { method: 'POST', body: { reason } }),
  getMedicationHistory: (profileId, params = '') => request(`/profiles/${profileId}/medications/history${params}`),

  // Adherence
  getAdherence: (profileId) => request(`/profiles/${profileId}/adherence`),

  // Appointments
  getAppointments: (profileId) => request(`/profiles/${profileId}/appointments`),
  addAppointment: (profileId, body) => request(`/profiles/${profileId}/appointments`, { method: 'POST', body }),
  updateAppointment: (profileId, apptId, body) => request(`/profiles/${profileId}/appointments/${apptId}`, { method: 'PUT', body }),
  deleteAppointment: (profileId, apptId) => request(`/profiles/${profileId}/appointments/${apptId}`, { method: 'DELETE' }),
  sendAppointmentReminder: (profileId, apptId) => request(`/profiles/${profileId}/appointments/${apptId}/send-reminder`, { method: 'POST' }),

  // Inventory
  getInventory: (profileId) => request(`/profiles/${profileId}/inventory`),
  restockInventory: (profileId, inventoryId, body) => request(`/profiles/${profileId}/inventory/${inventoryId}/restock`, { method: 'POST', body }),
  updateInventory: (profileId, inventoryId, body) => request(`/profiles/${profileId}/inventory/${inventoryId}`, { method: 'PUT', body }),

  // Emergency
  getEmergencyDetails: (profileId) => request(`/profiles/${profileId}/emergency`),
  addEmergencyContact: (profileId, body) => request(`/profiles/${profileId}/emergency/contacts`, { method: 'POST', body }),
  updateEmergencyContact: (profileId, contactId, body) => request(`/profiles/${profileId}/emergency/contacts/${contactId}`, { method: 'PUT', body }),
  deleteEmergencyContact: (profileId, contactId) => request(`/profiles/${profileId}/emergency/contacts/${contactId}`, { method: 'DELETE' }),
  updateHealthDetails: (profileId, body) => request(`/profiles/${profileId}/emergency/details`, { method: 'PUT', body }),

  // Care Circle & Activity
  getCareCircle: (profileId) => request(`/profiles/${profileId}/care-circle`),
  updateCareCircleMember: (profileId, accessId, body) => request(`/profiles/${profileId}/care-circle/${accessId}`, { method: 'PUT', body }),
  revokeCareCircleMember: (profileId, accessId) => request(`/profiles/${profileId}/care-circle/${accessId}`, { method: 'DELETE' }),
  getActivityLogs: (profileId, limit = 30) => request(`/profiles/${profileId}/care-circle/activity?limit=${limit}`),

  // Notifications
  getNotifications: (profileId, unreadOnly = false) => request(`/profiles/${profileId}/notifications?unreadOnly=${unreadOnly}`),
  markNotificationRead: (profileId, id) => request(`/profiles/${profileId}/notifications/${id}/read`, { method: 'PUT' }),
  sendTestEmail: (profileId, targetEmail) => request(`/profiles/${profileId}/notifications/test-email`, { method: 'POST', body: { targetEmail } }),

  // Daily Summary
  getDailySummary: (profileId) => request(`/profiles/${profileId}/daily-summary`),

  // Escalation Simulation
  getEscalationStatus: (profileId) => request(`/profiles/${profileId}/escalation/status`),
  simulateEscalation: (profileId, body) => request(`/profiles/${profileId}/escalation/simulate`, { method: 'POST', body }),

  // Demo Reset
  resetDemoData: () => request('/demo/reset', { method: 'POST' }),
};
