import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as schema from './schema.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInstance = null;
let clientInstance = null;
let isPgLite = false;

export async function getDb() {
  if (dbInstance) {
    return { db: dbInstance, isPgLite };
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (databaseUrl) {
    try {
      console.log('Connecting to PostgreSQL using DATABASE_URL...');
      const { drizzle } = await import('drizzle-orm/node-postgres');
      const pgModule = await import('pg');
      const { Pool } = pgModule.default || pgModule;

      const pool = new Pool({
        connectionString: databaseUrl,
        ssl: databaseUrl.includes('neon.tech') || databaseUrl.includes('sslmode=require')
          ? { rejectUnauthorized: false }
          : false,
      });

      // Quick connectivity test
      const testClient = await pool.connect();
      testClient.release();

      clientInstance = pool;
      dbInstance = drizzle(pool, { schema });
      isPgLite = false;
      console.log('Connected to PostgreSQL successfully.');
      await initSchema(dbInstance);
      return { db: dbInstance, isPgLite };
    } catch (err) {
      console.warn('Failed to connect to PostgreSQL via DATABASE_URL, falling back to embedded PGlite:', err.message);
    }
  }

  // Embedded PGlite fallback
  console.log('Initializing embedded PostgreSQL (PGlite)...');
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');

  const pglite = new PGlite();
  await pglite.waitReady;
  clientInstance = pglite;
  dbInstance = drizzle(pglite, { schema });
  isPgLite = true;
  console.log('Embedded PostgreSQL (PGlite) initialized successfully.');

  await initSchema(dbInstance);
  return { db: dbInstance, isPgLite };
}

// Ensure all tables exist
async function initSchema(db) {
  const ddl = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      role TEXT NOT NULL,
      elderly_mode BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS elderly_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      profile_id TEXT NOT NULL UNIQUE,
      passcode_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      date_of_birth TEXT,
      gender TEXT,
      blood_group TEXT,
      primary_physician TEXT,
      physician_phone TEXT,
      notes TEXT,
      escalation_timeout_minutes INTEGER DEFAULT 60,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS profile_access (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES elderly_profiles(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      relationship TEXT NOT NULL,
      role TEXT NOT NULL,
      permission_level TEXT DEFAULT 'full_access' NOT NULL,
      status TEXT DEFAULT 'authorized' NOT NULL,
      can_record_meds BOOLEAN DEFAULT TRUE,
      can_edit_schedule BOOLEAN DEFAULT FALSE,
      can_receive_alerts BOOLEAN DEFAULT TRUE,
      authorized_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS medications (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES elderly_profiles(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      dosage TEXT NOT NULL,
      frequency TEXT NOT NULL,
      instructions TEXT,
      food_relation TEXT DEFAULT 'with_food',
      start_date TEXT NOT NULL,
      end_date TEXT,
      color_tag TEXT DEFAULT 'emerald',
      shape TEXT DEFAULT 'tablet',
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS medication_schedules (
      id TEXT PRIMARY KEY,
      medication_id TEXT NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
      profile_id TEXT NOT NULL REFERENCES elderly_profiles(id) ON DELETE CASCADE,
      time_of_day TEXT NOT NULL,
      label TEXT NOT NULL,
      dose_amount TEXT DEFAULT '1 dose',
      days_of_week TEXT DEFAULT '1,2,3,4,5,6,7',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS medication_logs (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES elderly_profiles(id) ON DELETE CASCADE,
      medication_id TEXT NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
      schedule_id TEXT,
      scheduled_date TEXT NOT NULL,
      scheduled_time TEXT NOT NULL,
      status TEXT DEFAULT 'pending' NOT NULL,
      recorded_at TIMESTAMP,
      recorded_by_user_id TEXT,
      recorded_by_name TEXT,
      notes TEXT,
      escalation_level INTEGER DEFAULT 0,
      escalation_notified_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES elderly_profiles(id) ON DELETE CASCADE,
      doctor_name TEXT NOT NULL,
      specialization TEXT NOT NULL,
      hospital_clinic TEXT NOT NULL,
      location TEXT,
      appointment_date TEXT NOT NULL,
      appointment_time TEXT NOT NULL,
      notes TEXT,
      status TEXT DEFAULT 'scheduled' NOT NULL,
      reminder_sent BOOLEAN DEFAULT FALSE,
      created_by_user_id TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS medicine_inventory (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES elderly_profiles(id) ON DELETE CASCADE,
      medication_id TEXT NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
      current_quantity INTEGER DEFAULT 0 NOT NULL,
      unit TEXT DEFAULT 'tablets' NOT NULL,
      low_stock_threshold INTEGER DEFAULT 5 NOT NULL,
      expiry_date TEXT,
      refill_reminder_sent BOOLEAN DEFAULT FALSE,
      last_restocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS emergency_contacts (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES elderly_profiles(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      relationship TEXT NOT NULL,
      phone TEXT NOT NULL,
      secondary_phone TEXT,
      is_primary BOOLEAN DEFAULT FALSE,
      can_make_medical_decisions BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS health_profile_details (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL UNIQUE REFERENCES elderly_profiles(id) ON DELETE CASCADE,
      allergies TEXT DEFAULT '[]',
      conditions TEXT DEFAULT '[]',
      blood_type TEXT,
      dnr_status TEXT DEFAULT 'No DNR on file',
      insurance_provider TEXT,
      insurance_policy_number TEXT,
      preferred_hospital TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES elderly_profiles(id) ON DELETE CASCADE,
      recipient_user_id TEXT,
      recipient_email TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'sent' NOT NULL,
      delivery_channel TEXT DEFAULT 'email' NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      metadata TEXT DEFAULT '{}',
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES elderly_profiles(id) ON DELETE CASCADE,
      actor_user_id TEXT,
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_med_logs_profile_date ON medication_logs (profile_id, scheduled_date);
    CREATE INDEX IF NOT EXISTS idx_med_schedules_profile ON medication_schedules (profile_id);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_profile ON activity_logs (profile_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_profile ON notifications (profile_id);
  `;

  try {
    if (clientInstance.exec) {
      await clientInstance.exec(ddl);
    } else {
      // Split by semicolon for pool.query if needed, or query directly
      const statements = ddl
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      for (const statement of statements) {
        await clientInstance.query(statement);
      }
    }
    console.log('Database tables verified and ready.');
  } catch (err) {
    console.error('Error creating database tables:', err);
    throw err;
  }
}
