import express from 'express';
import { nanoid } from 'nanoid';
import { eq, and, sql } from 'drizzle-orm';
import { getDb } from '../db/db.js';
import * as schema from '../db/schema.js';
import { authenticate } from '../middleware/auth.js';
import { sendEmail } from '../services/mailer.js';

const router = express.Router({ mergeParams: true });

// GET /api/profiles/:profileId/inventory - List inventory items with stock status
router.get('/', authenticate, async (req, res) => {
  try {
    const { profileId } = req.params;
    const { db } = await getDb();

    const items = await db
      .select({
        inventory: schema.medicineInventory,
        medication: schema.medications,
      })
      .from(schema.medicineInventory)
      .innerJoin(schema.medications, eq(schema.medicineInventory.medicationId, schema.medications.id))
      .where(eq(schema.medicineInventory.profileId, profileId));

    const todayStr = new Date().toISOString().split('T')[0];
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    const in30DaysStr = in30Days.toISOString().split('T')[0];

    const formatted = items.map(({ inventory, medication }) => {
      const isLowStock = inventory.currentQuantity <= inventory.lowStockThreshold;
      const isExpired = inventory.expiryDate ? inventory.expiryDate < todayStr : false;
      const isExpiringSoon = inventory.expiryDate ? (inventory.expiryDate >= todayStr && inventory.expiryDate <= in30DaysStr) : false;

      return {
        id: inventory.id,
        medicationId: medication.id,
        medicationName: medication.name,
        dosage: medication.dosage,
        frequency: medication.frequency,
        currentQuantity: inventory.currentQuantity,
        unit: inventory.unit,
        lowStockThreshold: inventory.lowStockThreshold,
        expiryDate: inventory.expiryDate,
        lastRestockedAt: inventory.lastRestockedAt,
        isLowStock,
        isExpired,
        isExpiringSoon,
      };
    });

    const lowStockCount = formatted.filter(i => i.isLowStock).length;
    const expiringSoonCount = formatted.filter(i => i.isExpiringSoon || i.isExpired).length;

    return res.json({
      inventory: formatted,
      summary: {
        totalItems: formatted.length,
        lowStockCount,
        expiringSoonCount,
      },
    });
  } catch (err) {
    console.error('Fetch inventory error:', err);
    return res.status(500).json({ error: 'Failed to fetch medicine inventory.' });
  }
});

// POST /api/profiles/:profileId/inventory/:inventoryId/restock - Restock medicine
router.post('/:inventoryId/restock', authenticate, async (req, res) => {
  try {
    const { profileId, inventoryId } = req.params;
    const { quantityToAdd, newExpiryDate } = req.body;

    const addCount = parseInt(quantityToAdd, 10);
    if (isNaN(addCount) || addCount <= 0) {
      return res.status(400).json({ error: 'Please enter a valid positive quantity to add.' });
    }

    const { db } = await getDb();

    const [item] = await db
      .select({
        inventory: schema.medicineInventory,
        medication: schema.medications,
      })
      .from(schema.medicineInventory)
      .innerJoin(schema.medications, eq(schema.medicineInventory.medicationId, schema.medications.id))
      .where(
        and(
          eq(schema.medicineInventory.id, inventoryId),
          eq(schema.medicineInventory.profileId, profileId)
        )
      );

    if (!item) {
      return res.status(404).json({ error: 'Inventory record not found.' });
    }

    const newQuantity = item.inventory.currentQuantity + addCount;
    const updateData = {
      currentQuantity: newQuantity,
      lastRestockedAt: new Date(),
      updatedAt: new Date(),
    };

    if (newExpiryDate) {
      updateData.expiryDate = newExpiryDate;
    }

    await db
      .update(schema.medicineInventory)
      .set(updateData)
      .where(eq(schema.medicineInventory.id, inventoryId));

    // Audit log
    await db.insert(schema.activityLogs).values({
      id: nanoid(),
      profileId,
      actorUserId: req.user.id,
      actorName: req.user.fullName,
      actorRole: req.user.role,
      action: 'INVENTORY_RESTOCKED',
      details: `${req.user.fullName} restocked ${addCount} ${item.inventory.unit} of "${item.medication.name}". New total: ${newQuantity} ${item.inventory.unit}.`,
    });

    return res.json({
      message: `Restocked ${addCount} ${item.inventory.unit} successfully.`,
      newQuantity,
    });
  } catch (err) {
    console.error('Restock error:', err);
    return res.status(500).json({ error: 'Failed to update stock.' });
  }
});

// PUT /api/profiles/:profileId/inventory/:inventoryId - Update inventory thresholds
router.put('/:inventoryId', authenticate, async (req, res) => {
  try {
    const { profileId, inventoryId } = req.params;
    const { currentQuantity, lowStockThreshold, unit, expiryDate } = req.body;
    const { db } = await getDb();

    const [existing] = await db
      .select()
      .from(schema.medicineInventory)
      .where(
        and(
          eq(schema.medicineInventory.id, inventoryId),
          eq(schema.medicineInventory.profileId, profileId)
        )
      );

    if (!existing) return res.status(404).json({ error: 'Inventory record not found.' });

    const updated = {
      currentQuantity: currentQuantity !== undefined ? parseInt(currentQuantity, 10) : existing.currentQuantity,
      lowStockThreshold: lowStockThreshold !== undefined ? parseInt(lowStockThreshold, 10) : existing.lowStockThreshold,
      unit: unit ?? existing.unit,
      expiryDate: expiryDate !== undefined ? expiryDate : existing.expiryDate,
      updatedAt: new Date(),
    };

    await db
      .update(schema.medicineInventory)
      .set(updated)
      .where(eq(schema.medicineInventory.id, inventoryId));

    return res.json({ message: 'Inventory item updated.', inventory: updated });
  } catch (err) {
    console.error('Update inventory error:', err);
    return res.status(500).json({ error: 'Failed to update inventory.' });
  }
});

export default router;
