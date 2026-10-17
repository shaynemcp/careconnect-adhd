import { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { getSession } from './auth/mockAuth';
import { AppProvider } from './context/AppContext';
import { ProtectedRoute, RoleRoute, AuthRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import { ROUTER_BASENAME } from './config/basePath';

// Public pages (do not modify)
import Landing     from './pages/Landing';
import SignIn      from './pages/SignIn';
import SignUp      from './pages/SignUp';
import RoleChooser from './pages/RoleChooser';

// App pages (do not modify). Each loads as its own chunk the first time it is
// opened, so the public pages don't download every signed-in screen (A10 Part 3).
// The service worker precaches every chunk, so they still open offline.
const Today        = lazy(() => import('./pages/Today'));
const Schedule     = lazy(() => import('./pages/Schedule'));
const Appointments = lazy(() => import('./pages/Appointments'));
const Medications  = lazy(() => import('./pages/Medications'));
const Memories     = lazy(() => import('./pages/Memories'));
const Contacts     = lazy(() => import('./pages/Contacts'));
const Caregiver    = lazy(() => import('./pages/Caregiver'));
const CaregiverDashboard    = lazy(() => import('./pages/CaregiverDashboard'));
const ActivityLog           = lazy(() => import('./pages/ActivityLog'));
const ManageMedications     = lazy(() => import('./pages/ManageMedications'));
const ManageAppointments    = lazy(() => import('./pages/ManageAppointments'));
import DesktopIntegration  from './desktop/DesktopIntegration';

import type { AppView } from './types';

// ── Inner app shell ────────────────────────────────────────────────────────────

function AppShell() {
  const { setRole, signOut } = useAuth();
  const { pathname } = useLocation();

  // Initialise the view from the PERSISTED role (read synchronously from
  // storage). The auth context's `role` hydrates asynchronously and is null on
  // the first render, so deriving the view from it would default every fresh
  // load — including direct loads of caregiver screens — to the patient view.
  // Reading the persisted session here makes the caregiver chrome (sidebar +
  // role chip) render consistently on every caregiver screen.
  const [view, setView] = useState<AppView>(() =>
    getSession()?.role === 'caregiver' ? 'caregiver' : 'patient',
  );

  // Switch role: update local view state AND persist the new role so the
  // next sign-in skips the chooser and lands on the correct view.
  function handleSwitchRole() {
    const next: AppView = view === 'patient' ? 'caregiver' : 'patient';
    setView(next);
    setRole(next);           // persists via AuthContext → mockAuth
  }

  return (
    <ProtectedRoute>
      <Layout view={view} onSwitchRole={handleSwitchRole} onSignOut={signOut}>
        {/* A screen that fails (often a chunk that didn't load) shows a recovery message inside
            the layout, so navigation still works; moving to another screen clears it. */}
        <ErrorBoundary resetKey={pathname}>
        <Suspense fallback={<p role="status" className="p-6 text-lg">Loading…</p>}>
        <Routes>
          {/* Patient sees the calm "Today" screen; caregiver sees the dashboard */}
          <Route index                        element={view === 'patient' ? <Today /> : <CaregiverDashboard />} />
          <Route path="schedule"              element={<Schedule />} />
          <Route path="appointments"          element={<Appointments />} />
          <Route path="medications"           element={<Medications />} />
          <Route path="memories"              element={<Memories />} />
          <Route path="contacts"              element={<Contacts />} />
          <Route path="caregiver"             element={<Caregiver />} />
          <Route path="activity"              element={<ActivityLog />} />
          <Route path="manage-medications"    element={<ManageMedications />} />
          <Route path="manage-appointments"   element={<ManageAppointments />} />
          <Route path="*"                     element={<Navigate to="/app" replace />} />
        </Routes>
        </Suspense>
        </ErrorBoundary>
      </Layout>
    </ProtectedRoute>
  );
}

// ── Route tree ─────────────────────────────────────────────────────────────────

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/"       element={<Landing />} />
      <Route path="/signin" element={<AuthRoute><SignIn /></AuthRoute>} />
      <Route path="/signup" element={<AuthRoute><SignUp /></AuthRoute>} />

      {/* Post-auth role chooser */}
      <Route path="/role"   element={<RoleRoute><RoleChooser /></RoleRoute>} />

      {/* Protected app */}
      <Route path="/app/*"  element={<AppShell />} />

      {/* Legacy path shims — Home.tsx still links to these old paths.
          Redirect them into the /app/* namespace so they resolve correctly. */}
      <Route path="/schedule"    element={<Navigate to="/app/schedule"    replace />} />
      <Route path="/medications" element={<Navigate to="/app/medications" replace />} />
      <Route path="/memories"    element={<Navigate to="/app/memories"    replace />} />
      <Route path="/contacts"    element={<Navigate to="/app/contacts"    replace />} />
      <Route path="/caregiver"   element={<Navigate to="/app/caregiver"   replace />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    // basename: the app runs under /careconnect-adhd/ on GitHub Pages (config/basePath.ts).
    <BrowserRouter basename={ROUTER_BASENAME}>
      <AuthProvider>
        <AppProvider>
          <DesktopIntegration />
          {/* Last line of defence for the public pages and anything outside the app layout. */}
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
