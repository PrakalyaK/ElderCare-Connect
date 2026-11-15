import express from 'express';
import { nanoid } from 'nanoid';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { getDb } from '../db/db.js';
import * as schema from '../db/schema.js';
import { authenticate, requireProfileAccess } from '../middleware/auth.js';
import { generateTodayMedicationLogs } from '../services/scheduler.js';

const router = express.Router({ mergeParams: true });

// GET /api/profiles/:profileId/medications - List all medications for this profile
router.get('/', authenticate, async (req, res) => {
  try {
    const { profileId } = req.params;
    const { db } = await getDb();

    // Verify access
    const [profile] = await db
      .select()
      .from(schema.elderlyProfiles)
      .where(eq(schema.elderlyProfiles.id, profileId));

    if (!profile) return res.status(404).json({ error: 'Profile not found.' });

    // Fetch medications
    const meds = await db
      .select()
      .from(schema.medications)
      .where(eq(schema.medications.profileId, profileId))
      .orderBy(desc(schema.medications.createdAt));

    // Fetch schedules for all medications
    const schedules = await db
      .select()
      .from(schema.medicationSchedules)
      .where(eq(schema.medicationSchedules.profileId, profileId));

    // Fetch inventory for all medications
    const inventory = await db
      .select()
      .from(schema.medicineInventory)
      .where(eq(schema.medicineInventory.profileId, profileId));

    // Group schedules and inventory by medicationId
    const medicationsWithDetails = meds.map(med => {
      const medSchedules = schedules.filter(s => s.medicationId === med.id);
      const medInventory = inventory.find(i => i.medicationId === med.id);
      return {
        ...med,
        schedules: medSchedules,
        inventory: medInventory || null,
      };
    });

    return res.json({ medications: medicationsWithDetails });
  } catch (err) {
    console.error('Fetch medications error:', err);
    return res.status(500).json({ error: 'Failed to fetch medications.' });
  }
});

// POST /api/profiles/:profileId/medications - Add a new medication with schedules and optional inventory
router.post('/', authenticate, async (req, res) => {
  try {
    const { profileId } = req.params;
    const {
      name,
      dosage,
      frequency,
      instructions,
      foodRelation,
      startDate,
      endDate,
      colorTag,
      shape,
      schedules, // array of { timeOfDay: "08:00", label: "Morning", doseAmount: "1 tablet" }
      initialQuantity,
      lowStockThreshold,
      expiryDate,
      unit,
    } = req.body;

    if (!name || !dosage || !frequency || !startDate) {
      return res.status(400).json({
        error: 'Medication name, dosage, frequency, and start date are required.',
      });
    }

    const { db } = await getDb();
    const medId = nanoid();

    const newMed = {
      id: medId,
      profileId,
      name: name.trim(),
      dosage: dosage.trim(),
      frequency: frequency.trim(),
      instructions: instructions?.trim() || null,
      foodRelation: foodRelation || 'with_food',
      startDate,
      endDate: endDate || null,
      colorTag: colorTag || 'emerald',
      shape: shape || 'tablet',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(schema.medications).values(newMed);

    // Insert schedules
    const insertedSchedules = [];
    if (Array.isArray(schedules) && schedules.length > 0) {
      for (const item of schedules) {
        if (item.timeOfDay) {
          const scheduleRecord = {
            id: nanoid(),
            medicationId: medId,
            profileId,
            timeOfDay: item.timeOfDay.trim(),
            label: item.label?.trim() || 'Daily Dose',
            doseAmount: item.doseAmount?.trim() || '1 dose',
            daysOfWeek: item.daysOfWeek || '1,2,3,4,5,6,7',
            createdAt: new Date(),
          };
          await db.insert(schema.medicationSchedules).values(scheduleRecord);
          insertedSchedules.push(scheduleRecord);
        }
      }
    } else {
      // Default morning schedule if none provided
      const defaultSchedule = {
        id: nanoid(),
        medicationId: medId,
        profileId,
        timeOfDay: '08:00',
        label: 'Morning',
        doseAmount: '1 dose',
        daysOfWeek: '1,2,3,4,5,6,7',
        createdAt: new Date(),
      };
      await db.insert(schema.medicationSchedules).values(defaultSchedule);
      insertedSchedules.push(defaultSchedule);
    }

    // Insert inventory record
    const inventoryRecord = {
      id: nanoid(),
      profileId,
      medicationId: medId,
      currentQuantity: initialQuantity ? parseInt(initialQuantity, 10) : 30,
      unit: unit || 'tablets',
      lowStockThreshold: lowStockThreshold ? parseInt(lowStockThreshold, 10) : 5,
      expiryDate: expiryDate || null,
      refillReminderSent: false,
      lastRestockedAt: new Date(),
      updatedAt: new Date(),
    };
    await db.insert(schema.medicineInventory).values(inventoryRecord);

    // Generate today's dose log for the newly added medication immediately
    await generateTodayMedicationLogs(profileId);

    // Audit activity log
    await db.insert(schema.activityLogs).values({
      id: nanoid(),
      profileId,
      actorUserId: req.user.id,
      actorName: req.user.fullName,
      actorRole: req.user.role,
      action: 'MEDICATION_ADDED',
      details: `${req.user.fullName} added medication "${newMed.name}" (${newMed.dosage}, ${newMed.frequency}).`,
    });

    return res.status(201).json({
      message: 'Medication added successfully.',
      medication: {
        ...newMed,
        schedules: insertedSchedules,
        inventory: inventoryRecord,
      },
    });
  } catch (err) {
    console.error('Add medication error:', err);
    return res.status(500).json({ error: 'Failed to add medication.' });
  }
});

// PUT /api/profiles/:profileId/medications/:medicationId - Update medication details
router.put('/:medicationId', authenticate, async (req, res) => {
  try {
    const { profileId, medicationId } = req.params;
    const {
      name,
      dosage,
      frequency,
      instructions,
      foodRelation,
      startDate,
      endDate,
      colorTag,
      shape,
      isActive,
      schedules,
    } = req.body;

    const { db } = await getDb();

    const [existing] = await db
      .select()
      .from(schema.medications)
      .where(
        and(
          eq(schema.medications.id, medicationId),
          eq(schema.medications.profileId, profileId)
        )
      );

    if (!existing) {
      return res.status(404).json({ error: 'Medication not found.' });
    }

    const updatedMed = {
      name: name?.trim() ?? existing.name,
      dosage: dosage?.trim() ?? existing.dosage,
      frequency: frequency?.trim() ?? existing.frequency,
      instructions: instructions !== undefined ? instructions?.trim() : existing.instructions,
      foodRelation: foodRelation ?? existing.foodRelation,
      startDate: startDate ?? existing.startDate,
      endDate: endDate !== undefined ? endDate : existing.endDate,
      colorTag: colorTag ?? existing.colorTag,
      shape: shape ?? existing.shape,
      isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      updatedAt: new Date(),
    };

    await db
      .update(schema.medications)
      .set(updatedMed)
      .where(eq(schema.medications.id, medicationId));

    // Update schedules if provided
    if (Array.isArray(schedules)) {
      // Remove old schedules and insert new
      await db
        .delete(schema.medicationSchedules)
        .where(eq(schema.medicationSchedules.medicationId, medicationId));

      for (const item of schedules) {
        if (item.timeOfDay) {
          await db.insert(schema.medicationSchedules).values({
            id: nanoid(),
            medicationId,
            profileId,
            timeOfDay: item.timeOfDay.trim(),
            label: item.label?.trim() || 'Dose',
            doseAmount: item.doseAmount?.trim() || '1 dose',
            daysOfWeek: item.daysOfWeek || '1,2,3,4,5,6,7',
            createdAt: new Date(),
          });
        }
      }
      await generateTodayMedicationLogs(profileId);
    }

    // Audit activity log
    await db.insert(schema.activityLogs).values({
      id: nanoid(),
      profileId,
      actorUserId: req.user.id,
      actorName: req.user.fullName,
      actorRole: req.user.role,
      action: 'MEDICATION_UPDATED',
      details: `${req.user.fullName} updated details for medication "${updatedMed.name}".`,
    });

    return res.json({ message: 'Medication updated successfully.', medication: updatedMed });
  } catch (err) {
    console.error('Update medication error:', err);
    return res.status(500).json({ error: 'Failed to update medication.' });
  }
});

// DELETE /api/profiles/:profileId/medications/:medicationId - Delete or deactivate medication
router.delete('/:medicationId', authenticate, async (req, res) => {
  try {
    const { profileId, medicationId } = req.params;
    const { db } = await getDb();

    const [existing] = await db
      .select()
      .from(schema.medications)
      .where(
        and(
          eq(schema.medications.id, medicationId),
          eq(schema.medications.profileId, profileId)
        )
      );

    if (!existing) {
      return res.status(404).json({ error: 'Medication not found.' });
    }

    await db
      .delete(schema.medications)
      .where(eq(schema.medications.id, medicationId));

    // Audit activity log
    await db.insert(schema.activityLogs).values({
      id: nanoid(),
      profileId,
      actorUserId: req.user.id,
      actorName: req.user.fullName,
      actorRole: req.user.role,
      action: 'MEDICATION_DELETED',
      details: `${req.user.fullName} removed medication "${existing.name}".`,
    });

    return res.json({ message: 'Medication deleted successfully.' });
  } catch (err) {
    console.error('Delete medication error:', err);
    return res.status(500).json({ error: 'Failed to delete medication.' });
  }
});

// GET /api/profiles/:profileId/today-schedule - Today's full medication routine timeline
router.get('/today-schedule', authenticate, async (req, res) => {
  try {
    const { profileId } = req.params;
    const { db } = await getDb();

    // Ensure today's logs are populated
    await generateTodayMedicationLogs(profileId);

    const todayStr = new Date().toISOString().split('T')[0];

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

    // Sort by scheduledTime ascending
    const sorted = todayLogs
      .map(item => ({
        id: item.log.id,
        medicationId: item.medication.id,
        name: item.medication.name,
        dosage: item.medication.dosage,
        instructions: item.medication.instructions,
        foodRelation: item.medication.foodRelation,
        colorTag: item.medication.colorTag,
        shape: item.medication.shape,
        scheduledDate: item.log.scheduledDate,
        scheduledTime: item.log.scheduledTime,
        status: item.log.status,
        recordedAt: item.log.recordedAt,
        recordedByName: item.log.recordedByName,
        escalationLevel: item.log.escalationLevel,
        notes: item.log.notes,
      }))
      .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

    // Determine next upcoming dose
    const now = new Date();
    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const nextUpcoming = sorted.find(d => d.status === 'pending' && d.scheduledTime >= currentHHMM)
      || sorted.find(d => d.status === 'pending')
      || null;

    return res.json({
      date: todayStr,
      schedule: sorted,
      nextUpcoming,
      summary: {
        total: sorted.length,
        taken: sorted.filter(s => s.status === 'taken').length,
        pending: sorted.filter(s => s.status === 'pending').length,
        missed: sorted.filter(s => s.status === 'missed').length,
        skipped: sorted.filter(s => s.status === 'skipped').length,
      },
    });
  } catch (err) {
    console.error('Today schedule error:', err);
    return res.status(500).json({ error: 'Failed to load today schedule.' });
  }
});

// POST /api/profiles/:profileId/logs/:logId/mark-taken - Mark medication dose as taken
router.post('/logs/:logId/mark-taken', authenticate, async (req, res) => {
  try {
    const { profileId, logId } = req.params;
    const { notes } = req.body;
    const { db } = await getDb();

    // Verify dose log belongs to this profile
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
      return res.status(404).json({ error: 'Medication dose record not found.' });
    }

    const recordedAt = new Date();
    await db
      .update(schema.medicationLogs)
      .set({
        status: 'taken',
        recordedAt,
        recordedByUserId: req.user.id,
        recordedByName: req.user.fullName,
        notes: notes || null,
        escalationLevel: 0, // Reset any escalation
      })
      .where(eq(schema.medicationLogs.id, logId));

    // Decrement inventory stock by 1
    const [inventoryItem] = await db
      .select()
      .from(schema.medicineInventory)
      .where(
        and(
          eq(schema.medicineInventory.profileId, profileId),
          eq(schema.medicineInventory.medicationId, logRecord.medication.id)
        )
      );

    let stockAlert = false;
    if (inventoryItem && inventoryItem.currentQuantity > 0) {
      const newQty = inventoryItem.currentQuantity - 1;
      await db
        .update(schema.medicineInventory)
        .set({
          currentQuantity: newQty,
          updatedAt: new Date(),
        })
        .where(eq(schema.medicineInventory.id, inventoryItem.id));

      if (newQty <= inventoryItem.lowStockThreshold) {
        stockAlert = true;
        // Create in-app low stock notification
        await db.insert(schema.notifications).values({
          id: nanoid(),
          profileId,
          recipientUserId: req.user.id,
          recipientEmail: req.user.email,
          type: 'inventory_alert',
          title: `Low Medicine Stock: ${logRecord.medication.name}`,
          message: `${logRecord.medication.name} is running low (${newQty} ${inventoryItem.unit} remaining). Please refill soon.`,
          status: 'sent',
          deliveryChannel: 'in_app',
          sentAt: new Date(),
        });
      }
    }

    // Audit activity log
    await db.insert(schema.activityLogs).values({
      id: nanoid(),
      profileId,
      actorUserId: req.user.id,
      actorName: req.user.fullName,
      actorRole: req.user.role,
      action: 'MEDICATION_TAKEN',
      details: `${req.user.fullName} confirmed dose taken for "${logRecord.medication.name}" (${logRecord.medication.dosage}) at ${recordedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
    });

    return res.json({
      message: 'Medication successfully marked as taken.',
      log: {
        id: logId,
        status: 'taken',
        recordedAt,
        recordedByName: req.user.fullName,
      },
      stockAlert,
    });
  } catch (err) {
    console.error('Mark taken error:', err);
    return res.status(500).json({ error: 'Failed to mark medication as taken.' });
  }
});

// POST /api/profiles/:profileId/logs/:logId/mark-skipped - Mark medication dose as skipped
router.post('/logs/:logId/mark-skipped', authenticate, async (req, res) => {
  try {
    const { profileId, logId } = req.params;
    const { reason } = req.body;
    const { db } = await getDb();

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
      return res.status(404).json({ error: 'Medication dose record not found.' });
    }

    const recordedAt = new Date();
    await db
      .update(schema.medicationLogs)
      .set({
        status: 'skipped',
        recordedAt,
        recordedByUserId: req.user.id,
        recordedByName: req.user.fullName,
        notes: reason || 'Dose skipped',
      })
      .where(eq(schema.medicationLogs.id, logId));

    // Audit activity log
    await db.insert(schema.activityLogs).values({
      id: nanoid(),
      profileId,
      actorUserId: req.user.id,
      actorName: req.user.fullName,
      actorRole: req.user.role,
      action: 'MEDICATION_SKIPPED',
      details: `${req.user.fullName} marked "${logRecord.medication.name}" as skipped (${reason || 'No reason provided'}).`,
    });

    return res.json({
      message: 'Medication marked as skipped.',
      log: { id: logId, status: 'skipped', notes: reason },
    });
  } catch (err) {
    console.error('Mark skipped error:', err);
    return res.status(500).json({ error: 'Failed to update medication status.' });
  }
});

// GET /api/profiles/:profileId/history - Fetch medication history logs with date filters
router.get('/history', authenticate, async (req, res) => {
  try {
    const { profileId } = req.params;
    const { startDate, endDate, status } = req.query;
    const { db } = await getDb();

    let query = db
      .select({
        log: schema.medicationLogs,
        medication: schema.medications,
      })
      .from(schema.medicationLogs)
      .innerJoin(schema.medications, eq(schema.medicationLogs.medicationId, schema.medications.id))
      .where(eq(schema.medicationLogs.profileId, profileId))
      .orderBy(desc(schema.medicationLogs.scheduledDate), desc(schema.medicationLogs.scheduledTime));

    const records = await query;

    let filtered = records;
    if (startDate) {
      filtered = filtered.filter(r => r.log.scheduledDate >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(r => r.log.scheduledDate <= endDate);
    }
    if (status) {
      filtered = filtered.filter(r => r.log.status === status);
    }

    const formatted = filtered.map(r => ({
      id: r.log.id,
      medicationId: r.medication.id,
      name: r.medication.name,
      dosage: r.medication.dosage,
      scheduledDate: r.log.scheduledDate,
      scheduledTime: r.log.scheduledTime,
      status: r.log.status,
      recordedAt: r.log.recordedAt,
      recordedByName: r.log.recordedByName,
      notes: r.log.notes,
      escalationLevel: r.log.escalationLevel,
    }));

    return res.json({ history: formatted });
  } catch (err) {
    console.error('Medication history error:', err);
    return res.status(500).json({ error: 'Failed to fetch medication history.' });
  }
});

export default router;
