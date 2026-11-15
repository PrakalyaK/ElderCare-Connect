import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { getDb } from './db.js';
import * as schema from './schema.js';

export async function seedDatabase(force = false) {
  const { db } = await getDb();

  // Check if data already seeded
  const existingUsers = await db.select().from(schema.users);
  if (existingUsers.length > 0 && !force) {
    console.log('Database already has data. Skipping seed.');
    return;
  }

  if (force) {
    console.log('Clearing existing data for fresh seed...');
    // Delete in order of foreign keys
    await db.delete(schema.activityLogs);
    await db.delete(schema.notifications);
    await db.delete(schema.healthProfileDetails);
    await db.delete(schema.emergencyContacts);
    await db.delete(schema.medicineInventory);
    await db.delete(schema.appointments);
    await db.delete(schema.medicationLogs);
    await db.delete(schema.medicationSchedules);
    await db.delete(schema.medications);
    await db.delete(schema.profileAccess);
    await db.delete(schema.elderlyProfiles);
    await db.delete(schema.users);
  }

  console.log('🌱 Seeding ElderCare Connect with realistic healthcare sample data...');

  const passwordHash = await bcrypt.hash('password123', 10);
  const passcodeHash = await bcrypt.hash('CARE78', 10);

  // 1. Users
  const elderlyUserId = nanoid();
  const familyUserId = nanoid();
  const caregiverUserId = nanoid();

  await db.insert(schema.users).values([
    {
      id: elderlyUserId,
      email: 'margaret@eldercare.test',
      passwordHash,
      fullName: 'Margaret Vance',
      phone: '(555) 432-8910',
      role: 'elderly',
      elderlyMode: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: familyUserId,
      email: 'sarah.vance@eldercare.test',
      passwordHash,
      fullName: 'Sarah Vance',
      phone: '(555) 234-5678',
      role: 'family',
      elderlyMode: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: caregiverUserId,
      email: 'david.miller@eldercare.test',
      passwordHash,
      fullName: 'David Miller, RN',
      phone: '(555) 876-5432',
      role: 'caregiver',
      elderlyMode: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  // 2. Elderly Profile
  const profileRecordId = nanoid();
  await db.insert(schema.elderlyProfiles).values({
    id: profileRecordId,
    userId: elderlyUserId,
    profileId: 'ELD-7842',
    passcodeHash,
    displayName: 'Margaret Vance',
    dateOfBirth: '1948-06-12',
    gender: 'Female',
    bloodGroup: 'O+',
    primaryPhysician: 'Dr. Robert Smith',
    physicianPhone: '(555) 678-1234',
    notes: 'Takes morning medications with oatmeal and tea. Prefers large print summaries.',
    escalationTimeoutMinutes: 45,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // 3. Profile Access (Care Circle)
  await db.insert(schema.profileAccess).values([
    {
      id: nanoid(),
      profileId: profileRecordId,
      userId: familyUserId,
      relationship: 'Daughter',
      role: 'family',
      permissionLevel: 'full_access',
      status: 'authorized',
      canRecordMeds: true,
      canEditSchedule: true,
      canReceiveAlerts: true,
      authorizedAt: new Date(),
      createdAt: new Date(),
    },
    {
      id: nanoid(),
      profileId: profileRecordId,
      userId: caregiverUserId,
      relationship: 'Home Health Nurse',
      role: 'caregiver',
      permissionLevel: 'med_manager',
      status: 'authorized',
      canRecordMeds: true,
      canEditSchedule: false,
      canReceiveAlerts: true,
      authorizedAt: new Date(),
      createdAt: new Date(),
    },
  ]);

  // 4. Medications & Schedules
  const med1Id = nanoid();
  const med2Id = nanoid();
  const med3Id = nanoid();
  const med4Id = nanoid();

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  await db.insert(schema.medications).values([
    {
      id: med1Id,
      profileId: profileRecordId,
      name: 'Lisinopril',
      dosage: '10 mg',
      frequency: 'Once Daily',
      instructions: 'Take 1 tablet every morning with breakfast and water for blood pressure.',
      foodRelation: 'with_food',
      startDate: '2025-01-01',
      colorTag: 'emerald',
      shape: 'tablet',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: med2Id,
      profileId: profileRecordId,
      name: 'Metformin HCl',
      dosage: '500 mg',
      frequency: 'Twice Daily',
      instructions: 'Take with morning meal and evening dinner to manage blood sugar.',
      foodRelation: 'with_food',
      startDate: '2025-01-01',
      colorTag: 'sky',
      shape: 'capsule',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: med3Id,
      profileId: profileRecordId,
      name: 'Atorvastatin',
      dosage: '20 mg',
      frequency: 'Once Daily at Bedtime',
      instructions: 'Take 1 tablet before sleeping for cholesterol management.',
      foodRelation: 'independent',
      startDate: '2025-01-01',
      colorTag: 'amber',
      shape: 'tablet',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: med4Id,
      profileId: profileRecordId,
      name: 'Latanoprost Eye Drops',
      dosage: '1 drop',
      frequency: 'Once Daily in Evening',
      instructions: 'Administer 1 drop in each eye at 8:00 PM for ocular pressure.',
      foodRelation: 'independent',
      startDate: '2025-02-01',
      colorTag: 'purple',
      shape: 'drops',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  // Medication Schedules
  const sched1Id = nanoid();
  const sched2AId = nanoid();
  const sched2BId = nanoid();
  const sched3Id = nanoid();
  const sched4Id = nanoid();

  await db.insert(schema.medicationSchedules).values([
    {
      id: sched1Id,
      medicationId: med1Id,
      profileId: profileRecordId,
      timeOfDay: '08:30',
      label: 'Morning Breakfast',
      doseAmount: '1 tablet (10mg)',
      daysOfWeek: '1,2,3,4,5,6,7',
      createdAt: new Date(),
    },
    {
      id: sched2AId,
      medicationId: med2Id,
      profileId: profileRecordId,
      timeOfDay: '09:00',
      label: 'Breakfast Dose',
      doseAmount: '1 tablet (500mg)',
      daysOfWeek: '1,2,3,4,5,6,7',
      createdAt: new Date(),
    },
    {
      id: sched2BId,
      medicationId: med2Id,
      profileId: profileRecordId,
      timeOfDay: '19:30',
      label: 'Dinner Dose',
      doseAmount: '1 tablet (500mg)',
      daysOfWeek: '1,2,3,4,5,6,7',
      createdAt: new Date(),
    },
    {
      id: sched3Id,
      medicationId: med3Id,
      profileId: profileRecordId,
      timeOfDay: '21:00',
      label: 'Bedtime',
      doseAmount: '1 tablet (20mg)',
      daysOfWeek: '1,2,3,4,5,6,7',
      createdAt: new Date(),
    },
    {
      id: sched4Id,
      medicationId: med4Id,
      profileId: profileRecordId,
      timeOfDay: '20:00',
      label: 'Evening Drops',
      doseAmount: '1 drop per eye',
      daysOfWeek: '1,2,3,4,5,6,7',
      createdAt: new Date(),
    },
  ]);

  // 5. Medicine Inventory
  await db.insert(schema.medicineInventory).values([
    {
      id: nanoid(),
      profileId: profileRecordId,
      medicationId: med1Id,
      currentQuantity: 24,
      unit: 'tablets',
      lowStockThreshold: 7,
      expiryDate: '2027-08-15',
      refillReminderSent: false,
      lastRestockedAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: nanoid(),
      profileId: profileRecordId,
      medicationId: med2Id,
      currentQuantity: 3, // LOW STOCK TRIGGER!
      unit: 'tablets',
      lowStockThreshold: 8,
      expiryDate: '2027-04-10',
      refillReminderSent: false,
      lastRestockedAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: nanoid(),
      profileId: profileRecordId,
      medicationId: med3Id,
      currentQuantity: 42,
      unit: 'tablets',
      lowStockThreshold: 10,
      expiryDate: '2027-11-20',
      refillReminderSent: false,
      lastRestockedAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: nanoid(),
      profileId: profileRecordId,
      medicationId: med4Id,
      currentQuantity: 1, // LOW STOCK
      unit: 'bottles',
      lowStockThreshold: 1,
      expiryDate: '2026-12-01',
      refillReminderSent: false,
      lastRestockedAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  // 6. Today's and Past 6 Days Medication Logs for Adherence History
  const logEntries = [];

  // Past 6 days
  for (let i = 6; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    // Day i logs: Lisinopril, Metformin AM, Metformin PM, Drops, Atorvastatin
    logEntries.push(
      {
        id: nanoid(),
        profileId: profileRecordId,
        medicationId: med1Id,
        scheduleId: sched1Id,
        scheduledDate: dateStr,
        scheduledTime: '08:30',
        status: 'taken',
        recordedAt: new Date(`${dateStr}T08:35:00`),
        recordedByUserId: elderlyUserId,
        recordedByName: 'Margaret Vance',
        escalationLevel: 0,
        createdAt: new Date(),
      },
      {
        id: nanoid(),
        profileId: profileRecordId,
        medicationId: med2Id,
        scheduleId: sched2AId,
        scheduledDate: dateStr,
        scheduledTime: '09:00',
        status: 'taken',
        recordedAt: new Date(`${dateStr}T09:05:00`),
        recordedByUserId: elderlyUserId,
        recordedByName: 'Margaret Vance',
        escalationLevel: 0,
        createdAt: new Date(),
      },
      {
        id: nanoid(),
        profileId: profileRecordId,
        medicationId: med2Id,
        scheduleId: sched2BId,
        scheduledDate: dateStr,
        scheduledTime: '19:30',
        status: i === 3 ? 'missed' : 'taken', // simulate one missed dose on day -3
        recordedAt: i === 3 ? null : new Date(`${dateStr}T19:40:00`),
        recordedByUserId: i === 3 ? null : elderlyUserId,
        recordedByName: i === 3 ? null : 'Margaret Vance',
        escalationLevel: i === 3 ? 2 : 0,
        createdAt: new Date(),
      },
      {
        id: nanoid(),
        profileId: profileRecordId,
        medicationId: med4Id,
        scheduleId: sched4Id,
        scheduledDate: dateStr,
        scheduledTime: '20:00',
        status: 'taken',
        recordedAt: new Date(`${dateStr}T20:10:00`),
        recordedByUserId: elderlyUserId,
        recordedByName: 'Margaret Vance',
        escalationLevel: 0,
        createdAt: new Date(),
      },
      {
        id: nanoid(),
        profileId: profileRecordId,
        medicationId: med3Id,
        scheduleId: sched3Id,
        scheduledDate: dateStr,
        scheduledTime: '21:00',
        status: 'taken',
        recordedAt: new Date(`${dateStr}T21:08:00`),
        recordedByUserId: elderlyUserId,
        recordedByName: 'Margaret Vance',
        escalationLevel: 0,
        createdAt: new Date(),
      }
    );
  }

  // Today's logs
  logEntries.push(
    {
      id: nanoid(),
      profileId: profileRecordId,
      medicationId: med1Id,
      scheduleId: sched1Id,
      scheduledDate: todayStr,
      scheduledTime: '08:30',
      status: 'taken',
      recordedAt: new Date(`${todayStr}T08:32:00`),
      recordedByUserId: elderlyUserId,
      recordedByName: 'Margaret Vance',
      escalationLevel: 0,
      createdAt: new Date(),
    },
    {
      id: nanoid(),
      profileId: profileRecordId,
      medicationId: med2Id,
      scheduleId: sched2AId,
      scheduledDate: todayStr,
      scheduledTime: '09:00',
      status: 'taken',
      recordedAt: new Date(`${todayStr}T09:12:00`),
      recordedByUserId: elderlyUserId,
      recordedByName: 'Margaret Vance',
      escalationLevel: 0,
      createdAt: new Date(),
    },
    {
      id: nanoid(),
      profileId: profileRecordId,
      medicationId: med2Id,
      scheduleId: sched2BId,
      scheduledDate: todayStr,
      scheduledTime: '19:30',
      status: 'pending',
      escalationLevel: 0,
      createdAt: new Date(),
    },
    {
      id: nanoid(),
      profileId: profileRecordId,
      medicationId: med4Id,
      scheduleId: sched4Id,
      scheduledDate: todayStr,
      scheduledTime: '20:00',
      status: 'pending',
      escalationLevel: 0,
      createdAt: new Date(),
    },
    {
      id: nanoid(),
      profileId: profileRecordId,
      medicationId: med3Id,
      scheduleId: sched3Id,
      scheduledDate: todayStr,
      scheduledTime: '21:00',
      status: 'pending',
      escalationLevel: 0,
      createdAt: new Date(),
    }
  );

  for (const log of logEntries) {
    await db.insert(schema.medicationLogs).values(log);
  }

  // 7. Appointments
  const in3Days = new Date(today);
  in3Days.setDate(in3Days.getDate() + 3);
  const in3DaysStr = in3Days.toISOString().split('T')[0];

  const in10Days = new Date(today);
  in10Days.setDate(in10Days.getDate() + 10);
  const in10DaysStr = in10Days.toISOString().split('T')[0];

  await db.insert(schema.appointments).values([
    {
      id: nanoid(),
      profileId: profileRecordId,
      doctorName: 'Robert Smith',
      specialization: 'Cardiology',
      hospitalClinic: 'St. Jude Heart & Vascular Pavilion',
      location: 'Suite 402, North Tower',
      appointmentDate: in3DaysStr,
      appointmentTime: '10:30',
      notes: '6-month hypertension review and resting ECG evaluation. Bring recent BP log.',
      status: 'scheduled',
      reminderSent: false,
      createdByUserId: familyUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: nanoid(),
      profileId: profileRecordId,
      doctorName: 'Emily Chen',
      specialization: 'Optometry & Ophthalmology',
      hospitalClinic: 'Memorial Eye Center',
      location: 'Building B, Clinic 3',
      appointmentDate: in10DaysStr,
      appointmentTime: '14:15',
      notes: 'Annual glaucoma follow-up and intraocular pressure test.',
      status: 'scheduled',
      reminderSent: false,
      createdByUserId: caregiverUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: nanoid(),
      profileId: profileRecordId,
      doctorName: 'Marcus Vance',
      specialization: 'Geriatric Internal Medicine',
      hospitalClinic: 'Riverside Health Center',
      location: 'Room 105',
      appointmentDate: '2025-01-15',
      appointmentTime: '11:00',
      notes: 'Annual Medicare comprehensive physical checkup.',
      status: 'completed',
      reminderSent: true,
      createdByUserId: elderlyUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  // 8. Emergency Contacts
  await db.insert(schema.emergencyContacts).values([
    {
      id: nanoid(),
      profileId: profileRecordId,
      name: 'Sarah Vance',
      relationship: 'Daughter',
      phone: '(555) 234-5678',
      secondaryPhone: '(555) 234-9988',
      isPrimary: true,
      canMakeMedicalDecisions: true,
      createdAt: new Date(),
    },
    {
      id: nanoid(),
      profileId: profileRecordId,
      name: 'David Miller, RN',
      relationship: 'Home Health Caregiver',
      phone: '(555) 876-5432',
      secondaryPhone: null,
      isPrimary: false,
      canMakeMedicalDecisions: false,
      createdAt: new Date(),
    },
    {
      id: nanoid(),
      profileId: profileRecordId,
      name: 'Dr. Robert Smith (Cardiologist)',
      relationship: 'Primary Physician',
      phone: '(555) 678-1234',
      secondaryPhone: '(555) 678-9999',
      isPrimary: false,
      canMakeMedicalDecisions: false,
      createdAt: new Date(),
    },
  ]);

  // 9. Health Profile Details
  await db.insert(schema.healthProfileDetails).values({
    id: nanoid(),
    profileId: profileRecordId,
    allergies: JSON.stringify(['Penicillin', 'Sulfa Antibiotics']),
    conditions: JSON.stringify(['Type 2 Diabetes', 'Hypertension', 'Mild Open-Angle Glaucoma']),
    bloodType: 'O+',
    dnrStatus: 'No DNR on file — Full Resuscitation Protocol',
    insuranceProvider: 'Blue Cross Senior Health Advantage',
    insurancePolicyNumber: 'BCS-992-8174',
    preferredHospital: 'St. Jude Memorial Hospital Emergency Center',
    updatedAt: new Date(),
  });

  // 10. Sample Notifications
  await db.insert(schema.notifications).values([
    {
      id: nanoid(),
      profileId: profileRecordId,
      recipientUserId: elderlyUserId,
      recipientEmail: 'margaret@eldercare.test',
      type: 'medication_reminder',
      title: 'Morning Routine: Lisinopril & Metformin',
      message: 'Your morning medications are scheduled with breakfast.',
      status: 'sent',
      deliveryChannel: 'in_app',
      isRead: true,
      metadata: '{}',
      sentAt: new Date(),
      createdAt: new Date(),
    },
    {
      id: nanoid(),
      profileId: profileRecordId,
      recipientUserId: familyUserId,
      recipientEmail: 'sarah.vance@eldercare.test',
      type: 'inventory_alert',
      title: 'Low Medicine Stock: Metformin HCl',
      message: 'Metformin HCl has 3 tablets remaining (threshold: 8). Refill needed soon.',
      status: 'sent',
      deliveryChannel: 'in_app',
      isRead: false,
      metadata: '{}',
      sentAt: new Date(),
      createdAt: new Date(),
    },
  ]);

  // 11. Activity Logs
  await db.insert(schema.activityLogs).values([
    {
      id: nanoid(),
      profileId: profileRecordId,
      actorUserId: elderlyUserId,
      actorName: 'Margaret Vance',
      actorRole: 'elderly',
      action: 'MEDICATION_TAKEN',
      details: 'Margaret Vance confirmed dose taken for "Lisinopril" (10 mg) at 08:32 AM.',
      createdAt: new Date(`${todayStr}T08:32:00`),
    },
    {
      id: nanoid(),
      profileId: profileRecordId,
      actorUserId: elderlyUserId,
      actorName: 'Margaret Vance',
      actorRole: 'elderly',
      action: 'MEDICATION_TAKEN',
      details: 'Margaret Vance confirmed dose taken for "Metformin HCl" (500 mg) at 09:12 AM.',
      createdAt: new Date(`${todayStr}T09:12:00`),
    },
    {
      id: nanoid(),
      profileId: profileRecordId,
      actorUserId: familyUserId,
      actorName: 'Sarah Vance',
      actorRole: 'family',
      action: 'APPOINTMENT_ADDED',
      details: 'Sarah Vance scheduled an appointment with Dr. Robert Smith (Cardiology) on ' + in3DaysStr + ' at 10:30.',
      createdAt: new Date(),
    },
  ]);

  console.log('✅ Realistic sample healthcare dataset successfully seeded!');
  console.log(`Demo Credentials:
  - Elderly:   margaret@eldercare.test / password123 (Profile ID: ELD-7842, Passcode: CARE78)
  - Family:    sarah.vance@eldercare.test / password123
  - Caregiver: david.miller@eldercare.test / password123
  `);
}

// Auto-run if executed directly via `node src/db/seed.js`
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase(true)
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}
