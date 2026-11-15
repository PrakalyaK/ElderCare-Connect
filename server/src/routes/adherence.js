import express from 'express';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { getDb } from '../db/db.js';
import * as schema from '../db/schema.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

// GET /api/profiles/:profileId/adherence - Comprehensive adherence analytics
router.get('/', authenticate, async (req, res) => {
  try {
    const { profileId } = req.params;
    const { db } = await getDb();

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Calculate dates for past 7 days
    const past7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      past7Days.push(d.toISOString().split('T')[0]);
    }
    const sevenDaysAgoStr = past7Days[0];

    // Fetch all logs from past 7 days
    const logs = await db
      .select({
        log: schema.medicationLogs,
        medication: schema.medications,
      })
      .from(schema.medicationLogs)
      .innerJoin(schema.medications, eq(schema.medicationLogs.medicationId, schema.medications.id))
      .where(
        and(
          eq(schema.medicationLogs.profileId, profileId),
          gte(schema.medicationLogs.scheduledDate, sevenDaysAgoStr),
          lte(schema.medicationLogs.scheduledDate, todayStr)
        )
      )
      .orderBy(desc(schema.medicationLogs.scheduledDate), desc(schema.medicationLogs.scheduledTime));

    // 1. Today's Statistics
    const todayLogs = logs.filter(l => l.log.scheduledDate === todayStr);
    const todayTotal = todayLogs.length;
    const todayTaken = todayLogs.filter(l => l.log.status === 'taken').length;
    const todayMissed = todayLogs.filter(l => l.log.status === 'missed').length;
    const todayPending = todayLogs.filter(l => l.log.status === 'pending').length;
    const todaySkipped = todayLogs.filter(l => l.log.status === 'skipped').length;
    const todayAdherencePct = todayTotal > 0 ? Math.round((todayTaken / todayTotal) * 100) : 100;

    // 2. Weekly Statistics (7-day trend for Recharts)
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyTrend = past7Days.map(dateStr => {
      const dayLogs = logs.filter(l => l.log.scheduledDate === dateStr);
      const scheduled = dayLogs.length;
      const taken = dayLogs.filter(l => l.log.status === 'taken').length;
      const missed = dayLogs.filter(l => l.log.status === 'missed').length;
      const skipped = dayLogs.filter(l => l.log.status === 'skipped').length;
      const d = new Date(dateStr);
      const percentage = scheduled > 0 ? Math.round((taken / scheduled) * 100) : 100;

      return {
        date: dateStr,
        day: dayNames[d.getDay()],
        label: `${dayNames[d.getDay()]} (${dateStr.slice(5)})`,
        scheduled,
        taken,
        missed,
        skipped,
        adherenceRate: percentage,
      };
    });

    // 7-day average adherence
    const totalWeeklyScheduled = weeklyTrend.reduce((sum, item) => sum + item.scheduled, 0);
    const totalWeeklyTaken = weeklyTrend.reduce((sum, item) => sum + item.taken, 0);
    const weeklyAveragePct = totalWeeklyScheduled > 0
      ? Math.round((totalWeeklyTaken / totalWeeklyScheduled) * 100)
      : 100;

    // 3. Recent Missed Doses for Caregiver Visibility
    const missedDoses = logs
      .filter(l => l.log.status === 'missed')
      .map(l => ({
        id: l.log.id,
        medicationName: l.medication.name,
        dosage: l.medication.dosage,
        date: l.log.scheduledDate,
        time: l.log.scheduledTime,
        escalationLevel: l.log.escalationLevel,
      }));

    return res.json({
      today: {
        total: todayTotal,
        taken: todayTaken,
        missed: todayMissed,
        pending: todayPending,
        skipped: todaySkipped,
        adherencePercentage: todayAdherencePct,
      },
      weekly: {
        averageAdherence: weeklyAveragePct,
        trend: weeklyTrend,
        totalScheduled: totalWeeklyScheduled,
        totalTaken: totalWeeklyTaken,
      },
      missedDoses,
      safetyAdvisory: {
        importantReminder: 'A reminder delivery is NOT confirmation of intake. Only mark a dose as taken once physically ingested.',
        missedDoseProtocol: 'Never administer an extra or double dose to compensate for a missed dose. Consult your prescribing physician or pharmacist for clinical instructions.',
      },
    });
  } catch (err) {
    console.error('Adherence analytics error:', err);
    return res.status(500).json({ error: 'Failed to calculate medication adherence.' });
  }
});

export default router;
