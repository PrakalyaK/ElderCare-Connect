import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { getDb } from './db/db.js';
import { seedDatabase } from './db/seed.js';
import { initScheduler } from './services/scheduler.js';
import { apiLimiter } from './middleware/rateLimit.js';

// Route imports
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profiles.js';
import medicationRoutes from './routes/medications.js';
import adherenceRoutes from './routes/adherence.js';
import appointmentRoutes from './routes/appointments.js';
import inventoryRoutes from './routes/inventory.js';
import emergencyRoutes from './routes/emergency.js';
import careCircleRoutes from './routes/careCircle.js';
import notificationRoutes from './routes/notifications.js';
import summaryRoutes from './routes/summary.js';
import escalationRoutes from './routes/escalation.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Security: Disable Express fingerprinting
app.disable('x-powered-by');

// Security: Standard HTTP Defense Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');
  next();
});

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for dev/eval ease
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use('/api', apiLimiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'ElderCare Connect API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Demo Data Reset Endpoint (1-click reset for hackathon judges & testers)
app.post('/api/demo/reset', async (req, res) => {
  try {
    await seedDatabase(true);
    res.json({
      message: 'Demo dataset reset successfully! Pre-populated with realistic elderly, family, and caregiver profiles.',
      credentials: {
        elderly: { email: 'margaret@eldercare.test', password: 'password123', profileId: 'ELD-7842', passcode: 'CARE78' },
        family: { email: 'sarah.vance@eldercare.test', password: 'password123' },
        caregiver: { email: 'david.miller@eldercare.test', password: 'password123' },
      },
    });
  } catch (err) {
    console.error('Demo reset error:', err);
    res.status(500).json({ error: 'Failed to reset demo dataset.' });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);

// Nested profile routes
app.use('/api/profiles/:profileId/medications', medicationRoutes);
app.use('/api/profiles/:profileId/adherence', adherenceRoutes);
app.use('/api/profiles/:profileId/appointments', appointmentRoutes);
app.use('/api/profiles/:profileId/inventory', inventoryRoutes);
app.use('/api/profiles/:profileId/emergency', emergencyRoutes);
app.use('/api/profiles/:profileId/care-circle', careCircleRoutes);
app.use('/api/profiles/:profileId/notifications', notificationRoutes);
app.use('/api/profiles/:profileId/daily-summary', summaryRoutes);
app.use('/api/profiles/:profileId/escalation', escalationRoutes);

// Production Static Serving
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  console.log('Serving production frontend from:', clientDistPath);
  app.use(express.static(clientDistPath, {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
      // Long-term immutable caching for hashed Vite build assets
      if (filePath.includes('assets')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(clientDistPath, 'index.html'));
    }
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal server error occurred.' });
});

// Server Initialization
async function startServer() {
  try {
    console.log('ElderCare Connect server booting up...');
    await getDb();
    await seedDatabase(false); // seed if empty
    initScheduler();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 ElderCare Connect backend running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

export default app;
