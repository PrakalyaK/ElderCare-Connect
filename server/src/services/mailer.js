import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let transporter = null;
let etherealAccount = null;

// Initialize mail transporter
export async function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (host && user && pass) {
    console.log(`Using custom SMTP server: ${host}:${port}`);
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
    return transporter;
  }

  // Gracefully fallback to Ethereal test mailer for demonstration/testing
  try {
    console.log('No production SMTP configured. Creating Ethereal test email account...');
    etherealAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: etherealAccount.user,
        pass: etherealAccount.pass,
      },
    });
    console.log(`Ethereal test mailer ready (${etherealAccount.user}). Test emails will generate preview URLs.`);
    return transporter;
  } catch (err) {
    console.warn('Could not initialize Ethereal mailer, email notifications will be logged only:', err.message);
    return null;
  }
}

/**
 * Send an email and return delivery details including preview URL if available
 */
export async function sendEmail({ to, subject, html, text }) {
  const mailTransporter = await getTransporter();

  if (!mailTransporter) {
    console.log(`[EMAIL LOGGED - NO PROVIDER] To: ${to} | Subject: ${subject}`);
    return {
      success: false,
      status: 'no_smtp_configured',
      error: 'No email service or test SMTP is configured.',
      previewUrl: null,
    };
  }

  try {
    const from = process.env.SMTP_FROM || '"ElderCare Connect" <notifications@eldercareconnect.app>';
    const info = await mailTransporter.sendMail({
      from,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>?/gm, ''),
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || null;
    if (previewUrl) {
      console.log(`Ethereal Email Preview URL: ${previewUrl}`);
    }

    return {
      success: true,
      status: 'sent',
      messageId: info.messageId,
      previewUrl,
    };
  } catch (err) {
    console.error('Email send failed:', err.message);
    return {
      success: false,
      status: 'failed',
      error: err.message,
      previewUrl: null,
    };
  }
}

// 1. Upcoming Medication Reminder Email Template
export function generateMedicationReminderEmail({ elderlyName, medicationName, dosage, scheduledTime, instructions, foodRelation }) {
  const foodNote = foodRelation === 'with_food' ? 'Please take this medication with food or after a meal.'
    : foodRelation === 'before_food' ? 'Please take this medication 30 minutes before your meal.'
    : foodRelation === 'after_food' ? 'Please take this medication after finishing your meal.'
    : 'Can be taken with or without food.';

  return {
    subject: `💊 Medication Reminder for ${elderlyName}: ${medicationName} (${scheduledTime})`,
    html: `
      <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="font-size: 24px; font-weight: 700; color: #15803d;">ElderCare Connect</span>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Medication Routine Notification</p>
        </div>
        <div style="background-color: #ffffff; padding: 24px; border-radius: 8px; border: 1px solid #cbd5e1; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
          <h2 style="color: #0f172a; margin-top: 0; font-size: 18px;">Upcoming Dose Reminder</h2>
          <p style="color: #334155; font-size: 15px; line-height: 1.5;">
            Hello, this is a reminder for <strong>${elderlyName}</strong>'s scheduled medication.
          </p>
          <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 18px; font-weight: 600; color: #166534;">${medicationName} — ${dosage}</p>
            <p style="margin: 6px 0 0 0; font-size: 14px; color: #14532d;">Scheduled Time: <strong>${scheduledTime}</strong></p>
            ${instructions ? `<p style="margin: 6px 0 0 0; font-size: 14px; color: #14532d;">Instructions: ${instructions}</p>` : ''}
            <p style="margin: 6px 0 0 0; font-size: 13px; color: #15803d; font-style: italic;">${foodNote}</p>
          </div>
          <p style="color: #475569; font-size: 14px;">
            Once taken, please mark this dose as <strong>Taken</strong> in the ElderCare Connect portal so your care circle is notified.
          </p>
        </div>
        <div style="margin-top: 20px; font-size: 12px; color: #94a3b8; text-align: center;">
          <p>ElderCare Connect • Caring for those who cared for us</p>
          <p><em>Safety note: Never take a double dose if a prior medication was skipped. Direct questions to your prescribing physician.</em></p>
        </div>
      </div>
    `,
  };
}

// 2. Missed Medication Alert Email Template
export function generateMissedMedicationEmail({ elderlyName, medicationName, dosage, scheduledTime }) {
  return {
    subject: `⚠️ Unconfirmed Medication Alert: ${medicationName} for ${elderlyName}`,
    html: `
      <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #fff7ed; border-radius: 12px; border: 1px solid #ffedd5;">
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="font-size: 24px; font-weight: 700; color: #c2410c;">ElderCare Connect</span>
          <p style="color: #9a3412; font-size: 14px; margin-top: 4px;">Adherence Alert</p>
        </div>
        <div style="background-color: #ffffff; padding: 24px; border-radius: 8px; border: 1px solid #fed7aa;">
          <h2 style="color: #9a3412; margin-top: 0; font-size: 18px;">Medication Dose Pending Confirmation</h2>
          <p style="color: #334155; font-size: 15px; line-height: 1.5;">
            The following medication scheduled for <strong>${elderlyName}</strong> at <strong>${scheduledTime}</strong> has not yet been marked as taken:
          </p>
          <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 18px; font-weight: 600; color: #b45309;">${medicationName} — ${dosage}</p>
            <p style="margin: 6px 0 0 0; font-size: 14px; color: #92400e;">Scheduled Time: ${scheduledTime}</p>
          </div>
          <p style="color: #475569; font-size: 14px;">
            If you have already taken this medication, please sign in and mark it as completed.
          </p>
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 12px; border-radius: 6px; margin-top: 16px;">
            <p style="margin: 0; font-size: 13px; color: #991b1b; font-weight: 500;">
              ⚠️ Medical Caution: Never take an extra or double dose to make up for a missed dose. If uncertain, please contact your doctor or pharmacist.
            </p>
          </div>
        </div>
        <div style="margin-top: 20px; font-size: 12px; color: #94a3b8; text-align: center;">
          <p>ElderCare Connect Care Management System</p>
        </div>
      </div>
    `,
  };
}

// 3. Caregiver Escalation Notification Email Template
export function generateCaregiverEscalationEmail({ caregiverName, elderlyName, medicationName, dosage, scheduledTime, minutesOverdue }) {
  return {
    subject: `🚨 Caregiver Escalation: ${elderlyName} has not taken ${medicationName} (${minutesOverdue} mins overdue)`,
    html: `
      <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #fef2f2; border-radius: 12px; border: 1px solid #fee2e2;">
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="font-size: 24px; font-weight: 700; color: #b91c1c;">ElderCare Connect — Escalation Alert</span>
          <p style="color: #991b1b; font-size: 14px; margin-top: 4px;">Immediate Caregiver Follow-Up Requested</p>
        </div>
        <div style="background-color: #ffffff; padding: 24px; border-radius: 8px; border: 1px solid #fecaca; box-shadow: 0 2px 4px rgba(0,0,0,0.03);">
          <h2 style="color: #b91c1c; margin-top: 0; font-size: 18px;">Caregiver Attention Required</h2>
          <p style="color: #334155; font-size: 15px; line-height: 1.5;">
            Hello ${caregiverName},
          </p>
          <p style="color: #334155; font-size: 15px; line-height: 1.5;">
            This automated escalation alert is triggered because <strong>${elderlyName}</strong>'s medication dose remains unconfirmed more than <strong>${minutesOverdue} minutes</strong> past its scheduled time.
          </p>
          <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 18px; font-weight: 700; color: #991b1b;">${medicationName} (${dosage})</p>
            <p style="margin: 6px 0 0 0; font-size: 14px; color: #7f1d1d;">Original Time: <strong>${scheduledTime}</strong></p>
            <p style="margin: 6px 0 0 0; font-size: 14px; color: #7f1d1d;">Status: <strong>Unconfirmed / Overdue by ${minutesOverdue} mins</strong></p>
          </div>
          <p style="color: #334155; font-size: 14px; line-height: 1.5;">
            Recommended next step: Please reach out to ${elderlyName} directly to confirm their well-being and whether they require assistance.
          </p>
        </div>
        <div style="margin-top: 20px; font-size: 12px; color: #94a3b8; text-align: center;">
          <p>ElderCare Connect Escalation Engine • Profile Protection Protocol</p>
        </div>
      </div>
    `,
  };
}

// 4. Doctor Appointment Reminder Email Template
export function generateAppointmentReminderEmail({ recipientName, elderlyName, doctorName, specialization, hospitalClinic, appointmentDate, appointmentTime, notes }) {
  return {
    subject: `🩺 Appointment Reminder: Dr. ${doctorName} on ${appointmentDate} at ${appointmentTime}`,
    html: `
      <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f0f9ff; border-radius: 12px; border: 1px solid #e0f2fe;">
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="font-size: 24px; font-weight: 700; color: #0369a1;">ElderCare Connect</span>
          <p style="color: #075985; font-size: 14px; margin-top: 4px;">Doctor Visit Notification</p>
        </div>
        <div style="background-color: #ffffff; padding: 24px; border-radius: 8px; border: 1px solid #bae6fd;">
          <h2 style="color: #0c4a6e; margin-top: 0; font-size: 18px;">Upcoming Doctor Appointment</h2>
          <p style="color: #334155; font-size: 15px; line-height: 1.5;">
            Hello ${recipientName}, this is a reminder for <strong>${elderlyName}</strong>'s upcoming doctor appointment:
          </p>
          <div style="background-color: #f0fdf4; border-left: 4px solid #0284c7; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 17px; font-weight: 700; color: #0369a1;">Dr. ${doctorName} (${specialization})</p>
            <p style="margin: 6px 0 0 0; font-size: 14px; color: #075985;">Location: <strong>${hospitalClinic}</strong></p>
            <p style="margin: 6px 0 0 0; font-size: 14px; color: #075985;">Date & Time: <strong>${appointmentDate} at ${appointmentTime}</strong></p>
            ${notes ? `<p style="margin: 6px 0 0 0; font-size: 13px; color: #334155;">Notes: ${notes}</p>` : ''}
          </div>
          <p style="color: #475569; font-size: 13px;">
            Remember to bring existing prescription records and insurance documents.
          </p>
        </div>
        <div style="margin-top: 20px; font-size: 12px; color: #94a3b8; text-align: center;">
          <p>ElderCare Connect Appointment Coordinator</p>
        </div>
      </div>
    `,
  };
}
