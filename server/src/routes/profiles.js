import express from 'express';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../db/db.js';
import * as schema from '../db/schema.js';
import { authenticate, requireProfileAccess, signToken } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

// Helper to generate human-friendly profile ID
function generateProfileId() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `ELD-${num}`;
}

// Helper to generate random 6-char passcode
function generatePasscode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// POST /api/profiles/register-and-create - 1-step account registration + elderly profile creation
router.post('/register-and-create', authLimiter, async (req, res) => {
  try {
    const {
      email,
      password,
      fullName,
      phone,
      displayName,
      dateOfBirth,
      gender,
      bloodGroup,
      primaryPhysician,
      physicianPhone,
      notes,
      escalationTimeoutMinutes,
      customPasscode,
    } = req.body;

    const patientName = displayName || fullName;
    if (!patientName) {
      return res.status(400).json({ error: 'Patient display name is required.' });
    }

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required to register your account.' });
    }

    const { db } = await getDb();

    // Check if user already exists
    let user;
    const [existing] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email.toLowerCase().trim()));

    if (existing) {
      const match = await bcrypt.compare(password, existing.passwordHash);
      if (!match) {
        return res.status(401).json({ error: 'An account with this email already exists. Please enter the correct password.' });
      }
      user = existing;
    } else {
      const passwordHash = await bcrypt.hash(password, 10);
      const userId = nanoid();
      user = {
        id: userId,
        email: email.toLowerCase().trim(),
        passwordHash,
        fullName: (fullName || displayName).trim(),
        phone: phone?.trim() || null,
        role: 'elderly',
        elderlyMode: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.insert(schema.users).values(user);
    }

    const token = signToken({ userId: user.id, role: user.role });

    const rawPasscode = (customPasscode && customPasscode.trim().length >= 4)
      ? customPasscode.trim().toUpperCase()
      : generatePasscode();

    const passcodeHash = await bcrypt.hash(rawPasscode, 10);
    const profileId = generateProfileId();
    const id = nanoid();

    const newProfile = {
      id,
      userId: user.id,
      profileId,
      passcodeHash,
      displayName: patientName.trim(),
      dateOfBirth: dateOfBirth || null,
      gender: gender || null,
      bloodGroup: bloodGroup || null,
      primaryPhysician: primaryPhysician || null,
      physicianPhone: physicianPhone || null,
      notes: notes || null,
      escalationTimeoutMinutes: escalationTimeoutMinutes ? parseInt(escalationTimeoutMinutes, 10) : 60,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(schema.elderlyProfiles).values(newProfile);

    // Default health profile details
    await db.insert(schema.healthProfileDetails).values({
      id: nanoid(),
      profileId: id,
      allergies: JSON.stringify([]),
      conditions: JSON.stringify([]),
      bloodType: bloodGroup || null,
      dnrStatus: 'No DNR on file',
      insuranceProvider: null,
      insurancePolicyNumber: null,
      preferredHospital: null,
      updatedAt: new Date(),
    });

    // Audit log
    await db.insert(schema.activityLogs).values({
      id: nanoid(),
      profileId: id,
      actorUserId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'PROFILE_CREATED',
      details: `Healthcare profile ${profileId} created for ${newProfile.displayName}.`,
    });

    return res.status(201).json({
      message: 'Account and elderly healthcare profile created successfully.',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        elderlyMode: user.elderlyMode,
      },
      profile: {
        ...newProfile,
        passcodeHash: undefined,
      },
      plainPasscode: rawPasscode,
    });
  } catch (err) {
    console.error('Register and create profile error:', err);
    return res.status(500).json({ error: 'Failed to create account and profile.' });
  }
});

// POST /api/profiles - Create elderly healthcare profile
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      displayName,
      dateOfBirth,
      gender,
      bloodGroup,
      primaryPhysician,
      physicianPhone,
      notes,
      escalationTimeoutMinutes,
      customPasscode,
    } = req.body;

    if (!displayName) {
      return res.status(400).json({ error: 'Display name is required.' });
    }

    const { db } = await getDb();

    // Check if user already owns a profile
    const existing = await db
      .select()
      .from(schema.elderlyProfiles)
      .where(eq(schema.elderlyProfiles.userId, req.user.id));

    if (existing.length > 0 && req.user.role === 'elderly') {
      return res.status(400).json({
        error: 'You already have an active elderly profile.',
        profile: existing[0],
      });
    }

    const rawPasscode = (customPasscode && customPasscode.trim().length >= 4)
      ? customPasscode.trim().toUpperCase()
      : generatePasscode();

    const passcodeHash = await bcrypt.hash(rawPasscode, 10);
    const profileId = generateProfileId();
    const id = nanoid();

    const newProfile = {
      id,
      userId: req.user.id,
      profileId,
      passcodeHash,
      displayName: displayName.trim(),
      dateOfBirth: dateOfBirth || null,
      gender: gender || null,
      bloodGroup: bloodGroup || null,
      primaryPhysician: primaryPhysician || null,
      physicianPhone: physicianPhone || null,
      notes: notes || null,
      escalationTimeoutMinutes: escalationTimeoutMinutes ? parseInt(escalationTimeoutMinutes, 10) : 60,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(schema.elderlyProfiles).values(newProfile);

    // Create default health profile details record
    await db.insert(schema.healthProfileDetails).values({
      id: nanoid(),
      profileId: id,
      allergies: JSON.stringify([]),
      conditions: JSON.stringify([]),
      bloodType: bloodGroup || null,
      dnrStatus: 'No DNR on file',
      insuranceProvider: null,
      insurancePolicyNumber: null,
      preferredHospital: null,
      updatedAt: new Date(),
    });

    // Record audit activity
    await db.insert(schema.activityLogs).values({
      id: nanoid(),
      profileId: id,
      actorUserId: req.user.id,
      actorName: req.user.fullName,
      actorRole: req.user.role,
      action: 'PROFILE_CREATED',
      details: `Healthcare profile ${profileId} created for ${displayName}.`,
    });

    return res.status(201).json({
      message: 'Profile created successfully.',
      profile: {
        ...newProfile,
        passcodeHash: undefined,
      },
      plainPasscode: rawPasscode, // Show plain passcode once on creation
    });
  } catch (err) {
    console.error('Create profile error:', err);
    return res.status(500).json({ error: 'Failed to create elderly profile.' });
  }
});

// GET /api/profiles/my - List all profiles accessible to current user
router.get('/my', authenticate, async (req, res) => {
  try {
    const { db } = await getDb();

    // 1. Owned profiles
    const owned = await db
      .select()
      .from(schema.elderlyProfiles)
      .where(eq(schema.elderlyProfiles.userId, req.user.id));

    // 2. Profiles authorized via Care Circle
    const authorized = await db
      .select({
        profile: schema.elderlyProfiles,
        access: schema.profileAccess,
      })
      .from(schema.profileAccess)
      .innerJoin(schema.elderlyProfiles, eq(schema.profileAccess.profileId, schema.elderlyProfiles.id))
      .where(
        and(
          eq(schema.profileAccess.userId, req.user.id),
          eq(schema.profileAccess.status, 'authorized')
        )
      );

    const allProfiles = [
      ...owned.map(p => ({
        ...p,
        passcodeHash: undefined,
        isOwner: true,
        permissionLevel: 'full_access',
        relationship: 'Self',
        role: 'elderly',
      })),
      ...authorized.map(item => ({
        ...item.profile,
        passcodeHash: undefined,
        isOwner: false,
        permissionLevel: item.access.permissionLevel,
        relationship: item.access.relationship,
        role: item.access.role,
        canRecordMeds: item.access.canRecordMeds,
        canEditSchedule: item.access.canEditSchedule,
        canReceiveAlerts: item.access.canReceiveAlerts,
      })),
    ];

    return res.json({ profiles: allProfiles });
  } catch (err) {
    console.error('Fetch my profiles error:', err);
    return res.status(500).json({ error: 'Failed to fetch profiles.' });
  }
});

// POST /api/profiles/join - Family/Caregiver joins an existing profile with Profile ID & Passcode
router.post('/join', authenticate, authLimiter, async (req, res) => {
  try {
    const { profileId, passcode, relationship, role } = req.body;

    if (!profileId || !passcode || !relationship) {
      return res.status(400).json({
        error: 'Profile ID, access passcode, and relationship are required.',
      });
    }

    const { db } = await getDb();

    // Look up profile by human-friendly profileId (e.g. ELD-9214) or internal UUID
    const cleanId = profileId.trim().toUpperCase();
    const profiles = await db
      .select()
      .from(schema.elderlyProfiles)
      .where(eq(schema.elderlyProfiles.profileId, cleanId));

    if (profiles.length === 0) {
      return res.status(404).json({ error: 'No profile found matching this Profile ID.' });
    }

    const profile = profiles[0];

    // Verify user is not trying to join their own profile as a caregiver
    if (profile.userId === req.user.id) {
      return res.status(400).json({ error: 'You are the registered owner of this profile.' });
    }

    // Verify passcode with bcrypt
    const isPasscodeValid = await bcrypt.compare(passcode.trim().toUpperCase(), profile.passcodeHash);
    if (!isPasscodeValid) {
      return res.status(401).json({ error: 'Invalid access passcode. Please verify with the elderly user.' });
    }

    // Check if user already has access
    const existingAccess = await db
      .select()
      .from(schema.profileAccess)
      .where(
        and(
          eq(schema.profileAccess.profileId, profile.id),
          eq(schema.profileAccess.userId, req.user.id)
        )
      );

    const userRole = role === 'caregiver' ? 'caregiver' : 'family';

    if (existingAccess.length > 0) {
      const access = existingAccess[0];
      if (access.status === 'revoked') {
        // Re-authorize with fresh passcode
        await db
          .update(schema.profileAccess)
          .set({
            status: 'authorized',
            relationship: relationship.trim(),
            role: userRole,
            authorizedAt: new Date(),
          })
          .where(eq(schema.profileAccess.id, access.id));

        return res.json({
          message: 'Access re-authorized successfully.',
          profile: { ...profile, passcodeHash: undefined },
        });
      }
      return res.json({
        message: 'You already have active authorized access to this profile.',
        profile: { ...profile, passcodeHash: undefined },
      });
    }

    // Insert new profile access
    await db.insert(schema.profileAccess).values({
      id: nanoid(),
      profileId: profile.id,
      userId: req.user.id,
      relationship: relationship.trim(),
      role: userRole,
      permissionLevel: userRole === 'caregiver' ? 'med_manager' : 'full_access',
      status: 'authorized',
      canRecordMeds: true,
      canEditSchedule: userRole === 'family',
      canReceiveAlerts: true,
      authorizedAt: new Date(),
    });

    // Audit log
    await db.insert(schema.activityLogs).values({
      id: nanoid(),
      profileId: profile.id,
      actorUserId: req.user.id,
      actorName: req.user.fullName,
      actorRole: userRole,
      action: 'ACCESS_GRANTED',
      details: `${req.user.fullName} (${relationship}) joined the Care Circle with authorized passcode.`,
    });

    return res.status(201).json({
      message: 'Successfully connected to elderly care profile.',
      profile: { ...profile, passcodeHash: undefined },
    });
  } catch (err) {
    console.error('Join profile error:', err);
    return res.status(500).json({ error: 'Failed to authenticate profile access.' });
  }
});

// GET /api/profiles/:profileId - Fetch specific profile details
router.get('/:profileId', authenticate, async (req, res) => {
  try {
    const { profileId } = req.params;
    const { db } = await getDb();

    // Verify access
    const [profile] = await db
      .select()
      .from(schema.elderlyProfiles)
      .where(eq(schema.elderlyProfiles.id, profileId));

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found.' });
    }

    const isOwner = profile.userId === req.user.id;
    let accessRecord = null;

    if (!isOwner) {
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
        return res.status(403).json({ error: 'You do not have permission to view this profile.' });
      }
      accessRecord = access;
    }

    // Health details
    const [healthDetails] = await db
      .select()
      .from(schema.healthProfileDetails)
      .where(eq(schema.healthProfileDetails.profileId, profileId));

    return res.json({
      profile: {
        ...profile,
        passcodeHash: undefined,
        isOwner,
        access: accessRecord,
      },
      healthDetails: healthDetails || null,
    });
  } catch (err) {
    console.error('Get profile error:', err);
    return res.status(500).json({ error: 'Failed to retrieve profile information.' });
  }
});

// PUT /api/profiles/:profileId - Update elderly profile
router.put('/:profileId', authenticate, async (req, res) => {
  try {
    const { profileId } = req.params;
    const {
      displayName,
      dateOfBirth,
      gender,
      bloodGroup,
      primaryPhysician,
      physicianPhone,
      notes,
      escalationTimeoutMinutes,
    } = req.body;

    const { db } = await getDb();

    // Verify ownership or full_access
    const [profile] = await db
      .select()
      .from(schema.elderlyProfiles)
      .where(eq(schema.elderlyProfiles.id, profileId));

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found.' });
    }

    if (profile.userId !== req.user.id) {
      // Check if family has full_access
      const [access] = await db
        .select()
        .from(schema.profileAccess)
        .where(
          and(
            eq(schema.profileAccess.profileId, profileId),
            eq(schema.profileAccess.userId, req.user.id),
            eq(schema.profileAccess.status, 'authorized'),
            eq(schema.profileAccess.permissionLevel, 'full_access')
          )
        );

      if (!access) {
        return res.status(403).json({ error: 'Only profile owners and authorized family can update profile settings.' });
      }
    }

    const updated = {
      displayName: displayName ?? profile.displayName,
      dateOfBirth: dateOfBirth ?? profile.dateOfBirth,
      gender: gender ?? profile.gender,
      bloodGroup: bloodGroup ?? profile.bloodGroup,
      primaryPhysician: primaryPhysician ?? profile.primaryPhysician,
      physicianPhone: physicianPhone ?? profile.physicianPhone,
      notes: notes ?? profile.notes,
      escalationTimeoutMinutes: escalationTimeoutMinutes !== undefined ? parseInt(escalationTimeoutMinutes, 10) : profile.escalationTimeoutMinutes,
      updatedAt: new Date(),
    };

    await db
      .update(schema.elderlyProfiles)
      .set(updated)
      .where(eq(schema.elderlyProfiles.id, profileId));

    return res.json({ message: 'Profile updated successfully.', profile: updated });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ error: 'Failed to update profile settings.' });
  }
});

// POST /api/profiles/:profileId/passcode/reset - Reset and generate new passcode
router.post('/:profileId/passcode/reset', authenticate, async (req, res) => {
  try {
    const { profileId } = req.params;
    const { newPasscode } = req.body;
    const { db } = await getDb();

    const [profile] = await db
      .select()
      .from(schema.elderlyProfiles)
      .where(eq(schema.elderlyProfiles.id, profileId));

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found.' });
    }

    // Only elderly profile owner can reset passcode
    if (profile.userId !== req.user.id) {
      return res.status(403).json({ error: 'Only the elderly profile owner can change the access passcode.' });
    }

    const generated = (newPasscode && newPasscode.trim().length >= 4)
      ? newPasscode.trim().toUpperCase()
      : generatePasscode();

    const passcodeHash = await bcrypt.hash(generated, 10);

    await db
      .update(schema.elderlyProfiles)
      .set({
        passcodeHash,
        updatedAt: new Date(),
      })
      .where(eq(schema.elderlyProfiles.id, profileId));

    // Audit log
    await db.insert(schema.activityLogs).values({
      id: nanoid(),
      profileId,
      actorUserId: req.user.id,
      actorName: req.user.fullName,
      actorRole: req.user.role,
      action: 'PASSCODE_RESET',
      details: 'Access passcode was updated by the profile owner.',
    });

    return res.json({
      message: 'Access passcode updated successfully.',
      passcode: generated,
    });
  } catch (err) {
    console.error('Passcode reset error:', err);
    return res.status(500).json({ error: 'Failed to update access passcode.' });
  }
});

export default router;
