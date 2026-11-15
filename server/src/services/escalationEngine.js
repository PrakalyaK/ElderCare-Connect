import { nanoid } from 'nanoid';
import { eq, and, sql, lt, lte, or } from 'drizzle-orm';
import { getDb } from '../db/db.js';
import * as schema from '../db/schema.js';
import {
  sendEmail,
  generateMedicationReminderEmail,
  generateMissedMedicationEmail,
  generateCaregiverEscalationEmail,
} from './mailer.js';

/**
 * Run escalation evaluation across all active elderly profiles or a single profile.
 */
export async function runEscalationCycle(targetProfileId = null) {
  const { db } = await getDb();

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTotalMins = currentHours * 60 + currentMinutes;

  // Fetch profiles to check
  let profileQuery = db.select().from(schema.elderlyProfiles);
  if (targetProfileId) {
    profileQuery = profileQuery.where(eq(schema.elderlyProfiles.id, targetProfileId));
  }
  const profiles = await profileQuery;

  const results = [];

  for (const profile of profiles) {
    // 1. Fetch pending medication logs for today
    const pendingLogs = await db
      .select({
        log: schema.medicationLogs,
        medication: schema.medications,
      })
      .from(schema.medicationLogs)
      .innerJoin(schema.medications, eq(schema.medicationLogs.medicationId, schema.medications.id))
      .where(
        and(
          eq(schema.medicationLogs.profileId, profile.id),
          eq(schema.medicationLogs.scheduledDate, todayStr),
          eq(schema.medicationLogs.status, 'pending')
        )
      );

    for (const { log, medication } of pendingLogs) {
      const [schedH, schedM] = log.scheduledTime.split(':').map(Number);
      const scheduledTotalMins = schedH * 60 + schedM;
      const minsDiff = currentTotalMins - scheduledTotalMins;

      // Tier 1: Overdue by >= 15 minutes, but not yet escalated to Tier 1
      if (minsDiff >= 15 && log.escalationLevel === 0) {
        await executeTier1Escalation(db, profile, medication, log, minsDiff);
        results.push({
          type: 'tier_1_elderly_reminder',
          medication: medication.name,
          profileId: profile.id,
          minutesOverdue: minsDiff,
        });
      }

      // Tier 2: Overdue by >= profile timeout (default 45-60 mins), and currently at Tier 1 (or 0)
      const escalationTimeout = profile.escalationTimeoutMinutes || 45;
      if (minsDiff >= escalationTimeout && log.escalationLevel < 2) {
        await executeTier2Escalation(db, profile, medication, log, minsDiff);
        results.push({
          type: 'tier_2_caregiver_escalated',
          medication: medication.name,
          profileId: profile.id,
          minutesOverdue: minsDiff,
        });
      }
    }
  }

  return results;
}

/**
 * Tier 1: Notify elderly user of unconfirmed medication dose
 */
export async function executeTier1Escalation(db, profile, medication, log, minsDiff) {
  // Update log escalation level
  await db
    .update(schema.medicationLogs)
    .set({
      escalationLevel: 1,
      escalationNotifiedAt: new Date(),
    })
    .where(eq(schema.medicationLogs.id, log.id));

  // Get elderly user info
  const [elderlyUser] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, profile.userId));

  if (elderlyUser?.email) {
    const emailData = generateMissedMedicationEmail({
      elderlyName: profile.displayName,
      medicationName: medication.name,
      dosage: medication.dosage,
      scheduledTime: log.scheduledTime,
    });

    const mailRes = await sendEmail({
      to: elderlyUser.email,
      subject: emailData.subject,
      html: emailData.html,
    });

    // Record notification in DB
    await db.insert(schema.notifications).values({
      id: nanoid(),
      profileId: profile.id,
      recipientUserId: elderlyUser.id,
      recipientEmail: elderlyUser.email,
      type: 'missed_medication',
      title: `Medication Overdue: ${medication.name}`,
      message: `Your ${medication.name} (${medication.dosage}) scheduled for ${log.scheduledTime} has not been recorded. Please mark it as taken once consumed.`,
      status: mailRes.status || 'sent',
      deliveryChannel: 'email',
      metadata: JSON.stringify({
        logId: log.id,
        medicationId: medication.id,
        tier: 1,
        previewUrl: mailRes.previewUrl,
      }),
      sentAt: new Date(),
    });
  }

  // Audit activity log
  await db.insert(schema.activityLogs).values({
    id: nanoid(),
    profileId: profile.id,
    actorUserId: 'system',
    actorName: 'Escalation Engine',
    actorRole: 'system',
    action: 'ESCALATION_TIER_1',
    details: `Tier 1 Reminder dispatched to ${profile.displayName} for ${medication.name} (${minsDiff} mins overdue).`,
  });
}

/**
 * Tier 2: Escalate unconfirmed dose to Care Circle (caregivers and authorized family)
 */
export async function executeTier2Escalation(db, profile, medication, log, minsDiff) {
  // Mark dose as missed and escalationLevel = 2
  await db
    .update(schema.medicationLogs)
    .set({
      status: 'missed',
      escalationLevel: 2,
      escalationNotifiedAt: new Date(),
    })
    .where(eq(schema.medicationLogs.id, log.id));

  // Fetch authorized circle members who can receive alerts
  const authorizedCaregivers = await db
    .select({
      access: schema.profileAccess,
      user: schema.users,
    })
    .from(schema.profileAccess)
    .innerJoin(schema.users, eq(schema.profileAccess.userId, schema.users.id))
    .where(
      and(
        eq(schema.profileAccess.profileId, profile.id),
        eq(schema.profileAccess.status, 'authorized'),
        eq(schema.profileAccess.canReceiveAlerts, true)
      )
    );

  for (const { access, user } of authorizedCaregivers) {
    const emailData = generateCaregiverEscalationEmail({
      caregiverName: user.fullName,
      elderlyName: profile.displayName,
      medicationName: medication.name,
      dosage: medication.dosage,
      scheduledTime: log.scheduledTime,
      minutesOverdue: minsDiff,
    });

    const mailRes = await sendEmail({
      to: user.email,
      subject: emailData.subject,
      html: emailData.html,
    });

    await db.insert(schema.notifications).values({
      id: nanoid(),
      profileId: profile.id,
      recipientUserId: user.id,
      recipientEmail: user.email,
      type: 'caregiver_escalation',
      title: `🚨 Escalation: ${profile.displayName} missed ${medication.name}`,
      message: `${profile.displayName} has not confirmed their ${medication.name} (${medication.dosage}) scheduled for ${log.scheduledTime}. Overdue by ${minsDiff} minutes. Please follow up.`,
      status: mailRes.status || 'sent',
      deliveryChannel: 'email',
      metadata: JSON.stringify({
        logId: log.id,
        medicationId: medication.id,
        tier: 2,
        previewUrl: mailRes.previewUrl,
      }),
      sentAt: new Date(),
    });
  }

  // Audit activity log
  await db.insert(schema.activityLogs).values({
    id: nanoid(),
    profileId: profile.id,
    actorUserId: 'system',
    actorName: 'Escalation Engine',
    actorRole: 'system',
    action: 'ESCALATION_TIER_2',
    details: `Tier 2 Alert: ${medication.name} marked missed and escalated to ${authorizedCaregivers.length} care circle member(s).`,
  });
}
