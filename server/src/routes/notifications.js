import express from 'express';
import { nanoid } from 'nanoid';
import { eq, and, desc } from 'drizzle-orm';
import { getDb } from '../db/db.js';
import * as schema from '../db/schema.js';
import { authenticate } from '../middleware/auth.js';
import { sendEmail } from '../services/mailer.js';

const router = express.Router({ mergeParams: true });

// GET /api/profiles/:profileId/notifications - Fetch notification log
router.get('/', authenticate, async (req, res) => {
  try {
    const { profileId } = req.params;
    const { unreadOnly } = req.query;
    const { db } = await getDb();

    let query = db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.profileId, profileId))
      .orderBy(desc(schema.notifications.createdAt));

    const list = await query;
    const filtered = unreadOnly === 'true' ? list.filter(n => !n.isRead) : list;

    const formatted = filtered.map(n => ({
      ...n,
      metadata: typeof n.metadata === 'string' ? JSON.parse(n.metadata || '{}') : n.metadata,
    }));

    const unreadCount = list.filter(n => !n.isRead).length;

    return res.json({
      notifications: formatted,
      unreadCount,
    });
  } catch (err) {
    console.error('Fetch notifications error:', err);
    return res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

// PUT /api/profiles/:profileId/notifications/:id/read - Mark notification as read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const { profileId, id } = req.params;
    const { db } = await getDb();

    await db
      .update(schema.notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(schema.notifications.id, id),
          eq(schema.notifications.profileId, profileId)
        )
      );

    return res.json({ message: 'Notification marked as read.' });
  } catch (err) {
    console.error('Mark read error:', err);
    return res.status(500).json({ error: 'Failed to update notification.' });
  }
});

// POST /api/profiles/:profileId/notifications/test-email - Trigger a live test email via Nodemailer
router.post('/test-email', authenticate, async (req, res) => {
  try {
    const { profileId } = req.params;
    const { targetEmail } = req.body;
    const emailToUse = targetEmail || req.user.email;

    const { db } = await getDb();
    const [profile] = await db
      .select()
      .from(schema.elderlyProfiles)
      .where(eq(schema.elderlyProfiles.id, profileId));

    const testSubject = `🧪 ElderCare Connect System Test — ${profile?.displayName || 'Healthcare Service'}`;
    const testHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f0fdf4; border-radius: 8px;">
        <h2 style="color: #166534;">ElderCare Connect Notification Engine Verified ✅</h2>
        <p>Hello ${req.user.fullName},</p>
        <p>This is a live test notification generated from the ElderCare Connect platform to verify Nodemailer integration.</p>
        <div style="background-color: white; padding: 15px; border-left: 4px solid #22c55e; margin: 15px 0;">
          <p style="margin: 0;"><strong>Active Profile:</strong> ${profile?.displayName || 'N/A'}</p>
          <p style="margin: 5px 0 0 0;"><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
          <p style="margin: 5px 0 0 0;"><strong>Channel:</strong> SMTP / Ethereal Live Pipeline</p>
        </div>
        <p style="font-size: 12px; color: #64748b;">ElderCare Connect • PromptWars × Catalyst Hackathon</p>
      </div>
    `;

    const mailRes = await sendEmail({
      to: emailToUse,
      subject: testSubject,
      html: testHtml,
    });

    // Record notification in DB
    await db.insert(schema.notifications).values({
      id: nanoid(),
      profileId,
      recipientUserId: req.user.id,
      recipientEmail: emailToUse,
      type: 'medication_reminder',
      title: 'System Notification Verification',
      message: `Test email dispatched to ${emailToUse}. Status: ${mailRes.status}.`,
      status: mailRes.status || 'sent',
      deliveryChannel: 'email',
      metadata: JSON.stringify({
        isTest: true,
        previewUrl: mailRes.previewUrl,
      }),
      sentAt: new Date(),
    });

    return res.json({
      message: 'Test notification triggered.',
      deliveryStatus: mailRes.status,
      recipient: emailToUse,
      previewUrl: mailRes.previewUrl,
    });
  } catch (err) {
    console.error('Test email error:', err);
    return res.status(500).json({ error: 'Failed to send test email notification.' });
  }
});

export default router;
