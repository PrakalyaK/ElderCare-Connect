import express from 'express';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { eq, or } from 'drizzle-orm';
import { getDb } from '../db/db.js';
import * as schema from '../db/schema.js';
import { signToken, authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

// POST /api/auth/register
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { email, password, fullName, phone, role } = req.body;

    if (!email || !password || !fullName || !role) {
      return res.status(400).json({ error: 'All fields (email, password, full name, role) are required.' });
    }

    const validRoles = ['elderly', 'family', 'caregiver'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const { db } = await getDb();

    // Check if email already registered
    const [existing] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email.toLowerCase().trim()));

    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = nanoid();

    const newUser = {
      id: userId,
      email: email.toLowerCase().trim(),
      passwordHash,
      fullName: fullName.trim(),
      phone: phone?.trim() || null,
      role,
      elderlyMode: role === 'elderly',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(schema.users).values(newUser);

    const token = signToken({ userId: newUser.id, role: newUser.role });

    return res.status(201).json({
      message: 'Account registered successfully.',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
        elderlyMode: newUser.elderlyMode,
      },
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const { db } = await getDb();

    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email.toLowerCase().trim()));

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signToken({ userId: user.id, role: user.role });

    return res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        elderlyMode: user.elderlyMode,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const { db } = await getDb();

    // Check profiles owned
    const ownedProfiles = await db
      .select()
      .from(schema.elderlyProfiles)
      .where(eq(schema.elderlyProfiles.userId, req.user.id));

    // Check profiles authorized via profile_access
    const authorizedProfiles = await db
      .select({
        profile: schema.elderlyProfiles,
        access: schema.profileAccess,
      })
      .from(schema.profileAccess)
      .innerJoin(schema.elderlyProfiles, eq(schema.profileAccess.profileId, schema.elderlyProfiles.id))
      .where(
        eq(schema.profileAccess.userId, req.user.id)
      );

    return res.json({
      user: req.user,
      ownedProfiles,
      authorizedProfiles: authorizedProfiles.map(item => ({
        ...item.profile,
        relationship: item.access.relationship,
        accessRole: item.access.role,
        permissionLevel: item.access.permissionLevel,
        status: item.access.status,
      })),
    });
  } catch (err) {
    console.error('Auth/me error:', err);
    return res.status(500).json({ error: 'Failed to fetch user session details.' });
  }
});

// PUT /api/auth/toggle-elderly-mode
router.put('/toggle-elderly-mode', authenticate, async (req, res) => {
  try {
    const { enabled } = req.body;
    const { db } = await getDb();

    await db
      .update(schema.users)
      .set({
        elderlyMode: Boolean(enabled),
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, req.user.id));

    return res.json({ success: true, elderlyMode: Boolean(enabled) });
  } catch (err) {
    console.error('Toggle elderly mode error:', err);
    return res.status(500).json({ error: 'Failed to update elderly mode preference.' });
  }
});

export default router;
