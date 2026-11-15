import express from 'express';
import { nanoid } from 'nanoid';
import { eq, and, desc } from 'drizzle-orm';
import { getDb } from '../db/db.js';
import * as schema from '../db/schema.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

// GET /api/profiles/:profileId/care-circle - List all circle members and permissions
router.get('/', authenticate, async (req, res) => {
  try {
    const { profileId } = req.params;
    const { db } = await getDb();

    // 1. Fetch profile & owner
    const [profile] = await db
      .select({
        profile: schema.elderlyProfiles,
        user: schema.users,
      })
      .from(schema.elderlyProfiles)
      .innerJoin(schema.users, eq(schema.elderlyProfiles.userId, schema.users.id))
      .where(eq(schema.elderlyProfiles.id, profileId));

    if (!profile) return res.status(404).json({ error: 'Profile not found.' });

    // 2. Fetch authorized/revoked members
    const members = await db
      .select({
        access: schema.profileAccess,
        user: schema.users,
      })
      .from(schema.profileAccess)
      .innerJoin(schema.users, eq(schema.profileAccess.userId, schema.users.id))
      .where(eq(schema.profileAccess.profileId, profileId))
      .orderBy(desc(schema.profileAccess.createdAt));

    // Construct care circle roster
    const ownerMember = {
      accessId: 'owner',
      userId: profile.user.id,
      name: profile.user.fullName,
      email: profile.user.email,
      phone: profile.user.phone,
      role: 'elderly',
      relationship: 'Profile Owner',
      permissionLevel: 'full_access',
      status: 'authorized',
      canRecordMeds: true,
      canEditSchedule: true,
      canReceiveAlerts: true,
      isOwner: true,
      joinedAt: profile.profile.createdAt,
    };

    const careCircle = [
      ownerMember,
      ...members.map(m => ({
        accessId: m.access.id,
        userId: m.user.id,
        name: m.user.fullName,
        email: m.user.email,
        phone: m.user.phone,
        role: m.access.role,
        relationship: m.access.relationship,
        permissionLevel: m.access.permissionLevel,
        status: m.access.status,
        canRecordMeds: m.access.canRecordMeds,
        canEditSchedule: m.access.canEditSchedule,
        canReceiveAlerts: m.access.canReceiveAlerts,
        isOwner: false,
        joinedAt: m.access.authorizedAt || m.access.createdAt,
      })),
    ];

    return res.json({
      profileId: profile.profile.profileId,
      displayName: profile.profile.displayName,
      members: careCircle,
      isCallerOwner: profile.user.id === req.user.id,
    });
  } catch (err) {
    console.error('Fetch care circle error:', err);
    return res.status(500).json({ error: 'Failed to fetch care circle.' });
  }
});

// PUT /api/profiles/:profileId/care-circle/:accessId - Update member permissions (owner only)
router.put('/:accessId', authenticate, async (req, res) => {
  try {
    const { profileId, accessId } = req.params;
    const { permissionLevel, canRecordMeds, canEditSchedule, canReceiveAlerts, status } = req.body;
    const { db } = await getDb();

    // Verify caller is owner
    const [profile] = await db
      .select()
      .from(schema.elderlyProfiles)
      .where(eq(schema.elderlyProfiles.id, profileId));

    if (!profile) return res.status(404).json({ error: 'Profile not found.' });

    if (profile.userId !== req.user.id) {
      return res.status(403).json({ error: 'Only the elderly profile owner can modify circle member permissions.' });
    }

    const [existing] = await db
      .select({
        access: schema.profileAccess,
        user: schema.users,
      })
      .from(schema.profileAccess)
      .innerJoin(schema.users, eq(schema.profileAccess.userId, schema.users.id))
      .where(
        and(
          eq(schema.profileAccess.id, accessId),
          eq(schema.profileAccess.profileId, profileId)
        )
      );

    if (!existing) return res.status(404).json({ error: 'Care circle access record not found.' });

    const updated = {
      permissionLevel: permissionLevel ?? existing.access.permissionLevel,
      canRecordMeds: canRecordMeds !== undefined ? Boolean(canRecordMeds) : existing.access.canRecordMeds,
      canEditSchedule: canEditSchedule !== undefined ? Boolean(canEditSchedule) : existing.access.canEditSchedule,
      canReceiveAlerts: canReceiveAlerts !== undefined ? Boolean(canReceiveAlerts) : existing.access.canReceiveAlerts,
      status: status ?? existing.access.status,
    };

    await db
      .update(schema.profileAccess)
      .set(updated)
      .where(eq(schema.profileAccess.id, accessId));

    // Audit log
    await db.insert(schema.activityLogs).values({
      id: nanoid(),
      profileId,
      actorUserId: req.user.id,
      actorName: req.user.fullName,
      actorRole: req.user.role,
      action: 'PERMISSIONS_MODIFIED',
      details: `${req.user.fullName} updated access permissions for ${existing.user.fullName} (${existing.access.relationship}).`,
    });

    return res.json({ message: 'Permissions updated successfully.', access: updated });
  } catch (err) {
    console.error('Update care circle error:', err);
    return res.status(500).json({ error: 'Failed to update member permissions.' });
  }
});

// DELETE /api/profiles/:profileId/care-circle/:accessId - Revoke caregiver/family member access
router.delete('/:accessId', authenticate, async (req, res) => {
  try {
    const { profileId, accessId } = req.params;
    const { db } = await getDb();

    const [profile] = await db
      .select()
      .from(schema.elderlyProfiles)
      .where(eq(schema.elderlyProfiles.id, profileId));

    if (!profile) return res.status(404).json({ error: 'Profile not found.' });

    if (profile.userId !== req.user.id) {
      return res.status(403).json({ error: 'Only the elderly profile owner can revoke access.' });
    }

    const [existing] = await db
      .select({
        access: schema.profileAccess,
        user: schema.users,
      })
      .from(schema.profileAccess)
      .innerJoin(schema.users, eq(schema.profileAccess.userId, schema.users.id))
      .where(
        and(
          eq(schema.profileAccess.id, accessId),
          eq(schema.profileAccess.profileId, profileId)
        )
      );

    if (!existing) return res.status(404).json({ error: 'Access record not found.' });

    // Mark as revoked
    await db
      .update(schema.profileAccess)
      .set({ status: 'revoked' })
      .where(eq(schema.profileAccess.id, accessId));

    // Audit log
    await db.insert(schema.activityLogs).values({
      id: nanoid(),
      profileId,
      actorUserId: req.user.id,
      actorName: req.user.fullName,
      actorRole: req.user.role,
      action: 'ACCESS_REVOKED',
      details: `${req.user.fullName} revoked Care Circle access for ${existing.user.fullName} (${existing.access.relationship}).`,
    });

    return res.json({ message: `Access for ${existing.user.fullName} was revoked.` });
  } catch (err) {
    console.error('Revoke access error:', err);
    return res.status(500).json({ error: 'Failed to revoke access.' });
  }
});

// GET /api/profiles/:profileId/care-circle/activity - Recent activity feed (audit trail)
router.get('/activity', authenticate, async (req, res) => {
  try {
    const { profileId } = req.params;
    const { limit } = req.query;
    const { db } = await getDb();

    const logs = await db
      .select()
      .from(schema.activityLogs)
      .where(eq(schema.activityLogs.profileId, profileId))
      .orderBy(desc(schema.activityLogs.createdAt))
      .limit(limit ? parseInt(limit, 10) : 30);

    return res.json({ activity: logs });
  } catch (err) {
    console.error('Fetch activity error:', err);
    return res.status(500).json({ error: 'Failed to fetch activity logs.' });
  }
});

export default router;
