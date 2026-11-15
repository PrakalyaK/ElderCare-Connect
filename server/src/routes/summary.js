import express from 'express';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../db/db.js';
import * as schema from '../db/schema.js';
import { authenticate } from '../middleware/auth.js';
import { generateTodayMedicationLogs } from '../services/scheduler.js';

const router = express.Router({ mergeParams: true });

// GET /api/profiles/:profileId/daily-summary - Generate plain language daily care briefing
router.get('/', authenticate, async (req, res) => {
  try {
    const { profileId } = req.params;
    const { db } = await getDb();

    await generateTodayMedicationLogs(profileId);

    const [profile] = await db
      .select()
      .from(schema.elderlyProfiles)
      .where(eq(schema.elderlyProfiles.id, profileId));

    if (!profile) return res.status(404).json({ error: 'Profile not found.' });

    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentHour = now.getHours();
    const greeting = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';

    // 1. Today's medication logs
    const todayLogs = await db
      .select({
        log: schema.medicationLogs,
        medication: schema.medications,
      })
      .from(schema.medicationLogs)
      .innerJoin(schema.medications, eq(schema.medicationLogs.medicationId, schema.medications.id))
      .where(
        and(
          eq(schema.medicationLogs.profileId, profileId),
          eq(schema.medicationLogs.scheduledDate, todayStr)
        )
      );

    const taken = todayLogs.filter(l => l.log.status === 'taken');
    const pending = todayLogs.filter(l => l.log.status === 'pending');
    const missed = todayLogs.filter(l => l.log.status === 'missed');

    // 2. Upcoming appointments for today or tomorrow
    const appts = await db
      .select()
      .from(schema.appointments)
      .where(
        and(
          eq(schema.appointments.profileId, profileId),
          eq(schema.appointments.status, 'scheduled')
        )
      );

    const todayAppts = appts.filter(a => a.appointmentDate === todayStr);

    // 3. Low stock inventory alerts
    const inventory = await db
      .select({
        inv: schema.medicineInventory,
        med: schema.medications,
      })
      .from(schema.medicineInventory)
      .innerJoin(schema.medications, eq(schema.medicineInventory.medicationId, schema.medications.id))
      .where(eq(schema.medicineInventory.profileId, profileId));

    const lowStockItems = inventory.filter(i => i.inv.currentQuantity <= i.inv.lowStockThreshold);

    // 4. Construct natural language spoken text & bullet points
    let spokenText = `${greeting}, ${profile.displayName}! `;

    if (todayLogs.length === 0) {
      spokenText += `You have no medications scheduled for today. `;
    } else if (pending.length === 0 && missed.length === 0) {
      spokenText += `Wonderful work! You have taken all ${taken.length} of your medications scheduled for today. `;
    } else {
      spokenText += `Today you have ${todayLogs.length} scheduled medicines. You have taken ${taken.length} so far. `;
      if (pending.length > 0) {
        const nextDose = pending.sort((a, b) => a.log.scheduledTime.localeCompare(b.log.scheduledTime))[0];
        spokenText += `Your next dose is ${nextDose.medication.name} (${nextDose.medication.dosage}) at ${nextDose.log.scheduledTime}. `;
      }
      if (missed.length > 0) {
        spokenText += `Please note: ${missed.length} dose was flagged as unconfirmed. Please check with your care circle. `;
      }
    }

    if (todayAppts.length > 0) {
      const appt = todayAppts[0];
      spokenText += `You have a doctor appointment today with Dr. ${appt.doctorName} at ${appt.appointmentTime} at ${appt.hospitalClinic}. `;
    }

    if (lowStockItems.length > 0) {
      spokenText += `Also, ${lowStockItems.map(i => i.med.name).join(', ')} is running low on stock.`;
    }

    return res.json({
      greeting,
      displayName: profile.displayName,
      spokenText: spokenText.trim(),
      metrics: {
        totalScheduledToday: todayLogs.length,
        takenCount: taken.length,
        pendingCount: pending.length,
        missedCount: missed.length,
        hasAppointmentsToday: todayAppts.length > 0,
        appointmentToday: todayAppts[0] || null,
        lowStockCount: lowStockItems.length,
      },
      takenMedicines: taken.map(t => `${t.medication.name} (${t.log.scheduledTime})`),
      pendingMedicines: pending.map(p => `${p.medication.name} at ${p.log.scheduledTime}`),
      missedMedicines: missed.map(m => `${m.medication.name} (${m.log.scheduledTime})`),
      lowStockList: lowStockItems.map(l => `${l.med.name} (${l.inv.currentQuantity} remaining)`),
    });
  } catch (err) {
    console.error('Daily summary error:', err);
    return res.status(500).json({ error: 'Failed to generate daily care summary.' });
  }
});

export default router;
