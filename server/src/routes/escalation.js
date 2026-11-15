import express from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { getDb } from '../db/db.js';
import * as schema from '../db/schema.js';
import { authenticate } from '../middleware/auth.js';
import { executeTier1Escalation, executeTier2Escalation } from '../services/escalationEngine.js';

const router = express.Router({ mergeParams: true });

// GET /api/profiles/:profileId/escalation/status - View escalation status of today's doses
router.get('/status', authenticate, async (req, res) => {
  try {
    const { profileId } = req.params;
    const { db } = await getDb();

    const todayStr = new Date().toISOString().split('T')[0];

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
          eq(schema.medicationLogs.scheduledDate, todayStr)
        )
      )
      .orderBy(schema.medicationLogs.scheduledTime);

    const items = logs.map(({ log, medication }) => ({
      logId: log.id,
      medicationName: medication.name,
      dosage: medication.dosage,
      scheduledTime: log.scheduledTime,
      status: log.status,
      escalationLevel: log.escalationLevel,
      escalationNotifiedAt: log.escalationNotifiedAt,
    }));

    return res.json({
      date: todayStr,
      items,
      workflowSteps: [
        { tier: 0, label: 'Scheduled / Pending', desc: 'Medication dose awaiting confirmation at scheduled time' },
        { tier: 1, label: 'Elderly Gentle Reminder', desc: '15+ minutes overdue: In-app prompt and reminder email sent directly to elderly user' },
        { tier: 2, label: 'Caregiver Escalated Alert', desc: '45+ minutes unconfirmed: Marked missed and urgent escalation alert dispatched to authorized care circle' },
      ],
    });
  } catch (err) {
    console.error('Escalation status error:', err);
    return res.status(500).json({ error: 'Failed to fetch escalation status.' });
  }
});

// POST /api/profiles/:profileId/escalation/simulate - Advance escalation for demo/testing
router.post('/simulate', authenticate, async (req, res) => {
  try {
    const { profileId } = req.params;
    const { logId, targetLevel } = req.body;

    if (!logId || targetLevel === undefined) {
      return res.status(400).json({ error: 'logId and targetLevel (0, 1, or 2) are required.' });
    }

    const level = parseInt(targetLevel, 10);
    const { db } = await getDb();

    const [profile] = await db
      .select()
      .from(schema.elderlyProfiles)
      .where(eq(schema.elderlyProfiles.id, profileId));

    if (!profile) return res.status(404).json({ error: 'Profile not found.' });

    const [logRecord] = await db
      .select({
        log: schema.medicationLogs,
        medication: schema.medications,
      })
      .from(schema.medicationLogs)
      .innerJoin(schema.medications, eq(schema.medicationLogs.medicationId, schema.medications.id))
      .where(
        and(
          eq(schema.medicationLogs.id, logId),
          eq(schema.medicationLogs.profileId, profileId)
        )
      );

    if (!logRecord) {
      return res.status(404).json({ error: 'Dose log not found.' });
    }

    if (level === 0) {
      // Reset back to pending / level 0
      await db
        .update(schema.medicationLogs)
        .set({
          status: 'pending',
          escalationLevel: 0,
          escalationNotifiedAt: null,
          recordedAt: null,
          recordedByName: null,
          recordedByUserId: null,
        })
        .where(eq(schema.medicationLogs.id, logId));

      return res.json({
        message: 'Dose reset to Level 0 (Pending).',
        newLevel: 0,
        status: 'pending',
      });
    }

    if (level === 1) {
      await executeTier1Escalation(db, profile, logRecord.medication, logRecord.log, 15);
      return res.json({
        message: 'Simulated 15-minute delay: Tier 1 Elderly notification and email dispatched.',
        newLevel: 1,
        status: 'pending',
      });
    }

    if (level === 2) {
      await executeTier2Escalation(db, profile, logRecord.medication, logRecord.log, 50);
      return res.json({
        message: 'Simulated 50-minute delay: Tier 2 Caregiver alert and escalation emails dispatched to care circle.',
        newLevel: 2,
        status: 'missed',
      });
    }

    return res.status(400).json({ error: 'Invalid targetLevel. Must be 0, 1, or 2.' });
  } catch (err) {
    console.error('Simulate escalation error:', err);
    return res.status(500).json({ error: 'Failed to simulate escalation.' });
  }
});

export default router;
