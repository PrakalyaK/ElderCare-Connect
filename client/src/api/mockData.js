// In-browser mock database & API router for standalone GitHub Pages deployment
// Ensures the entire UI, Quick Demo Logins, Voice Assistant, and Escalation Simulator
// work interactively right in the browser even without a live backend server running.

const STORAGE_KEY = 'eldercare_mock_db_v1';

function getInitialData() {
  const todayStr = new Date().toISOString().split('T')[0];

  return {
    users: [
      {
        id: 'usr-margaret',
        email: 'margaret@eldercare.test',
        fullName: 'Margaret Vance',
        phone: '(555) 432-8910',
        role: 'elderly',
        elderlyMode: true,
      },
      {
        id: 'usr-sarah',
        email: 'sarah.vance@eldercare.test',
        fullName: 'Sarah Vance',
        phone: '(555) 234-5678',
        role: 'family',
        elderlyMode: false,
      },
      {
        id: 'usr-david',
        email: 'david.miller@eldercare.test',
        fullName: 'David Miller, RN',
        phone: '(555) 876-5432',
        role: 'caregiver',
        elderlyMode: false,
      },
    ],
    profile: {
      id: 'prof-margaret',
      userId: 'usr-margaret',
      profileId: 'ELD-7842',
      displayName: 'Margaret Vance',
      dateOfBirth: '1948-06-12',
      gender: 'Female',
      bloodGroup: 'O+',
      primaryPhysician: 'Dr. Robert Smith',
      physicianPhone: '(555) 678-1234',
      notes: 'Takes morning medications with oatmeal and tea. Prefers large print summaries.',
      escalationTimeoutMinutes: 45,
      permissionLevel: 'owner',
      canRecordMeds: true,
      canEditSchedule: true,
      canReceiveAlerts: true,
    },
    todayLogs: [
      {
        id: 'log-1',
        medicationId: 'med-lisinopril',
        name: 'Lisinopril',
        dosage: '10 mg',
        instructions: 'Take 1 tablet in the morning with water.',
        foodRelation: 'with_food',
        colorTag: 'emerald',
        shape: 'tablet',
        scheduledDate: todayStr,
        scheduledTime: '08:00',
        status: 'taken',
        recordedAt: `${todayStr}T08:15:00.000Z`,
        recordedByName: 'Margaret Vance',
        escalationLevel: 0,
        notes: 'Taken with breakfast',
      },
      {
        id: 'log-2',
        medicationId: 'med-metformin',
        name: 'Metformin HCl',
        dosage: '500 mg',
        instructions: 'Take 1 tablet twice daily with meals.',
        foodRelation: 'with_food',
        colorTag: 'blue',
        shape: 'capsule',
        scheduledDate: todayStr,
        scheduledTime: '08:00',
        status: 'taken',
        recordedAt: `${todayStr}T08:16:00.000Z`,
        recordedByName: 'Margaret Vance',
        escalationLevel: 0,
        notes: null,
      },
      {
        id: 'log-3',
        medicationId: 'med-aspirin',
        name: 'Aspirin 81mg',
        dosage: '81 mg',
        instructions: 'Take 1 low-dose tablet after lunch.',
        foodRelation: 'after_food',
        colorTag: 'amber',
        shape: 'tablet',
        scheduledDate: todayStr,
        scheduledTime: '13:00',
        status: 'pending',
        recordedAt: null,
        recordedByName: null,
        escalationLevel: 0,
        notes: null,
      },
      {
        id: 'log-4',
        medicationId: 'med-metformin-pm',
        name: 'Metformin HCl',
        dosage: '500 mg',
        instructions: 'Take 1 tablet with dinner.',
        foodRelation: 'with_food',
        colorTag: 'blue',
        shape: 'capsule',
        scheduledDate: todayStr,
        scheduledTime: '19:30',
        status: 'pending',
        recordedAt: null,
        recordedByName: null,
        escalationLevel: 0,
        notes: null,
      },
      {
        id: 'log-5',
        medicationId: 'med-atorvastatin',
        name: 'Atorvastatin',
        dosage: '20 mg',
        instructions: 'Take 1 tablet before bedtime.',
        foodRelation: 'no_preference',
        colorTag: 'purple',
        shape: 'tablet',
        scheduledDate: todayStr,
        scheduledTime: '21:00',
        status: 'pending',
        recordedAt: null,
        recordedByName: null,
        escalationLevel: 0,
        notes: null,
      },
    ],
    medications: [
      {
        id: 'med-lisinopril',
        profileId: 'prof-margaret',
        name: 'Lisinopril',
        dosage: '10 mg',
        frequency: 'Once Daily',
        instructions: 'Take 1 tablet every morning with breakfast and water for blood pressure.',
        foodRelation: 'with_food',
        startDate: '2025-01-01',
        colorTag: 'emerald',
        shape: 'tablet',
        isActive: true,
        schedules: [{ id: 'sch-1', timeOfDay: '08:00', label: 'Morning', doseAmount: '1 tablet' }],
        inventory: { currentQuantity: 28, lowStockThreshold: 7, unit: 'tablets', expiryDate: '2027-06-30' },
      },
      {
        id: 'med-metformin',
        profileId: 'prof-margaret',
        name: 'Metformin HCl',
        dosage: '500 mg',
        frequency: 'Twice Daily',
        instructions: 'Take 1 tablet twice daily with morning and evening meals.',
        foodRelation: 'with_food',
        startDate: '2025-01-01',
        colorTag: 'blue',
        shape: 'capsule',
        isActive: true,
        schedules: [
          { id: 'sch-2', timeOfDay: '08:00', label: 'Morning', doseAmount: '1 tablet' },
          { id: 'sch-3', timeOfDay: '19:30', label: 'Evening', doseAmount: '1 tablet' },
        ],
        inventory: { currentQuantity: 54, lowStockThreshold: 14, unit: 'tablets', expiryDate: '2027-08-15' },
      },
      {
        id: 'med-aspirin',
        profileId: 'prof-margaret',
        name: 'Aspirin 81mg',
        dosage: '81 mg',
        frequency: 'Once Daily',
        instructions: 'Take 1 chewable low-dose aspirin after lunch for cardioprotection.',
        foodRelation: 'after_food',
        startDate: '2025-01-01',
        colorTag: 'amber',
        shape: 'tablet',
        isActive: true,
        schedules: [{ id: 'sch-4', timeOfDay: '13:00', label: 'Afternoon', doseAmount: '1 tablet' }],
        inventory: { currentQuantity: 42, lowStockThreshold: 10, unit: 'tablets', expiryDate: '2027-11-20' },
      },
      {
        id: 'med-atorvastatin',
        profileId: 'prof-margaret',
        name: 'Atorvastatin',
        dosage: '20 mg',
        frequency: 'Once Daily',
        instructions: 'Take 1 tablet at bedtime for cholesterol management.',
        foodRelation: 'no_preference',
        startDate: '2025-01-01',
        colorTag: 'purple',
        shape: 'tablet',
        isActive: true,
        schedules: [{ id: 'sch-5', timeOfDay: '21:00', label: 'Night', doseAmount: '1 tablet' }],
        inventory: { currentQuantity: 15, lowStockThreshold: 7, unit: 'tablets', expiryDate: '2027-05-10' },
      },
    ],
    appointments: [
      {
        id: 'appt-1',
        profileId: 'prof-margaret',
        doctorName: 'Dr. Robert Smith',
        specialty: 'Cardiology',
        hospitalName: 'St. Jude Pavilion - Suite 402',
        appointmentDate: '2026-11-25',
        appointmentTime: '10:30',
        purpose: 'Quarterly cardiovascular review & blood pressure follow-up.',
        status: 'scheduled',
        contactPhone: '(555) 678-1234',
      },
      {
        id: 'appt-2',
        profileId: 'prof-margaret',
        doctorName: 'Dr. Eleanor Wright',
        specialty: 'Ophthalmology',
        hospitalName: 'Vision Health Center - Room 12',
        appointmentDate: '2026-12-05',
        appointmentTime: '14:00',
        purpose: 'Annual diabetic eye & glaucoma screening.',
        status: 'scheduled',
        contactPhone: '(555) 789-0123',
      },
    ],
    careCircle: [
      {
        id: 'acc-sarah',
        userId: 'usr-sarah',
        name: 'Sarah Vance',
        email: 'sarah.vance@eldercare.test',
        phone: '(555) 234-5678',
        relationship: 'Daughter',
        permissionLevel: 'full_access',
        role: 'family',
        status: 'authorized',
        canRecordMeds: true,
        canEditSchedule: true,
        canReceiveAlerts: true,
        authorizedAt: '2025-01-02T10:00:00.000Z',
      },
      {
        id: 'acc-david',
        userId: 'usr-david',
        name: 'David Miller, RN',
        email: 'david.miller@eldercare.test',
        phone: '(555) 876-5432',
        relationship: 'Home Health Nurse',
        permissionLevel: 'med_manager',
        role: 'caregiver',
        status: 'authorized',
        canRecordMeds: true,
        canEditSchedule: false,
        canReceiveAlerts: true,
        authorizedAt: '2025-01-05T14:30:00.000Z',
      },
    ],
    emergency: {
      profileId: 'prof-margaret',
      bloodGroup: 'O+',
      allergies: 'Penicillin, Sulfa drugs',
      chronicConditions: 'Hypertension, Type 2 Diabetes, Mild Osteoarthritis',
      dnrStatus: false,
      primaryPhysician: 'Dr. Robert Smith',
      physicianPhone: '(555) 678-1234',
      preferredHospital: 'St. Jude Medical Center, West Wing ER',
      insuranceProvider: 'Medicare Part B / Blue Cross PPO',
      policyNumber: 'MC-892348-A',
      emergencyContacts: [
        {
          id: 'ec-1',
          name: 'Sarah Vance',
          relationship: 'Daughter',
          phone: '(555) 234-5678',
          alternatePhone: '(555) 998-1122',
          isPrimary: true,
        },
        {
          id: 'ec-2',
          name: 'David Miller, RN',
          relationship: 'Caregiver Nurse',
          phone: '(555) 876-5432',
          isPrimary: false,
        },
      ],
    },
    notifications: [
      {
        id: 'notif-1',
        title: 'Morning Dose Completed',
        message: 'Lisinopril 10mg was confirmed taken by Margaret Vance.',
        type: 'dose_taken',
        severity: 'info',
        isRead: false,
        createdAt: `${todayStr}T08:15:00.000Z`,
      },
      {
        id: 'notif-2',
        title: 'Upcoming Dose Reminder',
        message: 'Aspirin 81mg scheduled at 13:00. Please prepare afternoon dose.',
        type: 'reminder',
        severity: 'info',
        isRead: true,
        createdAt: `${todayStr}T12:45:00.000Z`,
      },
    ],
    activityLogs: [
      {
        id: 'act-1',
        action: 'DOSE_TAKEN',
        actorName: 'Margaret Vance',
        actorRole: 'elderly',
        description: 'Confirmed dose for Lisinopril 10mg at 08:15 AM (with breakfast).',
        timestamp: `${todayStr}T08:15:00.000Z`,
      },
      {
        id: 'act-2',
        action: 'DOSE_TAKEN',
        actorName: 'Margaret Vance',
        actorRole: 'elderly',
        description: 'Confirmed dose for Metformin HCl 500mg at 08:16 AM.',
        timestamp: `${todayStr}T08:16:00.000Z`,
      },
      {
        id: 'act-3',
        action: 'INVENTORY_DECREMENT',
        actorName: 'System Engine',
        actorRole: 'system',
        description: 'Stock updated: Lisinopril remaining: 28 tablets.',
        timestamp: `${todayStr}T08:15:01.000Z`,
      },
    ],
  };
}

function loadDb() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Mock DB parse failed, initializing fresh:', e);
  }
  const init = getInitialData();
  saveDb(init);
  return init;
}

function saveDb(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Mock DB save failed:', e);
  }
}

export function resetMockDatabase() {
  const init = getInitialData();
  saveDb(init);
  return { message: 'Demo dataset reset successfully!' };
}

export function handleMockFallback(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const db = loadDb();
  let body = {};
  if (options.body) {
    body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
  }

  // Normalize endpoint query strings
  const [path, queryString] = endpoint.split('?');

  // 1. Auth: /auth/login
  if (path === '/auth/login' && method === 'POST') {
    const user = db.users.find(u => u.email.toLowerCase() === body.email?.toLowerCase()) || db.users[0];
    return {
      token: `mock_jwt_token_${user.id}`,
      user,
    };
  }

  // 2. Auth: /auth/me
  if (path === '/auth/me') {
    const token = localStorage.getItem('eldercare_token') || '';
    let user = db.users[0];
    if (token.includes('sarah')) user = db.users[1];
    if (token.includes('david')) user = db.users[2];
    return { user };
  }

  // 3. Auth: /auth/toggle-elderly-mode
  if (path === '/auth/toggle-elderly-mode') {
    const user = db.users[0];
    user.elderlyMode = body.enabled ?? !user.elderlyMode;
    saveDb(db);
    return { user, message: 'Elderly mode preference updated.' };
  }

  // 4. Profiles: /profiles/my
  if (path === '/profiles/my') {
    return {
      profiles: [db.profile],
    };
  }

  // 5. Profiles: /profiles/:id
  if (path.match(/^\/profiles\/[^/]+$/) && method === 'GET') {
    return { profile: db.profile };
  }

  // 6. Profiles: /profiles/:id/daily-summary
  if (path.includes('/daily-summary')) {
    const taken = db.todayLogs.filter(l => l.status === 'taken').length;
    const total = db.todayLogs.length;
    const pending = total - taken;
    const next = db.todayLogs.find(l => l.status === 'pending');

    const text = `Good day, Margaret! Today you have ${total} scheduled doses. You have completed ${taken}, with ${pending} remaining. Your next medicine is ${next ? next.name + ' at ' + next.scheduledTime : 'all done for today!'} You also have a cardiology visit with Dr. Robert Smith on November 25th.`;

    return {
      greeting: 'Good Day, Margaret!',
      date: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
      summaryText: text,
      audioText: text,
      stats: { total, taken, pending, overdue: 0 },
      nextDose: next || null,
      upcomingAppointment: db.appointments[0] || null,
    };
  }

  // 7. Today Schedule: /profiles/:id/medications/today-schedule
  if (path.includes('/medications/today-schedule')) {
    const taken = db.todayLogs.filter(l => l.status === 'taken').length;
    const pending = db.todayLogs.filter(l => l.status === 'pending').length;
    const missed = db.todayLogs.filter(l => l.status === 'missed').length;

    return {
      date: new Date().toISOString().split('T')[0],
      schedule: db.todayLogs,
      summary: {
        total: db.todayLogs.length,
        taken,
        pending,
        missed,
        skipped: 0,
      },
    };
  }

  // 8. Mark Taken: /profiles/:id/medications/logs/:logId/mark-taken
  if (path.includes('/mark-taken') && method === 'POST') {
    const logId = path.split('/')[5];
    const log = db.todayLogs.find(l => l.id === logId);
    if (log) {
      log.status = 'taken';
      log.recordedAt = new Date().toISOString();
      log.recordedByName = 'Margaret Vance (Self)';
      log.notes = body.notes || 'Confirmed via web client';

      // Decrement inventory
      const med = db.medications.find(m => m.id === log.medicationId);
      if (med && med.inventory) {
        med.inventory.currentQuantity = Math.max(0, med.inventory.currentQuantity - 1);
      }

      db.activityLogs.unshift({
        id: `act-${Date.now()}`,
        action: 'DOSE_TAKEN',
        actorName: 'Margaret Vance',
        actorRole: 'elderly',
        description: `Marked dose taken for ${log.name} ${log.dosage}.`,
        timestamp: new Date().toISOString(),
      });

      saveDb(db);
      return { success: true, log, message: 'Dose marked as taken.' };
    }
  }

  // 9. Mark Skipped
  if (path.includes('/mark-skipped') && method === 'POST') {
    const logId = path.split('/')[5];
    const log = db.todayLogs.find(l => l.id === logId);
    if (log) {
      log.status = 'skipped';
      log.notes = body.reason || 'Skipped by patient';
      saveDb(db);
      return { success: true, log };
    }
  }

  // 10. Medications List: /profiles/:id/medications
  if (path.match(/\/profiles\/[^/]+\/medications$/)) {
    if (method === 'GET') {
      return { medications: db.medications };
    }
    if (method === 'POST') {
      const newMed = {
        id: `med-${Date.now()}`,
        profileId: 'prof-margaret',
        ...body,
        isActive: true,
        schedules: body.schedules || [{ id: `sch-${Date.now()}`, timeOfDay: '09:00', label: 'Morning' }],
        inventory: {
          currentQuantity: Number(body.initialQuantity) || 30,
          lowStockThreshold: Number(body.lowStockThreshold) || 7,
          unit: body.unit || 'tablets',
          expiryDate: body.expiryDate || '2027-12-31',
        },
      };
      db.medications.push(newMed);
      saveDb(db);
      return { success: true, medication: newMed };
    }
  }

  // 11. Adherence: /profiles/:id/adherence
  if (path.includes('/adherence')) {
    return {
      rate: 88,
      streakDays: 14,
      totalScheduledDoses: 28,
      totalTakenDoses: 25,
      totalMissedDoses: 2,
      totalSkippedDoses: 1,
      trend: [
        { day: 'Mon', adherence: 100 },
        { day: 'Tue', adherence: 100 },
        { day: 'Wed', adherence: 75 },
        { day: 'Thu', adherence: 100 },
        { day: 'Fri', adherence: 100 },
        { day: 'Sat', adherence: 100 },
        { day: 'Sun', adherence: 80 },
      ],
      missedDoses: [
        { name: 'Metformin HCl', scheduledTime: '19:30', date: '2026-11-13' },
      ],
    };
  }

  // 12. Appointments: /profiles/:id/appointments
  if (path.includes('/appointments')) {
    if (path.includes('/send-reminder') && method === 'POST') {
      return { success: true, message: 'Appointment reminder dispatched to Care Circle!' };
    }
    if (method === 'GET') {
      return { appointments: db.appointments };
    }
    if (method === 'POST') {
      const newAppt = {
        id: `appt-${Date.now()}`,
        profileId: 'prof-margaret',
        status: 'scheduled',
        ...body,
      };
      db.appointments.push(newAppt);
      saveDb(db);
      return { success: true, appointment: newAppt };
    }
  }

  // 13. Inventory: /profiles/:id/inventory
  if (path.includes('/inventory')) {
    if (path.includes('/restock') && method === 'POST') {
      const invId = path.split('/')[4];
      const med = db.medications[0];
      if (med && med.inventory) {
        med.inventory.currentQuantity += Number(body.quantityAdded || 30);
      }
      saveDb(db);
      return { success: true, message: 'Inventory restocked.' };
    }
    const invList = db.medications.map(m => ({
      id: `inv-${m.id}`,
      medicationId: m.id,
      medicationName: m.name,
      dosage: m.dosage,
      currentQuantity: m.inventory?.currentQuantity ?? 30,
      lowStockThreshold: m.inventory?.lowStockThreshold ?? 7,
      unit: m.inventory?.unit ?? 'tablets',
      expiryDate: m.inventory?.expiryDate ?? '2027-12-31',
      isLowStock: (m.inventory?.currentQuantity ?? 30) <= (m.inventory?.lowStockThreshold ?? 7),
    }));
    return { inventory: invList, lowStockCount: invList.filter(i => i.isLowStock).length };
  }

  // 14. Emergency: /profiles/:id/emergency
  if (path.includes('/emergency')) {
    return { emergency: db.emergency };
  }

  // 15. Care Circle: /profiles/:id/care-circle
  if (path.includes('/care-circle')) {
    if (path.includes('/activity')) {
      return { activity: db.activityLogs.slice(0, 10) };
    }
    return { members: db.careCircle };
  }

  // 16. Notifications: /profiles/:id/notifications
  if (path.includes('/notifications')) {
    if (path.includes('/test-email') && method === 'POST') {
      return { success: true, message: `Test escalation email dispatched to ${body.targetEmail || 'caregiver'}!` };
    }
    return { notifications: db.notifications };
  }

  // 17. Escalation Simulation: /profiles/:id/escalation/simulate
  if (path.includes('/escalation/simulate') && method === 'POST') {
    const unconfirmed = db.todayLogs.find(l => l.status === 'pending') || db.todayLogs[2];
    if (unconfirmed) {
      unconfirmed.status = 'missed';
      unconfirmed.escalationLevel = 2;
    }
    db.notifications.unshift({
      id: `notif-esc-${Date.now()}`,
      title: '🚨 CRITICAL ESCALATION (Tier 2)',
      message: `Dose missed: ${unconfirmed?.name || 'Aspirin 81mg'}. Critical alert dispatched to Sarah Vance & David Miller, RN!`,
      type: 'escalation_tier2',
      severity: 'critical',
      isRead: false,
      createdAt: new Date().toISOString(),
    });
    db.activityLogs.unshift({
      id: `act-esc-${Date.now()}`,
      action: 'ESCALATION_TIER_2',
      actorName: 'Escalation Engine',
      actorRole: 'system',
      description: `Tier 2 alert dispatched to Care Circle for missed dose of ${unconfirmed?.name || 'Aspirin 81mg'}.`,
      timestamp: new Date().toISOString(),
    });
    saveDb(db);
    return {
      success: true,
      message: 'Escalation simulated successfully! Tier 2 critical alerts dispatched.',
      escalationLevel: 2,
      log: unconfirmed,
    };
  }

  if (path.includes('/escalation/status')) {
    return {
      activeEscalations: 0,
      timeoutMinutes: 45,
      isEngineRunning: true,
    };
  }

  // 18. Demo Reset
  if (path.includes('/demo/reset')) {
    return resetMockDatabase();
  }

  // Default fallback
  return { success: true, message: 'Mock response generated.' };
}
