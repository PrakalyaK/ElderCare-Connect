# ElderCare Connect 🌿
> **An Intelligent Elderly Care & Medication Management Platform**  
> Developed for the **PromptWars × Catalyst** Hackathon by **Hack2Skill**  
> *Track: Elderly Care & Medication Management Platform*

---

## 📖 Executive Summary

ElderCare Connect is a full-stack healthcare ecosystem designed to put elderly individuals at the center of their healthcare decisions while maintaining synchronization and peace of mind across their trusted **Care Circle** (family members, physicians, and home caregivers).

Unlike generic reminder applications that fire notifications into a void, ElderCare Connect implements **verified dose confirmation**, **autonomous multi-tier missed-dose escalation**, **hands-free voice interaction**, **inventory auto-depletion**, and an **audited accountability trail**.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph Frontend["Frontend Layer (React 18 + Vite + Tailwind CSS)"]
        UI[Elderly-Friendly UI & Dashboard]
        Voice[Web Speech Voice Assistant]
        Sim[Missed-Dose Escalation Simulator]
        Mode[Elderly High-Contrast Mode]
    end

    subgraph Backend["Backend API Layer (Express.js + Node.js)"]
        Auth[JWT & Bcrypt Passcode Engine]
        Scheduler[Node-Cron Background Engine]
        Escalation[Multi-Tier Escalation Pipeline]
        Mailer[Nodemailer Notification Dispatcher]
    end

    subgraph Database["Data Layer (PostgreSQL / Neon & Drizzle ORM)"]
        Users[(Users & Roles)]
        Profiles[(Elderly Healthcare Profiles)]
        Access[(Passcode-Authorized Care Circle)]
        Medications[(Medications & Daily Schedules)]
        Logs[(Dose Confirmation Logs)]
        Inventory[(Medicine Inventory & Refills)]
        Appts[(Doctor Appointments)]
        Notifications[(Audit & Notification Logs)]
        Activity[(Accountability Audit Trail)]
    end

    UI --> Auth
    UI --> Escalation
    Voice --> UI
    Backend --> Database
    Scheduler --> Escalation
    Escalation --> Mailer
    Mailer --> SMTP[(SMTP / Ethereal Test Mailer)]
```

---

## 🚀 Key Differentiating Innovations

### 1. 🚨 Smart Multi-Tier Missed-Dose Escalation
A dose reminder is **never** assumed to be taken. If a dose is left unconfirmed, the platform executes a progressive, configurable escalation protocol:
- **T + 0 min (Scheduled Time):** Dose enters pending status. Upcoming notification dispatched.
- **T + 15 min (Overdue):** Marked unconfirmed. Automated **Tier 1 gentle reminder** dispatched via email and in-app to the elderly user.
- **T + 45 min (Critical Delay):** Automatically flagged as **Missed (Tier 2 Escalation)**. High-priority escalation alerts and emails dispatched to all authorized caregivers and family members in the Care Circle.
- **Interactive Simulator:** Test this workflow in real time with the built-in Escalation Simulator without waiting 45 real-world minutes!

```mermaid
stateDiagram-v2
    [*] --> Scheduled: Daily Schedule Active
    Scheduled --> Taken: Confirmed by Patient or Nurse (Stock -1)
    Scheduled --> Tier1Overdue: 15 Mins Unconfirmed
    Tier1Overdue --> Taken: Confirmed by Patient or Nurse
    Tier1Overdue --> Tier2CaregiverEscalated: 45 Mins Unconfirmed
    Tier2CaregiverEscalated --> CaregiverFollowup: Email Alert Sent to Care Circle
```

### 2. 🎙️ Voice-Assisted Elderly Mode (Web Speech API)
Elderly individuals can interact hands-free using natural voice commands:
- *"What medicines do I have today?"* — Reads out today's schedule and upcoming times.
- *"Show my next appointment"* — Details next doctor visit and hospital location.
- *"Mark my medicine as taken"* — Logs the dose as taken hands-free.
- *"Read daily summary"* — Reads aloud the morning or evening care briefing in a calm cadence.
- *Visual Accessibility:* High-contrast touch buttons provide a complete visual alternative for individuals with hearing or speech impediments.

### 3. ☀️ Daily Care Summary & Audio Briefing
A morning and evening plain-language briefing generated dynamically:
> *"Good morning, Margaret! Today you have 4 scheduled medicines. You have taken 2 so far. Your next dose is Metformin HCl at 19:30. You also have a doctor visit with Dr. Robert Smith at St. Jude Pavilion on Friday."*

### 4. 👥 Care Circle & Audited Accountability Trail
- Secure passcode-based access: Elderly users generate a unique **Profile ID** (e.g. `ELD-7842`) and **Passcode** (e.g. `CARE78`).
- Family members and caregivers request access using the ID and passcode.
- Role-based granular permissions: `canRecordMeds`, `canEditSchedule`, `canReceiveAlerts`.
- The elderly user can revoke or modify access anytime.
- Verifiable audit logs record exactly who took each action (e.g., *"David Miller, RN confirmed dose taken for Lisinopril 10mg at 08:32 AM"*).

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, React Router v6, Lucide React, Recharts |
| **Backend** | Node.js (v22+), Express.js, REST APIs |
| **Database** | PostgreSQL / Neon DB, Drizzle ORM, `@electric-sql/pglite` (Zero-Config Embedded Fallback) |
| **Integrations** | Nodemailer, Node Cron, Web Speech Recognition & Synthesis APIs, BcryptJS, JWT |
| **Security** | Express Rate Limiter, Bcrypt Passcode Hashing, Multi-Tenant Profile Isolation |

---

## 🔑 Demo Credentials (Pre-Seeded)

| Role | Name | Email | Password | Access Credentials |
|---|---|---|---|---|
| **Elderly Patient** | Margaret Vance | `margaret@eldercare.test` | `password123` | **Profile ID:** `ELD-7842`<br>**Passcode:** `CARE78` |
| **Family Member** | Sarah Vance (Daughter) | `sarah.vance@eldercare.test` | `password123` | Connected to `ELD-7842` (Full Access) |
| **Caregiver / Nurse** | David Miller, RN | `david.miller@eldercare.test` | `password123` | Connected to `ELD-7842` (Med Manager) |

> 💡 **1-Click Reset:** Use the *"Reset Demo Dataset"* button on the landing page or settings page to restore the database to this clean pre-seeded state anytime.

---

## 🧪 Comprehensive Workflow Verification

All 12 essential workflows specified in the PromptWars challenge have automated test coverage passing **9/9 test suites with 0 failures**:

```
TAP version 13
ok 1 - Setup: Initialize Database Connection
ok 2 - Workflow 1: Register an Elderly User
ok 3 - Workflow 2: Create Elderly Healthcare Profile with Unique ID & Passcode
ok 4 - Workflow 3 & 4: Add Medication and Configure Scheduled Timings
ok 5 - Workflow 5: Access Elderly Profile using Caregiver Passcode
ok 6 - Workflow 6 & 7: Mark Medication as Taken & Verify Dose Log & Stock Decrement
ok 7 - Workflow 8 & 9: Simulate Missed Dose, Notification Generation and Multi-Tier Escalation
ok 8 - Workflow 10 & 11: Create Doctor Appointment & Verify Reminder Pipeline
ok 9 - Workflow 12: Revoke Caregiver Access and Verify Access is Denied
# tests 9 | suites 1 | pass 9 | fail 0
```

To run the automated tests locally:
```bash
npm run test
```

---

## 📦 Installation & Local Setup

### Prerequisites
- Node.js v18+ (tested on Node v22)
- npm v9+

### 1. Clone & Install
```bash
git clone https://github.com/prakalyak/ElderCare-Connect.git
cd ElderCare-Connect

# Install dependencies across server and client
npm run install:all
```

### 2. Configure Environment Variables (Optional)
The project comes pre-configured with a zero-config setup using an embedded persistent PostgreSQL engine (`PGlite`) and Ethereal test mailer out of the box!

To connect external cloud services (Neon PostgreSQL, custom SMTP):
Create `server/.env`:
```env
PORT=5000
JWT_SECRET=your_super_secret_jwt_key
DATABASE_URL=postgresql://user:pass@ep-sample.neon.tech/eldercare?sslmode=require
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM="ElderCare Connect" <notifications@eldercareconnect.app>
```

### 3. Run Development Servers
```bash
# In terminal 1 (Backend):
npm run dev:server

# In terminal 2 (Frontend with hot reload):
npm run dev:client
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000`

### 4. Production Build & Run
```bash
# Build React client
npm run build

# Start production server (serves both API & Frontend)
npm start
```
Open `http://localhost:5000` in your browser.

---

## 📡 REST API Documentation

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register new user (Elderly, Family, or Caregiver).
- `POST /api/auth/login` — Sign in and obtain JWT bearer token.
- `GET /api/auth/me` — Retrieve active authenticated user session & authorized profiles.
- `PUT /api/auth/toggle-elderly-mode` — Persist elderly mode preference.

### Healthcare Profiles (`/api/profiles`)
- `POST /api/profiles` — Create elderly profile, generating unique ID (`ELD-XXXX`) and hashed passcode.
- `GET /api/profiles/my` — List all profiles owned or authorized for current user.
- `POST /api/profiles/join` — Request access using Profile ID and Passcode.
- `POST /api/profiles/:id/passcode/reset` — Reset and regenerate access passcode.

### Medication Management (`/api/profiles/:id/medications`)
- `GET /api/profiles/:id/medications` — List all medications with schedules & inventory.
- `POST /api/profiles/:id/medications` — Add medication with scheduled times & stock thresholds.
- `PUT /api/profiles/:id/medications/:medId` — Update medication details.
- `DELETE /api/profiles/:id/medications/:medId` — Remove medication.
- `GET /api/profiles/:id/medications/today-schedule` — Today's routine timeline & next dose.
- `POST /api/profiles/:id/medications/logs/:logId/mark-taken` — Mark dose taken (auto decrements inventory).
- `POST /api/profiles/:id/medications/logs/:logId/mark-skipped` — Mark dose skipped with reason.
- `GET /api/profiles/:id/medications/history` — Audited medication dose history with date filters.

### Adherence Analytics (`/api/profiles/:id/adherence`)
- `GET /api/profiles/:id/adherence` — Daily adherence %, 7-day trend array, missed dose list.

### Doctor Appointments (`/api/profiles/:id/appointments`)
- `GET /api/profiles/:id/appointments` — List upcoming and past appointments.
- `POST /api/profiles/:id/appointments` — Schedule new appointment.
- `POST /api/profiles/:id/appointments/:id/send-reminder` — Dispatch appointment reminder email.

### Medicine Inventory (`/api/profiles/:id/inventory`)
- `GET /api/profiles/:id/inventory` — Stock levels, threshold alerts, expiry dates.
- `POST /api/profiles/:id/inventory/:id/restock` — Add quantity and update expiry.

### Emergency Information (`/api/profiles/:id/emergency`)
- `GET /api/profiles/:id/emergency` — Critical medical card, allergies, contacts, active meds.
- `POST /api/profiles/:id/emergency/contacts` — Add emergency contact.
- `PUT /api/profiles/:id/emergency/details` — Update allergies, blood type, conditions, DNR.

### Care Circle (`/api/profiles/:id/care-circle`)
- `GET /api/profiles/:id/care-circle` — Members roster, roles, permissions, joined date.
- `PUT /api/profiles/:id/care-circle/:accessId` — Owner updates permissions.
- `DELETE /api/profiles/:id/care-circle/:accessId` — Owner revokes access.
- `GET /api/profiles/:id/care-circle/activity` — Audit feed of who took what actions.

### Automated Notifications (`/api/profiles/:id/notifications`)
- `GET /api/profiles/:id/notifications` — In-app notification and email delivery logs.
- `POST /api/profiles/:id/notifications/test-email` — Test live Nodemailer dispatch.

### Daily Summary (`/api/profiles/:id/daily-summary`)
- `GET /api/profiles/:id/daily-summary` — Natural-language spoken care briefing.

### Smart Escalation Simulation (`/api/profiles/:id/escalation`)
- `GET /api/profiles/:id/escalation/status` — Escalation state of today's doses.
- `POST /api/profiles/:id/escalation/simulate` — Advance dose to Tier 1 (+15m) or Tier 2 (+45m).

---

## ☁️ Deployment Guide

### Option 1: Unified Monorepo (Render / Railway)
1. Push repository to GitHub.
2. In Render or Railway, create a **Web Service** connected to your repository.
3. Build Command: `npm run install:all && npm run build`
4. Start Command: `npm start`
5. Environment Variables:
   - `PORT=5000`
   - `DATABASE_URL` (Neon PostgreSQL connection string)
   - `JWT_SECRET` (Strong random string)
   - `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` (Optional SMTP credentials)

### Option 2: Split Frontend (Vercel) & Backend (Render)
1. **Database:** Create a free PostgreSQL database on [Neon.tech](https://neon.tech).
2. **Backend:** Deploy `server/` to Render or Railway with `DATABASE_URL` pointing to Neon.
3. **Frontend:** Deploy `client/` to Vercel:
   - Root directory: `client`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Environment Variable: `VITE_API_BASE_URL=https://your-backend.onrender.com/api`

---

## 🛡️ Medical & Safety Disclaimer
ElderCare Connect is an assistive medication management, coordination, and reminder tool. It is **not** a certified medical device, diagnostic system, or substitute for emergency medical services (911). Patients should never double or adjust medication dosages without explicit instruction from their licensed prescribing physician or pharmacist.

---

## 👥 Authors & Hackathon
Built with care for the **PromptWars × Catalyst** Hackathon by **Hack2Skill**.  
*Theme: Elderly Care & Medication Management Platform*
