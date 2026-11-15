import cron from 'node-cron';
import { nanoid } from 'nanoid';
import { eq, and, sql } from 'drizzle-orm';
import { getDb } from '../db/db.js';
import * as schema from '../db/schema.js';
import { runEscalationCycle } from './escalationEngine.js';
import {
  sendEmail,
  generateMedicationReminderEmail,
  generateAppointmentReminderEmail,
} from './mailer.js';

let cronJobs = [];

/**
 * Initialize all scheduled background workers
 */
export function initScheduler() {
  console.log('Initializing ElderCare Connect automated background scheduler...');

  // 1. Ensure daily medication logs exist for today (Runs at midnight and on startup)
  generateTodayMedicationLogs().catch(err =>
    console.error('Initial medication logs generation error:', err.message)
  );

  const dailyLogJob = cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Generating daily medication schedule logs...');
    try {
      await generateTodayMedicationLogs();
    } catch (err) {
      console.error('[CRON] Daily logs error:', err.message);
    }
  });
  cronJobs.push(dailyLogJob);

  // 2. Overdue dose checking & Smart Escalation (Runs every minute)
  const escalationJob = cron.schedule('* * * * *', async () => {
    try {
      const results = await runEscalationCycle();
      if (results.length > 0) {
        console.log(`[CRON] Escalation cycle executed. ${results.length} action(s) taken.`);
      }
    } catch (err) {
      console.error('[CRON] Escalation job error:', err.message);
    }
  });
  cronJobs.push(escalationJob);

  // 3. Upcoming Medication Reminders (Runs every 5 minutes)
  const upcomingRemindersJob = cron.schedule('*/5 * * * *', async () => {
    try {
      await processUpcomingMedicationReminders();
    } catch (err) {
      console.error('[CRON] Upcoming medication reminders error:', err.message);
    }
  });
  cronJobs.push(upcomingRemindersJob);

  // 4. Doctor Appointment Reminders (Runs every hour)
  const appointmentJob = cron.schedule('0 * * * *', async () => {
    try {
      await processUpcomingAppointmentReminders();
    } catch (err) {
      console.error('[CRON] Appointment reminders error:', err.message);
    }
  });
  cronJobs.push(appointmentJob);

  console.log('Scheduler initialized successfully with 4 automated routines.');
}

/**
 * Generates pending dose logs for all active medication schedules for today
 */
export async function generateTodayMedicationLogs(targetProfileId = null) {
  const { db } = await getDb();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const currentDayOfWeek = String(today.getDay() === 0 ? 7 : today.getDay()); // 1 (Mon) - 7 (Sun)

  let schedulesQuery = db
    .select({
      schedule: schema.medicationSchedules,
      medication: schema.medications,
      profile: schema.elderlyProfiles,
    })
    .from(schema.medicationSchedules)
    .innerJoin(schema.medications, eq(schema.medicationSchedules.medicationId, schema.medications.id))
    .innerJoin(schema.elderlyProfiles, eq(schema.medicationSchedules.profileId, schema.elderlyProfiles.id))
    .where(eq(schema.medications.isActive, true));

  if (targetProfileId) {
    schedulesQuery = schedulesQuery.where(eq(schema.medicationSchedules.profileId, targetProfileId));
  }

  const activeSchedules = await schedulesQuery;

  for (const { schedule, medication, profile } of activeSchedules) {
    // Check if schedule runs on this day of week
    const days = (schedule.daysOfWeek || '1,2,3,4,5,6,7').split(',').map(d => d.trim());
    if (!days.includes(currentDayOfWeek)) {
      continue;
    }

    // Check if medication is within active date range
    if (medication.startDate && todayStr < medication.startDate) continue;
    if (medication.endDate && todayStr > medication.endDate) continue;

    // Check if a log entry already exists for this schedule today
    const existing = await db
      .select()
      .from(schema.medicationLogs)
      .where(
        and(
          eq(schema.medicationLogs.profileId, profile.id),
          eq(schema.medicationLogs.medicationId, medication.id),
          eq(schema.medicationLogs.scheduledDate, todayStr),
          eq(schema.medicationLogs.scheduledTime, schedule.timeOfDay)
        )
      );

    if (existing.length === 0) {
      await db.insert(schema.medicationLogs).values({
        id: nanoid(),
        profileId: profile.id,
        medicationId: medication.id,
        scheduleId: schedule.id,
        scheduledDate: todayStr,
        scheduledTime: schedule.timeOfDay,
        status: 'pending',
        escalationLevel: 0,
        createdAt: new Date(),
      });
    }
  }
}

/**
 * Dispatch reminders for doses scheduled in the next 15-30 minutes
 */
async function processUpcomingMedicationReminders() {
  const { db } = await getDb();
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentTotalMins = now.getHours() * 60 + now.getMinutes();

  const pendingDoses = await db
    .select({
      log: schema.medicationLogs,
      medication: schema.medications,
      profile: schema.elderlyProfiles,
    })
    .from(schema.medicationLogs)
    .innerJoin(schema.medications, eq(schema.medicationLogs.medicationId, schema.medications.id))
    .innerJoin(schema.elderlyProfiles, eq(schema.medicationLogs.profileId, schema.elderlyProfiles.id))
    .where(
      and(
        eq(schema.medicationLogs.scheduledDate, todayStr),
        eq(schema.medicationLogs.status, 'pending')
      )
    );

  for (const { log, medication, profile } of pendingDoses) {
    const [schedH, schedM] = log.scheduledTime.split(':').map(Number);
    const scheduledTotalMins = schedH * 60 + schedM;
    const diff = scheduledTotalMins - currentTotalMins;

    // Trigger reminder if dose is in 10-25 minutes
    if (diff > 0 && diff <= 25) {
      // Prevent duplicate reminders by checking existing notifications for this log
      const existingNotif = await db
        .select()
        .from(schema.notifications)
        .where(
          and(
            eq(schema.notifications.profileId, profile.id),
            eq(schema.notifications.type, 'medication_reminder'),
            sql`${schema.notifications.metadata}::text LIKE ${`%${log.id}%`}`
          )
        );

      if (existingNotif.length === 0) {
        // Find elderly user and primary caregiver
        const [elderlyUser] = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, profile.userId));

        if (elderlyUser?.email) {
          const emailData = generateMedicationReminderEmail({
            elderlyName: profile.displayName,
            medicationName: medication.name,
            dosage: medication.dosage,
            scheduledTime: log.scheduledTime,
            instructions: medication.instructions,
            foodRelation: medication.foodRelation,
          });

          const mailRes = await sendEmail({
            to: elderlyUser.email,
            subject: emailData.subject,
            html: emailData.html,
          });

          await db.insert(schema.notifications).values({
            id: nanoid(),
            profileId: profile.id,
            recipientUserId: elderlyUser.id,
            recipientEmail: elderlyUser.email,
            type: 'medication_reminder',
            title: `Reminder: ${medication.name} in ${diff} minutes`,
            message: `Your scheduled dose of ${medication.name} (${medication.dosage}) is coming up at ${log.scheduledTime}.`,
            status: mailRes.status || 'sent',
            deliveryChannel: 'email',
            metadata: JSON.stringify({
              logId: log.id,
              medicationId: medication.id,
              previewUrl: mailRes.previewUrl,
            }),
            sentAt: new Date(),
          });
        }
      }
    }
  }
}

/**
 * Dispatch reminders for doctor appointments happening within 24-48 hours
 */
async function processUpcomingAppointmentReminders() {
  const { db } = await getDb();
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const upcomingAppts = await db
    .select({
      appt: schema.appointments,
      profile: schema.elderlyProfiles,
    })
    .from(schema.appointments)
    .innerJoin(schema.elderlyProfiles, eq(schema.appointments.profileId, schema.elderlyProfiles.id))
    .where(
      and(
        eq(schema.appointments.status, 'scheduled'),
        eq(schema.appointments.reminderSent, false),
        sql`${schema.appointments.appointmentDate} IN (${todayStr}, ${tomorrowStr})`
      )
    );

  for (const { appt, profile } of upcomingAppts) {
    const [elderlyUser] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, profile.userId));

    if (elderlyUser?.email) {
      const emailData = generateAppointmentReminderEmail({
        recipientName: elderlyUser.fullName,
        elderlyName: profile.displayName,
        doctorName: appt.doctorName,
        specialization: appt.specialization,
        hospitalClinic: appt.hospitalClinic,
        appointmentDate: appt.appointmentDate,
        appointmentTime: appt.appointmentTime,
        notes: appt.notes,
      });

      const mailRes = await sendEmail({
        to: elderlyUser.email,
        subject: emailData.subject,
        html: emailData.html,
      });

      await db.insert(schema.notifications).values({
        id: nanoid(),
        profileId: profile.id,
        recipientUserId: elderlyUser.id,
        recipientEmail: elderlyUser.email,
        type: 'appointment_reminder',
        title: `Appointment Reminder: Dr. ${appt.doctorName}`,
        message: `Appointment scheduled for ${appt.appointmentDate} at ${appt.appointmentTime} with Dr. ${appt.doctorName} (${appt.hospitalClinic}).`,
        status: mailRes.status || 'sent',
        deliveryChannel: 'email',
        metadata: JSON.stringify({
          appointmentId: appt.id,
          previewUrl: mailRes.previewUrl,
        }),
        sentAt: new Date(),
      });
    }

    // Mark reminder as sent on appointment record
    await db
      .update(schema.appointments)
      .set({ reminderSent: true })
      .where(eq(schema.appointments.id, appt.id));
  }
}
