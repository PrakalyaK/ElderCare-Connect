import jwt from 'jsonwebtoken';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../db/db.js';
import * as schema from '../db/schema.js';

const JWT_SECRET = process.env.JWT_SECRET || 'eldercare_super_secure_jwt_secret_promptwars_2026';

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Require valid JWT authentication
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. Please sign in.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const { db } = await getDb();
    const [user] = await db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        fullName: schema.users.fullName,
        role: schema.users.role,
        elderlyMode: schema.users.elderlyMode,
      })
      .from(schema.users)
      .where(eq(schema.users.id, decoded.userId));

    if (!user) {
      return res.status(401).json({ error: 'User account not found.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }
}

/**
 * Middleware: Verify that current user has authorized access to the target profileId
 * Supports profileId passed via req.params.profileId, req.query.profileId, or req.body.profileId
 */
export async function requireProfileAccess(requiredPermission = 'view_only') {
  return async (req, res, next) => {
    try {
      const profileId = req.params.profileId || req.query.profileId || req.body.profileId;
      if (!profileId) {
        return res.status(400).json({ error: 'Profile ID is required for this operation.' });
      }

      const { db } = await getDb();

      // 1. Fetch profile
      const [profile] = await db
        .select()
        .from(schema.elderlyProfiles)
        .where(eq(schema.elderlyProfiles.id, profileId));

      if (!profile) {
        return res.status(404).json({ error: 'Elderly profile not found.' });
      }

      // Check if user is the direct elderly owner
      if (profile.userId === req.user.id) {
        req.profile = profile;
        req.userProfileAccess = {
          role: 'owner',
          permissionLevel: 'full_access',
          canRecordMeds: true,
          canEditSchedule: true,
          canReceiveAlerts: true,
        };
        return next();
      }

      // 2. Check profile_access for family / caregiver
      const [access] = await db
        .select()
        .from(schema.profileAccess)
        .where(
          and(
            eq(schema.profileAccess.profileId, profileId),
            eq(schema.profileAccess.userId, req.user.id),
            eq(schema.profileAccess.status, 'authorized')
          )
        );

      if (!access) {
        return res.status(403).json({
          error: 'Access denied. You do not have authorization to view or manage this profile.',
        });
      }

      // Permission checks
      if (requiredPermission === 'can_record_meds' && !access.canRecordMeds && access.permissionLevel === 'view_only') {
        return res.status(403).json({ error: 'Your access tier does not permit logging medication changes.' });
      }

      if (requiredPermission === 'can_edit_schedule' && !access.canEditSchedule && access.permissionLevel !== 'full_access') {
        return res.status(403).json({ error: 'Your access tier does not permit editing medication schedules.' });
      }

      req.profile = profile;
      req.userProfileAccess = access;
      next();
    } catch (err) {
      console.error('requireProfileAccess error:', err);
      return res.status(500).json({ error: 'Internal server error while verifying access permissions.' });
    }
  };
}
