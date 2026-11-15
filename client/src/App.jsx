import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useProfile } from './context/ProfileContext';

// Components
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { VoiceAssistantModal } from './components/VoiceAssistantModal';
import { EscalationSimulatorModal } from './components/EscalationSimulatorModal';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { CreateProfilePage } from './pages/CreateProfilePage';
import { JoinProfilePage } from './pages/JoinProfilePage';
import { DashboardPage } from './pages/DashboardPage';
import { MedicationsPage } from './pages/MedicationsPage';
import { MedicationHistoryPage } from './pages/MedicationHistoryPage';
import { AdherencePage } from './pages/AdherencePage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { InventoryPage } from './pages/InventoryPage';
import { CareCirclePage } from './pages/CareCirclePage';
import { EmergencyPage } from './pages/EmergencyPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { SettingsPage } from './pages/SettingsPage';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export function App() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [escalationModalOpen, setEscalationModalOpen] = useState(false);

  // Check if current route is full-screen unauthenticated view (landing, login, register, create/join)
  const isAuthOrLanding = ['/', '/login', '/register', '/create-profile', '/join-profile'].includes(location.pathname);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Top Navbar */}
      <Navbar
        onOpenVoiceAssistant={() => setVoiceModalOpen(true)}
        onOpenEscalationSimulator={() => setEscalationModalOpen(true)}
      />

      {/* Main Layout Area */}
      {isAuthenticated && !isAuthOrLanding ? (
        <div className="flex-1 flex overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/dashboard" element={<DashboardPage onOpenVoiceAssistant={() => setVoiceModalOpen(true)} onOpenEscalationSimulator={() => setEscalationModalOpen(true)} />} />
              <Route path="/medications" element={<MedicationsPage />} />
              <Route path="/history" element={<MedicationHistoryPage />} />
              <Route path="/adherence" element={<AdherencePage />} />
              <Route path="/appointments" element={<AppointmentsPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/care-circle" element={<CareCirclePage />} />
              <Route path="/emergency" element={<EmergencyPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      ) : (
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/create-profile" element={<ProtectedRoute><CreateProfilePage /></ProtectedRoute>} />
            <Route path="/join-profile" element={<ProtectedRoute><JoinProfilePage /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage onOpenVoiceAssistant={() => setVoiceModalOpen(true)} onOpenEscalationSimulator={() => setEscalationModalOpen(true)} /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      )}

      {/* Voice Assistant Modal (Global) */}
      <VoiceAssistantModal
        isOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        onActionExecuted={() => {
          // Trigger refresh if needed
        }}
      />

      {/* Escalation Simulator Modal (Global) */}
      <EscalationSimulatorModal
        isOpen={escalationModalOpen}
        onClose={() => setEscalationModalOpen(false)}
        onEscalationTriggered={() => {
          // Trigger refresh if needed
        }}
      />
    </div>
  );
}
export default App;
