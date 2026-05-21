import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { SideNavBar } from './components/SideNavBar';
import { TopAppBar } from './components/TopAppBar';
import { SignIn } from './pages/SignIn';
import { Onboarding } from './pages/Onboarding';
import { Positions } from './pages/Positions';
import { Events } from './pages/Events';
import { EventDetails } from './pages/EventDetails';
import { CheckIn } from './pages/CheckIn';
import { ImportAttendance } from './pages/ImportAttendance';
import { FormIntake } from './pages/FormIntake';
import { FormStatus } from './pages/FormStatus';
import { FormBuilder } from './pages/FormBuilder';
import { FormResponses } from './pages/FormResponses';
import { SecretaryHub } from './pages/SecretaryHub';
import { ExcusalReview } from './pages/ExcusalReview';
import { MemberExcusals } from './pages/MemberExcusals';
import { DuesTracking } from './pages/DuesTracking';
import { ChairmanReport } from './pages/ChairmanReport';
import { AdminReports } from './pages/AdminReports';
import { AnimatePresence, motion } from 'motion/react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DevPersonaSwitcher } from './components/DevPersonaSwitcher';

const AppContent = () => {
  const { user, member, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="relative flex flex-col items-center">
          <div className="w-16 h-16 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="mt-6 text-sm text-text-muted font-mono tracking-widest uppercase animate-pulse">
            Loading System Session...
          </p>
        </div>
      </div>
    );
  }

  // 1. Unauthenticated users only see the Sign In page
  if (!user) {
    return (
      <>
        <SignIn />
        <DevPersonaSwitcher />
      </>
    );
  }

  // 2. Authenticated but profile-less users must onboard
  if (!member && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // 3. Onboarding screen itself (profile creation flow)
  if (location.pathname === '/onboarding' && !member) {
    return <Onboarding onComplete={() => {}} />;
  }

  // 4. Check-In page is full-screen, open to all authenticated/onboarded users
  if (location.pathname === '/check-in') {
    return (
      <ProtectedRoute>
        <CheckIn />
      </ProtectedRoute>
    );
  }

  return (
    <div className="flex min-h-screen bg-surface selection:bg-primary/30">
      <SideNavBar />
      <div className="flex-1 pl-20 transition-all duration-300">
        <TopAppBar 
          title={getPageTitle(location.pathname)} 
          subtitle={getPageSubtitle(location.pathname)}
        />
        <main className="pt-32 pb-20 px-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Routes location={location}>
                {/* General dashboard: available to any active member */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Positions />
                  </ProtectedRoute>
                } />

                {/* Chairman weekly section report: restricted to officers */}
                <Route path="/dashboard/report" element={
                  <ProtectedRoute requireOfficer>
                    <ChairmanReport />
                  </ProtectedRoute>
                } />

                {/* Event listings and details: available to all members */}
                <Route path="/events" element={
                  <ProtectedRoute>
                    <Events />
                  </ProtectedRoute>
                } />
                <Route path="/events/:id" element={
                  <ProtectedRoute>
                    <EventDetails />
                  </ProtectedRoute>
                } />

                {/* Attendance import (Data Protocol): Restricted to President/Secretary */}
                <Route path="/attendance" element={
                  <ProtectedRoute allowedRoles={['president', 'secretary']}>
                    <ImportAttendance />
                  </ProtectedRoute>
                } />

                {/* Forms Intake: Restricted to officers */}
                <Route path="/forms/intake" element={
                  <ProtectedRoute requireOfficer>
                    <FormIntake />
                  </ProtectedRoute>
                } />

                {/* Form submission status: available to all members */}
                <Route path="/forms/status" element={
                  <ProtectedRoute>
                    <FormStatus />
                  </ProtectedRoute>
                } />

                {/* Form Builder: Restricted to President/Secretary */}
                <Route path="/forms/builder" element={
                  <ProtectedRoute allowedRoles={['president', 'secretary']}>
                    <FormBuilder />
                  </ProtectedRoute>
                } />

                {/* View form responses: Restricted to officers */}
                <Route path="/forms/responses" element={
                  <ProtectedRoute requireOfficer>
                    <FormResponses />
                  </ProtectedRoute>
                } />

                {/* Secretary Hub: Restricted to President/Secretary */}
                <Route path="/forms/secretary" element={
                  <ProtectedRoute allowedRoles={['president', 'secretary']}>
                    <SecretaryHub />
                  </ProtectedRoute>
                } />

                {/* Excusal Review: Restricted to President, Secretary, SAA */}
                <Route path="/excusals/review" element={
                  <ProtectedRoute allowedRoles={['president', 'secretary', 'saa']}>
                    <ExcusalReview />
                  </ProtectedRoute>
                } />

                {/* Member excusals view: available to all members */}
                <Route path="/excusals/status" element={
                  <ProtectedRoute>
                    <MemberExcusals />
                  </ProtectedRoute>
                } />

                {/* Admin consolidated compliance reports: Restricted to officers */}
                <Route path="/admin/reports" element={
                  <ProtectedRoute requireOfficer>
                    <AdminReports />
                  </ProtectedRoute>
                } />

                {/* Dues Tracking (Finance): Restricted to President, Secretary, Treasurer, Assistant Treasurer */}
                <Route path="/finance/dues" element={
                  <ProtectedRoute allowedRoles={['president', 'secretary', 'treasurer', 'assistant_treasurer']}>
                    <DuesTracking />
                  </ProtectedRoute>
                } />

                {/* Placeholders */}
                <Route path="/roster" element={
                  <ProtectedRoute>
                    <div className="text-center py-20 opacity-20 uppercase font-black tracking-[1rem]">Roster Protocol Pending</div>
                  </ProtectedRoute>
                } />
                <Route path="/archive" element={
                  <ProtectedRoute>
                    <div className="text-center py-20 opacity-20 uppercase font-black tracking-[1rem]">Archive Protocol Pending</div>
                  </ProtectedRoute>
                } />

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      
      {/* Dev persona switcher overlays in development env */}
      <DevPersonaSwitcher />
    </div>
  );
};

const getPageTitle = (pathname: string) => {
  if (pathname.startsWith('/events/')) return "Event Protocol";
  if (pathname === '/events') return "Chapter Events";
  if (pathname === '/dashboard') return "Chapter Command";
  if (pathname === '/attendance') return "Data Protocol";
  if (pathname === '/forms/intake') return "Form Intake";
  if (pathname === '/forms/status') return "Submission Status";
  if (pathname === '/forms/builder') return "Form Builder";
  if (pathname === '/forms/responses') return "Form Responses";
  if (pathname === '/forms/secretary') return "Secretary Hub";
  if (pathname === '/dashboard/report') return "Chairman Report";
  if (pathname === '/admin/reports') return "Reports compliance";
  if (pathname === '/excusals/review') return "Excusal Queue";
  if (pathname === '/excusals/status') return "My Excusals";
  if (pathname === '/finance/dues') return "Finance Protocol";
  return "Chapter Command Center";
};

const getPageSubtitle = (pathname: string) => {
  if (pathname === '/dashboard') return "Alpha Chapter Leadership Hierarchy";
  if (pathname === '/dashboard/report') return "Weekly Section Submission";
  if (pathname === '/admin/reports') return "Weekly Compliance & Submissions";
  if (pathname === '/events') return "Scheduling & Attendance Management";
  if (pathname === '/attendance') return "Attendance Import & Verification";
  if (pathname === '/forms/intake') return "Weekly Section Submission";
  if (pathname === '/forms/builder') return "Weekly Form Assembly";
  if (pathname === '/excusals/review') return "IVP Excusal Review Queue";
  if (pathname === '/finance/dues') return "Dues Payment Tracking";
  return undefined;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}
