import express from 'express';
import { nanoid } from 'nanoid';
import { eq, and, desc, asc, gte } from 'drizzle-orm';
import { getDb } from '../db/db.js';
import * as schema from '../db/schema.js';
import { authenticate } from '../middleware/auth.js';
import { sendEmail, generateAppointmentReminderEmail } from '../services/mailer.js';

const router = express.Router({ mergeParams: true });

// GET /api/profiles/:profileId/appointments - List all appointments
router.get('/', authenticate, async (req, res) => {
  try {
    const { profileId } = req.params;
    const { db } = await getDb();

    const appts = await db
      .select()
      .from(schema.appointments)
      .where(eq(schema.appointments.profileId, profileId))
      .orderBy(asc(schema.appointments.appointmentDate), asc(schema.appointments.appointmentTime));

    const todayStr = new Date().toISOString().split('T')[0];

    const upcoming = appts.filter(a => a.appointmentDate >= todayStr && a.status === 'scheduled');
    const past = appts.filter(a => a.appointmentDate < todayStr || a.status !== 'scheduled');

    return res.json({
      all: appts,
      upcoming,
      past,
      nextAppointment: upcoming[0] || null,
    });
  } catch (err) {
    console.error('Fetch appointments error:', err);
    return res.status(500).json({ error: 'Failed to fetch appointments.' });
  }
});

// POST /api/profiles/:profileId/appointments - Add doctor appointment
router.post('/', authenticate, async (req, res) => {
  try {
    const { profileId } = req.params;
    const {
      doctorName,
      specialization,
      hospitalClinic,
      location,
      appointmentDate,
      appointmentTime,
      notes,
    } = req.body;

    if (!doctorName || !specialization || !hospitalClinic || !appointmentDate || !appointmentTime) {
      return res.status(400).json({
        error: 'Doctor name, specialization, clinic/hospital, date, and time are required.',
      });
    }

    const { db } = await getDb();
    const apptId = nanoid();

    const newAppt = {
      id: apptId,
      profileId,
      doctorName: doctorName.trim(),
      specialization: specialization.trim(),
      hospitalClinic: hospitalClinic.trim(),
      location: location?.trim() || null,
      appointmentDate,
      appointmentTime,
      notes: notes?.trim() || null,
      status: 'scheduled',
      reminderSent: false,
      createdByUserId: req.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(schema.appointments).values(newAppt);

    // Audit log
    await db.insert(schema.activityLogs).values({
      id: nanoid(),
      profileId,
      actorUserId: req.user.id,
      actorName: req.user.fullName,
      actorRole: req.user.role,
      action: 'APPOINTMENT_ADDED',
      details: `${req.user.fullName} scheduled an appointment with Dr. ${newAppt.doctorName} (${newAppt.specialization}) on ${newAppt.appointmentDate} at ${newAppt.appointmentTime}.`,
    });

    return res.status(201).json({
      message: 'Doctor appointment scheduled successfully.',
      appointment: newAppt,
    });
  } catch (err) {
    console.error('Add appointment error:', err);
    return res.status(500).json({ error: 'Failed to schedule appointment.' });
  }
});

// PUT /api/profiles/:profileId/appointments/:appointmentId - Update appointment
router.put('/:appointmentId', authenticate, async (req, res) => {
  try {
    const { profileId, appointmentId } = req.params;
    const {
      doctorName,
      specialization,
      hospitalClinic,
      location,
      appointmentDate,
      appointmentTime,
      notes,
      status,
    } = req.body;

    const { db } = await getDb();

    const [existing] = await db
      .select()
      .from(schema.appointments)
      .where(
        and(
          eq(schema.appointments.id, appointmentId),
          eq(schema.appointments.profileId, profileId)
        )
      );

    if (!existing) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    const updated = {
      doctorName: doctorName?.trim() ?? existing.doctorName,
      specialization: specialization?.trim() ?? existing.specialization,
      hospitalClinic: hospitalClinic?.trim() ?? existing.hospitalClinic,
      location: location !== undefined ? location?.trim() : existing.location,
      appointmentDate: appointmentDate ?? existing.appointmentDate,
      appointmentTime: appointmentTime ?? existing.appointmentTime,
      notes: notes !== undefined ? notes?.trim() : existing.notes,
      status: status ?? existing.status,
      updatedAt: new Date(),
    };

    await db
      .update(schema.appointments)
      .set(updated)
      .where(eq(schema.appointments.id, appointmentId));

    // Audit log
    await db.insert(schema.activityLogs).values({
      id: nanoid(),
      profileId,
      actorUserId: req.user.id,
      actorName: req.user.fullName,
      actorRole: req.user.role,
      action: 'APPOINTMENT_UPDATED',
      details: `${req.user.fullName} updated appointment with Dr. ${updated.doctorName} (Status: ${updated.status}).`,
    });

    return res.json({ message: 'Appointment updated successfully.', appointment: updated });
  } catch (err) {
    console.error('Update appointment error:', err);
    return res.status(500).json({ error: 'Failed to update appointment.' });
  }
});

// DELETE /api/profiles/:profileId/appointments/:appointmentId - Delete appointment
router.delete('/:appointmentId', authenticate, async (req, res) => {
  try {
    const { profileId, appointmentId } = req.params;
    const { db } = await getDb();

    const [existing] = await db
      .select()
      .from(schema.appointments)
      .where(
        and(
          eq(schema.appointments.id, appointmentId),
          eq(schema.appointments.profileId, profileId)
        )
      );

    if (!existing) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    await db
      .delete(schema.appointments)
      .where(eq(schema.appointments.id, appointmentId));

    // Audit log
    await db.insert(schema.activityLogs).values({
      id: nanoid(),
      profileId,
      actorUserId: req.user.id,
      actorName: req.user.fullName,
      actorRole: req.user.role,
      action: 'APPOINTMENT_DELETED',
      details: `${req.user.fullName} cancelled and removed appointment with Dr. ${existing.doctorName}.`,
    });

    return res.json({ message: 'Appointment removed successfully.' });
  } catch (err) {
    console.error('Delete appointment error:', err);
    return res.status(500).json({ error: 'Failed to delete appointment.' });
  }
});

// POST /api/profiles/:profileId/appointments/:appointmentId/send-reminder - Manual trigger reminder
router.post('/:appointmentId/send-reminder', authenticate, async (req, res) => {
  try {
    const { profileId, appointmentId } = req.params;
    const { db } = await getDb();

    const [appt] = await db
      .select()
      .from(schema.appointments)
      .where(
        and(
          eq(schema.appointments.id, appointmentId),
          eq(schema.appointments.profileId, profileId)
        )
      );

    if (!appt) return res.status(404).json({ error: 'Appointment not found.' });

    const [profile] = await db
      .select()
      .from(schema.elderlyProfiles)
      .where(eq(schema.elderlyProfiles.id, profileId));

    const emailData = generateAppointmentReminderEmail({
      recipientName: req.user.fullName,
      elderlyName: profile.displayName,
      doctorName: appt.doctorName,
      specialization: appt.specialization,
      hospitalClinic: appt.hospitalClinic,
      appointmentDate: appt.appointmentDate,
      appointmentTime: appt.appointmentTime,
      notes: appt.notes,
    });

    const mailRes = await sendEmail({
      to: req.user.email,
      subject: emailData.subject,
      html: emailData.html,
    });

    await db.insert(schema.notifications).values({
      id: nanoid(),
      profileId,
      recipientUserId: req.user.id,
      recipientEmail: req.user.email,
      type: 'appointment_reminder',
      title: `Appointment Reminder: Dr. ${appt.doctorName}`,
      message: `Appointment reminder dispatched for Dr. ${appt.doctorName} on ${appt.appointmentDate} at ${appt.appointmentTime}.`,
      status: mailRes.status || 'sent',
      deliveryChannel: 'email',
      metadata: JSON.stringify({
        appointmentId: appt.id,
        previewUrl: mailRes.previewUrl,
      }),
      sentAt: new Date(),
    });

    return res.json({
      message: 'Appointment reminder email dispatched.',
      deliveryStatus: mailRes.status,
      previewUrl: mailRes.previewUrl,
    });
  } catch (err) {
    console.error('Send appointment reminder error:', err);
    return res.status(500).json({ error: 'Failed to send appointment reminder.' });
  }
});

export default router;
