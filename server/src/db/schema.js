import { pgTable, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

// 1. Users Table
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  fullName: text('full_name').notNull(),
  phone: text('phone'),
  role: text('role').notNull(), // 'elderly' | 'family' | 'caregiver'
  elderlyMode: boolean('elderly_mode').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 2. Elderly Healthcare Profiles
export const elderlyProfiles = pgTable('elderly_profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  profileId: text('profile_id').notNull().unique(), // e.g. "ELD-7842"
  passcodeHash: text('passcode_hash').notNull(), // bcrypt hashed passcode
  displayName: text('display_name').notNull(),
  dateOfBirth: text('date_of_birth'), // YYYY-MM-DD
  gender: text('gender'),
  bloodGroup: text('blood_group'),
  primaryPhysician: text('primary_physician'),
  physicianPhone: text('physician_phone'),
  notes: text('notes'),
  escalationTimeoutMinutes: integer('escalation_timeout_minutes').default(60),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 3. Profile Access Permissions (Care Circle)
export const profileAccess = pgTable('profile_access', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').references(() => elderlyProfiles.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  relationship: text('relationship').notNull(), // e.g., 'Daughter', 'Son', 'Home Nurse', 'Physician'
  role: text('role').notNull(), // 'family' | 'caregiver'
  permissionLevel: text('permission_level').default('full_access').notNull(), // 'full_access' | 'med_manager' | 'view_only'
  status: text('status').default('authorized').notNull(), // 'authorized' | 'revoked' | 'pending'
  canRecordMeds: boolean('can_record_meds').default(true),
  canEditSchedule: boolean('can_edit_schedule').default(false),
  canReceiveAlerts: boolean('can_receive_alerts').default(true),
  authorizedAt: timestamp('authorized_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 4. Medications Table
export const medications = pgTable('medications', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').references(() => elderlyProfiles.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  dosage: text('dosage').notNull(), // e.g. "500 mg"
  frequency: text('frequency').notNull(), // e.g. "Once Daily", "Twice Daily", "Every 8 hours"
  instructions: text('instructions'), // e.g. "Take after breakfast with a full glass of water"
  foodRelation: text('food_relation').default('with_food'), // 'with_food' | 'before_food' | 'after_food' | 'independent'
  startDate: text('start_date').notNull(), // YYYY-MM-DD
  endDate: text('end_date'), // YYYY-MM-DD (nullable)
  colorTag: text('color_tag').default('emerald'), // emerald, sky, amber, rose, purple, indigo
  shape: text('shape').default('tablet'), // tablet, capsule, liquid, injection, inhaler, drops
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 5. Medication Schedules Table
export const medicationSchedules = pgTable('medication_schedules', {
  id: text('id').primaryKey(),
  medicationId: text('medication_id').references(() => medications.id, { onDelete: 'cascade' }).notNull(),
  profileId: text('profile_id').references(() => elderlyProfiles.id, { onDelete: 'cascade' }).notNull(),
  timeOfDay: text('time_of_day').notNull(), // HH:MM (24-hour format, e.g. "08:00")
  label: text('label').notNull(), // "Morning", "Noon", "Evening", "Bedtime"
  doseAmount: text('dose_amount').default('1 dose'),
  daysOfWeek: text('days_of_week').default('1,2,3,4,5,6,7'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 6. Medication Dose Logs (Tracking taken/missed/pending)
export const medicationLogs = pgTable('medication_logs', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').references(() => elderlyProfiles.id, { onDelete: 'cascade' }).notNull(),
  medicationId: text('medication_id').references(() => medications.id, { onDelete: 'cascade' }).notNull(),
  scheduleId: text('schedule_id'),
  scheduledDate: text('scheduled_date').notNull(), // YYYY-MM-DD
  scheduledTime: text('scheduled_time').notNull(), // HH:MM
  status: text('status').default('pending').notNull(), // 'pending' | 'taken' | 'missed' | 'skipped'
  recordedAt: timestamp('recorded_at'),
  recordedByUserId: text('recorded_by_user_id'),
  recordedByName: text('recorded_by_name'),
  notes: text('notes'),
  escalationLevel: integer('escalation_level').default(0), // 0: None, 1: Elderly reminder, 2: Caregiver alert
  escalationNotifiedAt: timestamp('escalation_notified_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 7. Doctor Appointments Table
export const appointments = pgTable('appointments', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').references(() => elderlyProfiles.id, { onDelete: 'cascade' }).notNull(),
  doctorName: text('doctor_name').notNull(),
  specialization: text('specialization').notNull(),
  hospitalClinic: text('hospital_clinic').notNull(),
  location: text('location'),
  appointmentDate: text('appointment_date').notNull(), // YYYY-MM-DD
  appointmentTime: text('appointment_time').notNull(), // HH:MM
  notes: text('notes'),
  status: text('status').default('scheduled').notNull(), // 'scheduled' | 'completed' | 'cancelled'
  reminderSent: boolean('reminder_sent').default(false),
  createdByUserId: text('created_by_user_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 8. Medicine Inventory / Stock Tracking
export const medicineInventory = pgTable('medicine_inventory', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').references(() => elderlyProfiles.id, { onDelete: 'cascade' }).notNull(),
  medicationId: text('medication_id').references(() => medications.id, { onDelete: 'cascade' }).notNull(),
  currentQuantity: integer('current_quantity').default(0).notNull(),
  unit: text('unit').default('tablets').notNull(),
  lowStockThreshold: integer('low_stock_threshold').default(5).notNull(),
  expiryDate: text('expiry_date'), // YYYY-MM-DD
  refillReminderSent: boolean('refill_reminder_sent').default(false),
  lastRestockedAt: timestamp('last_restocked_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 9. Emergency Contacts
export const emergencyContacts = pgTable('emergency_contacts', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').references(() => elderlyProfiles.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  relationship: text('relationship').notNull(),
  phone: text('phone').notNull(),
  secondaryPhone: text('secondary_phone'),
  isPrimary: boolean('is_primary').default(false),
  canMakeMedicalDecisions: boolean('can_make_medical_decisions').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 10. Health Profile Details (Allergies, Conditions, Emergency Info)
export const healthProfileDetails = pgTable('health_profile_details', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').references(() => elderlyProfiles.id, { onDelete: 'cascade' }).notNull().unique(),
  allergies: text('allergies').default('[]'), // JSON array string
  conditions: text('conditions').default('[]'), // JSON array string
  bloodType: text('blood_type'),
  dnrStatus: text('dnr_status').default('No DNR on file'),
  insuranceProvider: text('insurance_provider'),
  insurancePolicyNumber: text('insurance_policy_number'),
  preferredHospital: text('preferred_hospital'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 11. Notifications Log Table
export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').references(() => elderlyProfiles.id, { onDelete: 'cascade' }).notNull(),
  recipientUserId: text('recipient_user_id'),
  recipientEmail: text('recipient_email').notNull(),
  type: text('type').notNull(), // 'medication_reminder' | 'missed_medication' | 'caregiver_escalation' | 'appointment_reminder' | 'inventory_alert' | 'access_granted'
  title: text('title').notNull(),
  message: text('message').notNull(),
  status: text('status').default('sent').notNull(), // 'sent' | 'failed' | 'pending' | 'logged_only'
  deliveryChannel: text('delivery_channel').default('email').notNull(), // 'email' | 'in_app'
  isRead: boolean('is_read').default(false),
  metadata: text('metadata').default('{}'), // JSON
  sentAt: timestamp('sent_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 12. Activity Logs (Audit Trail)
export const activityLogs = pgTable('activity_logs', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').references(() => elderlyProfiles.id, { onDelete: 'cascade' }).notNull(),
  actorUserId: text('actor_user_id'),
  actorName: text('actor_name').notNull(),
  actorRole: text('actor_role').notNull(), // 'elderly' | 'family' | 'caregiver' | 'system'
  action: text('action').notNull(), // 'MEDICATION_TAKEN', 'SCHEDULE_UPDATED', 'APPOINTMENT_ADDED', etc.
  details: text('details').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
