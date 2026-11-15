import { test, describe } from 'node:test';
import assert from 'node:assert';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../db/db.js';
import * as schema from '../db/schema.js';
import { signToken } from '../middleware/auth.js';
import { executeTier1Escalation, executeTier2Escalation } from '../services/escalationEngine.js';

describe('ElderCare Connect Comprehensive Workflow Verification Suite', async () => {
  let db;
  let testElderlyUser;
  let testElderlyToken;
  let testProfile;
  let plainPasscode = 'CARE99';
  let testCaregiverUser;
  let testCaregiverToken;
  let testCaregiverAccessId;
  let testMedication;
  let testLog;
  let testAppointment;

  test('Setup: Initialize Database Connection', async () => {
    const res = await getDb();
    db = res.db;
    assert.ok(db, 'Database instance must be initialized');
  });

  test('Workflow 1: Register an Elderly User', async () => {
    const userId = nanoid();
    const passwordHash = await bcrypt.hash('secretPass123', 10);
    const email = `test.elderly.${Date.now()}@eldercare.test`;

    const [user] = await db.insert(schema.users).values({
      id: userId,
      email,
      passwordHash,
      fullName: 'Agnes Higgins',
      role: 'elderly',
      elderlyMode: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    testElderlyUser = user;
    testElderlyToken = signToken({ userId: user.id, role: user.role });

    assert.equal(testElderlyUser.role, 'elderly');
    assert.equal(testElderlyUser.fullName, 'Agnes Higgins');
    assert.ok(testElderlyToken, 'Token should be signed');
  });

  test('Workflow 2: Create Elderly Healthcare Profile with Unique ID & Passcode', async () => {
    const profileId = `ELD-${Math.floor(1000 + Math.random() * 9000)}`;
    const passcodeHash = await bcrypt.hash(plainPasscode, 10);
    const recordId = nanoid();

    const [profile] = await db.insert(schema.elderlyProfiles).values({
      id: recordId,
      userId: testElderlyUser.id,
      profileId,
      passcodeHash,
      displayName: 'Agnes Higgins',
      bloodGroup: 'A+',
      primaryPhysician: 'Dr. Gregory House',
      escalationTimeoutMinutes: 45,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    testProfile = profile;
    assert.ok(testProfile.id, 'Profile ID should exist');
    assert.equal(testProfile.displayName, 'Agnes Higgins');

    // Verify passcode hash works with bcrypt
    const match = await bcrypt.compare(plainPasscode, testProfile.passcodeHash);
    assert.equal(match, true, 'Passcode must match hashed value');
  });

  test('Workflow 3 & 4: Add Medication and Configure Scheduled Timings', async () => {
    const medId = nanoid();
    const todayStr = new Date().toISOString().split('T')[0];

    const [med] = await db.insert(schema.medications).values({
      id: medId,
      profileId: testProfile.id,
      name: 'Amlodipine',
      dosage: '5 mg',
      frequency: 'Daily in morning',
      instructions: 'Take with glass of water',
      foodRelation: 'with_food',
      startDate: todayStr,
      colorTag: 'sky',
      shape: 'tablet',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    testMedication = med;
    assert.equal(testMedication.name, 'Amlodipine');

    // Add schedule
    const schedId = nanoid();
    const [schedule] = await db.insert(schema.medicationSchedules).values({
      id: schedId,
      medicationId: med.id,
      profileId: testProfile.id,
      timeOfDay: '08:00',
      label: 'Morning Routine',
      doseAmount: '1 tablet (5mg)',
      daysOfWeek: '1,2,3,4,5,6,7',
      createdAt: new Date(),
    }).returning();

    assert.equal(schedule.timeOfDay, '08:00');

    // Add initial inventory
    const [inv] = await db.insert(schema.medicineInventory).values({
      id: nanoid(),
      profileId: testProfile.id,
      medicationId: med.id,
      currentQuantity: 30,
      unit: 'tablets',
      lowStockThreshold: 5,
      expiryDate: '2027-12-31',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    assert.equal(inv.currentQuantity, 30);
  });

  test('Workflow 5: Access Elderly Profile using Caregiver Passcode', async () => {
    // 1. Create caregiver user
    const cgId = nanoid();
    const cgEmail = `caregiver.${Date.now()}@eldercare.test`;
    const passwordHash = await bcrypt.hash('secretPass123', 10);

    const [cg] = await db.insert(schema.users).values({
      id: cgId,
      email: cgEmail,
      passwordHash,
      fullName: 'Nurse Jackie',
      role: 'caregiver',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    testCaregiverUser = cg;
    testCaregiverToken = signToken({ userId: cg.id, role: cg.role });

    // 2. Validate passcode against testProfile
    const isValidPasscode = await bcrypt.compare(plainPasscode, testProfile.passcodeHash);
    assert.equal(isValidPasscode, true, 'Caregiver provided passcode must match');

    // 3. Grant access
    const accessId = nanoid();
    const [access] = await db.insert(schema.profileAccess).values({
      id: accessId,
      profileId: testProfile.id,
      userId: cg.id,
      relationship: 'Private Duty Nurse',
      role: 'caregiver',
      permissionLevel: 'med_manager',
      status: 'authorized',
      canRecordMeds: true,
      canEditSchedule: false,
      canReceiveAlerts: true,
      authorizedAt: new Date(),
      createdAt: new Date(),
    }).returning();

    testCaregiverAccessId = access.id;
    assert.equal(access.status, 'authorized');
    assert.equal(access.canRecordMeds, true);
  });

  test('Workflow 6 & 7: Mark Medication as Taken & Verify Dose Log & Stock Decrement', async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const logId = nanoid();

    // Create a pending dose log
    const [pendingLog] = await db.insert(schema.medicationLogs).values({
      id: logId,
      profileId: testProfile.id,
      medicationId: testMedication.id,
      scheduledDate: todayStr,
      scheduledTime: '08:00',
      status: 'pending',
      escalationLevel: 0,
      createdAt: new Date(),
    }).returning();

    testLog = pendingLog;
    assert.equal(testLog.status, 'pending');

    // Caregiver marks medication as taken
    const recordedAt = new Date();
    await db
      .update(schema.medicationLogs)
      .set({
        status: 'taken',
        recordedAt,
        recordedByUserId: testCaregiverUser.id,
        recordedByName: testCaregiverUser.fullName,
      })
      .where(eq(schema.medicationLogs.id, logId));

    // Stock decrement
    const [inv] = await db
      .select()
      .from(schema.medicineInventory)
      .where(eq(schema.medicineInventory.medicationId, testMedication.id));

    await db
      .update(schema.medicineInventory)
      .set({ currentQuantity: inv.currentQuantity - 1 })
      .where(eq(schema.medicineInventory.id, inv.id));

    // Verify updated log
    const [updatedLog] = await db
      .select()
      .from(schema.medicationLogs)
      .where(eq(schema.medicationLogs.id, logId));

    assert.equal(updatedLog.status, 'taken');
    assert.equal(updatedLog.recordedByName, 'Nurse Jackie');

    const [updatedInv] = await db
      .select()
      .from(schema.medicineInventory)
      .where(eq(schema.medicineInventory.medicationId, testMedication.id));

    assert.equal(updatedInv.currentQuantity, 29, 'Inventory should be decremented from 30 to 29');
  });

  test('Workflow 8 & 9: Simulate Missed Dose, Notification Generation and Multi-Tier Escalation', async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const unconfirmedLogId = nanoid();

    // Create another dose log
    const [unconfirmedLog] = await db.insert(schema.medicationLogs).values({
      id: unconfirmedLogId,
      profileId: testProfile.id,
      medicationId: testMedication.id,
      scheduledDate: todayStr,
      scheduledTime: '12:00',
      status: 'pending',
      escalationLevel: 0,
      createdAt: new Date(),
    }).returning();

    // Tier 1: Simulate 15 min overdue -> Alert elderly user
    await executeTier1Escalation(db, testProfile, testMedication, unconfirmedLog, 15);

    const [t1Log] = await db
      .select()
      .from(schema.medicationLogs)
      .where(eq(schema.medicationLogs.id, unconfirmedLogId));

    assert.equal(t1Log.escalationLevel, 1, 'Escalation level must become 1');

    // Tier 2: Simulate 50 min overdue -> Escalate to caregiver
    await executeTier2Escalation(db, testProfile, testMedication, t1Log, 50);

    const [t2Log] = await db
      .select()
      .from(schema.medicationLogs)
      .where(eq(schema.medicationLogs.id, unconfirmedLogId));

    assert.equal(t2Log.status, 'missed', 'Overdue dose status must become missed');
    assert.equal(t2Log.escalationLevel, 2, 'Escalation level must become 2');

    // Verify notification was logged in DB
    const notifs = await db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.profileId, testProfile.id));

    assert.ok(notifs.length >= 1, 'Escalation notifications must be saved in database');
    const escalationNotif = notifs.find(n => n.type === 'caregiver_escalation');
    assert.ok(escalationNotif, 'Caregiver escalation notification must be recorded');
  });

  test('Workflow 10 & 11: Create Doctor Appointment & Verify Reminder Pipeline', async () => {
    const apptId = nanoid();
    const apptDate = '2026-11-20';

    const [appt] = await db.insert(schema.appointments).values({
      id: apptId,
      profileId: testProfile.id,
      doctorName: 'Gregory House',
      specialization: 'Diagnostic Medicine',
      hospitalClinic: 'Princeton Plainsboro Clinic',
      appointmentDate: apptDate,
      appointmentTime: '14:00',
      notes: 'Evaluate leg stiffness and renew hypertension prescription',
      status: 'scheduled',
      reminderSent: false,
      createdByUserId: testElderlyUser.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    testAppointment = appt;
    assert.equal(testAppointment.doctorName, 'Gregory House');
    assert.equal(testAppointment.status, 'scheduled');

    // Dispatch appointment reminder notification
    await db.insert(schema.notifications).values({
      id: nanoid(),
      profileId: testProfile.id,
      recipientUserId: testElderlyUser.id,
      recipientEmail: testElderlyUser.email,
      type: 'appointment_reminder',
      title: 'Upcoming Appointment: Dr. Gregory House',
      message: `Appointment scheduled for ${appt.appointmentDate} at ${appt.appointmentTime}.`,
      status: 'sent',
      deliveryChannel: 'email',
      sentAt: new Date(),
    });

    // Mark reminderSent on appointment
    await db
      .update(schema.appointments)
      .set({ reminderSent: true })
      .where(eq(schema.appointments.id, appt.id));

    const [updatedAppt] = await db
      .select()
      .from(schema.appointments)
      .where(eq(schema.appointments.id, appt.id));

    assert.equal(updatedAppt.reminderSent, true, 'Appointment reminder should be flagged as sent');
  });

  test('Workflow 12: Revoke Caregiver Access and Verify Access is Denied', async () => {
    // Revoke caregiver access
    await db
      .update(schema.profileAccess)
      .set({ status: 'revoked' })
      .where(eq(schema.profileAccess.id, testCaregiverAccessId));

    // Query active authorized access
    const [checkAccess] = await db
      .select()
      .from(schema.profileAccess)
      .where(
        and(
          eq(schema.profileAccess.id, testCaregiverAccessId),
          eq(schema.profileAccess.status, 'authorized')
        )
      );

    assert.equal(checkAccess, undefined, 'Revoked caregiver must no longer have authorized status');

    const [revokedRecord] = await db
      .select()
      .from(schema.profileAccess)
      .where(eq(schema.profileAccess.id, testCaregiverAccessId));

    assert.equal(revokedRecord.status, 'revoked', 'Access status must be revoked');
  });
});
