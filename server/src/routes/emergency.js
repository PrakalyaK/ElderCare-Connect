import express from 'express';
import { nanoid } from 'nanoid';
import { eq, and, desc } from 'drizzle-orm';
import { getDb } from '../db/db.js';
import * as schema from '../db/schema.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

// GET /api/profiles/:profileId/emergency - Get complete emergency card and contacts
router.get('/', authenticate, async (req, res) => {
  try {
    const { profileId } = req.params;
    const { db } = await getDb();

    // 1. Profile information
    const [profile] = await db
      .select()
      .from(schema.elderlyProfiles)
      .where(eq(schema.elderlyProfiles.id, profileId));

    if (!profile) return res.status(404).json({ error: 'Profile not found.' });

    // 2. Health details
    let [healthDetails] = await db
      .select()
      .from(schema.healthProfileDetails)
      .where(eq(schema.healthProfileDetails.profileId, profileId));

    if (!healthDetails) {
      healthDetails = {
        allergies: '[]',
        conditions: '[]',
        bloodType: profile.bloodGroup || 'Unknown',
        dnrStatus: 'No DNR on file',
        insuranceProvider: 'None listed',
        insurancePolicyNumber: '',
        preferredHospital: 'Nearest Emergency Room',
      };
    }

    // 3. Emergency contacts
    const contacts = await db
      .select()
      .from(schema.emergencyContacts)
      .where(eq(schema.emergencyContacts.profileId, profileId))
      .orderBy(desc(schema.emergencyContacts.isPrimary));

    // 4. Current active medications list for emergency responders
    const activeMeds = await db
      .select()
      .from(schema.medications)
      .where(
        and(
          eq(schema.medications.profileId, profileId),
          eq(schema.medications.isActive, true)
        )
      );

    return res.json({
      elderlyName: profile.displayName,
      dateOfBirth: profile.dateOfBirth,
      gender: profile.gender,
      bloodGroup: profile.bloodGroup || healthDetails.bloodType,
      primaryPhysician: profile.primaryPhysician,
      physicianPhone: profile.physicianPhone,
      healthDetails: {
        ...healthDetails,
        allergies: JSON.parse(healthDetails.allergies || '[]'),
        conditions: JSON.parse(healthDetails.conditions || '[]'),
      },
      contacts,
      activeMedications: activeMeds.map(m => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        instructions: m.instructions,
      })),
      disclaimer: 'CRITICAL: ElderCare Connect is an assistive management and coordination tool, NOT an emergency medical service. In life-threatening emergencies, immediately dial 911 or your local emergency dispatch.',
    });
  } catch (err) {
    console.error('Fetch emergency details error:', err);
    return res.status(500).json({ error: 'Failed to fetch emergency details.' });
  }
});

// POST /api/profiles/:profileId/emergency/contacts - Add emergency contact
router.post('/contacts', authenticate, async (req, res) => {
  try {
    const { profileId } = req.params;
    const { name, relationship, phone, secondaryPhone, isPrimary, canMakeMedicalDecisions } = req.body;

    if (!name || !relationship || !phone) {
      return res.status(400).json({ error: 'Name, relationship, and phone number are required.' });
    }

    const { db } = await getDb();

    // If marked primary, unset other primary contacts
    if (isPrimary) {
      await db
        .update(schema.emergencyContacts)
        .set({ isPrimary: false })
        .where(eq(schema.emergencyContacts.profileId, profileId));
    }

    const contactId = nanoid();
    const newContact = {
      id: contactId,
      profileId,
      name: name.trim(),
      relationship: relationship.trim(),
      phone: phone.trim(),
      secondaryPhone: secondaryPhone?.trim() || null,
      isPrimary: Boolean(isPrimary),
      canMakeMedicalDecisions: Boolean(canMakeMedicalDecisions),
      createdAt: new Date(),
    };

    await db.insert(schema.emergencyContacts).values(newContact);

    // Audit log
    await db.insert(schema.activityLogs).values({
      id: nanoid(),
      profileId,
      actorUserId: req.user.id,
      actorName: req.user.fullName,
      actorRole: req.user.role,
      action: 'EMERGENCY_CONTACT_ADDED',
      details: `${req.user.fullName} added emergency contact ${newContact.name} (${newContact.relationship}).`,
    });

    return res.status(201).json({ message: 'Emergency contact added.', contact: newContact });
  } catch (err) {
    console.error('Add contact error:', err);
    return res.status(500).json({ error: 'Failed to add emergency contact.' });
  }
});

// PUT /api/profiles/:profileId/emergency/contacts/:contactId - Update contact
router.put('/contacts/:contactId', authenticate, async (req, res) => {
  try {
    const { profileId, contactId } = req.params;
    const { name, relationship, phone, secondaryPhone, isPrimary, canMakeMedicalDecisions } = req.body;
    const { db } = await getDb();

    if (isPrimary) {
      await db
        .update(schema.emergencyContacts)
        .set({ isPrimary: false })
        .where(eq(schema.emergencyContacts.profileId, profileId));
    }

    const updated = {
      name: name?.trim(),
      relationship: relationship?.trim(),
      phone: phone?.trim(),
      secondaryPhone: secondaryPhone !== undefined ? secondaryPhone?.trim() : undefined,
      isPrimary: isPrimary !== undefined ? Boolean(isPrimary) : undefined,
      canMakeMedicalDecisions: canMakeMedicalDecisions !== undefined ? Boolean(canMakeMedicalDecisions) : undefined,
    };

    await db
      .update(schema.emergencyContacts)
      .set(updated)
      .where(
        and(
          eq(schema.emergencyContacts.id, contactId),
          eq(schema.emergencyContacts.profileId, profileId)
        )
      );

    return res.json({ message: 'Contact updated successfully.' });
  } catch (err) {
    console.error('Update contact error:', err);
    return res.status(500).json({ error: 'Failed to update emergency contact.' });
  }
});

// DELETE /api/profiles/:profileId/emergency/contacts/:contactId - Delete contact
router.delete('/contacts/:contactId', authenticate, async (req, res) => {
  try {
    const { profileId, contactId } = req.params;
    const { db } = await getDb();

    await db
      .delete(schema.emergencyContacts)
      .where(
        and(
          eq(schema.emergencyContacts.id, contactId),
          eq(schema.emergencyContacts.profileId, profileId)
        )
      );

    return res.json({ message: 'Contact removed.' });
  } catch (err) {
    console.error('Delete contact error:', err);
    return res.status(500).json({ error: 'Failed to remove contact.' });
  }
});

// PUT /api/profiles/:profileId/emergency/details - Update allergies, conditions, insurance
router.put('/details', authenticate, async (req, res) => {
  try {
    const { profileId } = req.params;
    const {
      allergies,
      conditions,
      bloodType,
      dnrStatus,
      insuranceProvider,
      insurancePolicyNumber,
      preferredHospital,
    } = req.body;

    const { db } = await getDb();

    const [existing] = await db
      .select()
      .from(schema.healthProfileDetails)
      .where(eq(schema.healthProfileDetails.profileId, profileId));

    const updatedData = {
      allergies: allergies ? JSON.stringify(allergies) : (existing?.allergies || '[]'),
      conditions: conditions ? JSON.stringify(conditions) : (existing?.conditions || '[]'),
      bloodType: bloodType ?? existing?.bloodType,
      dnrStatus: dnrStatus ?? existing?.dnrStatus,
      insuranceProvider: insuranceProvider !== undefined ? insuranceProvider : existing?.insuranceProvider,
      insurancePolicyNumber: insurancePolicyNumber !== undefined ? insurancePolicyNumber : existing?.insurancePolicyNumber,
      preferredHospital: preferredHospital !== undefined ? preferredHospital : existing?.preferredHospital,
      updatedAt: new Date(),
    };

    if (existing) {
      await db
        .update(schema.healthProfileDetails)
        .set(updatedData)
        .where(eq(schema.healthProfileDetails.id, existing.id));
    } else {
      await db.insert(schema.healthProfileDetails).values({
        id: nanoid(),
        profileId,
        ...updatedData,
      });
    }

    // Also sync bloodGroup to elderlyProfiles if updated
    if (bloodType) {
      await db
        .update(schema.elderlyProfiles)
        .set({ bloodGroup: bloodType })
        .where(eq(schema.elderlyProfiles.id, profileId));
    }

    // Audit log
    await db.insert(schema.activityLogs).values({
      id: nanoid(),
      profileId,
      actorUserId: req.user.id,
      actorName: req.user.fullName,
      actorRole: req.user.role,
      action: 'HEALTH_DETAILS_UPDATED',
      details: `${req.user.fullName} updated emergency health profile, allergies, and medical conditions.`,
    });

    return res.json({ message: 'Emergency medical details updated successfully.' });
  } catch (err) {
    console.error('Update health details error:', err);
    return res.status(500).json({ error: 'Failed to update emergency health details.' });
  }
});

export default router;
