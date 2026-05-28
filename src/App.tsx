import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { SideNavBar } from './components/SideNavBar';
import { TopAppBar } from './components/TopAppBar';
import { SignIn } from './pages/SignIn';
import { Onboarding } from './pages/Onboarding';
import { Positions } from './pages/Positions';
import { MemberDirectory } from './pages/MemberDirectory';
import { SecretaryMemberRegistry } from './pages/SecretaryMemberRegistry';
import { SecretaryVerificationReview } from './pages/SecretaryVerificationReview';
import { MemberVerification } from './pages/MemberVerification';
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
  const { user, member, loading, verificationStatus, verificationError, refreshVerificationStatus, can } = useAuth();
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

  if (member && verificationError) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-6">
        <section className="max-w-lg bg-surface-container-low rounded-[2rem] p-8 text-center">
          <p className="text-primary text-[11px] font-black uppercase tracking-[0.2rem]">Verification Check Failed</p>
          <h1 className="mt-4 text-3xl font-black text-on-surface">Profile gate could not load</h1>
          <p className="mt-4 text-on-surface-variant font-semibold leading-7">
            Refresh the verification status before continuing.
          </p>
          <button
            onClick={() => void refreshVerificationStatus()}
            className="mt-6 min-h-12 px-6 rounded-full bg-primary text-white text-xs font-black uppercase tracking-[0.16rem] hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Retry
          </button>
        </section>
      </div>
    );
  }

  const verificationGateActive = Boolean(verificationStatus?.is_gate_required && !verificationStatus.is_complete);
  const canAdministerVerification = can('verification.manage');
  const verificationAllowedPath =
    location.pathname === '/verify'
    || location.pathname === '/support'
    || (canAdministerVerification && (location.pathname === '/admin/members' || location.pathname === '/admin/members/verification'));

  if (member && verificationGateActive && !verificationAllowedPath) {
    return <Navigate to="/verify" replace />;
  }

  if (location.pathname === '/verify') {
    return <MemberVerification />;
  }

  // 4. Check-In page is full-screen, open to all authenticated/onboarded users
  if (location.pathname === '/check-in') {
    return (
      <ProtectedRoute>
        <CheckIn />
      </ProtectedRoute>
    );
  }

  const focusedSecretaryVerification = location.pathname === '/admin/members/verification';

  return (
    <div className="flex min-h-screen bg-surface selection:bg-primary/30">
      <SideNavBar />
      <div className="flex-1 pl-20 transition-all duration-300">
        <TopAppBar showSearch={shouldShowTopBarSearch(location.pathname)} />
        <main className={focusedSecretaryVerification ? 'pt-20 pb-8 px-8' : 'pt-32 pb-20 px-12'}>
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
                  <ProtectedRoute permission="dashboard.view">
                    <Positions />
                  </ProtectedRoute>
                } />

                {/* Chairman weekly section report: restricted to officers */}
                <Route path="/dashboard/report" element={
                  <ProtectedRoute permission="reports.submit">
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
                  <ProtectedRoute permission="attendance.import">
                    <ImportAttendance />
                  </ProtectedRoute>
                } />

                {/* Forms Intake: Restricted to officers */}
                <Route path="/forms/intake" element={
                  <ProtectedRoute permission="forms.intake">
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
                  <ProtectedRoute permission="forms.builder.manage">
                    <FormBuilder />
                  </ProtectedRoute>
                } />

                {/* View form responses: Restricted to officers */}
                <Route path="/forms/responses" element={
                  <ProtectedRoute permission="forms.responses.view">
                    <FormResponses />
                  </ProtectedRoute>
                } />

                {/* Secretary Hub: Restricted to President/Secretary */}
                <Route path="/forms/secretary" element={
                  <ProtectedRoute anyPermissions={['attendance.import', 'forms.builder.manage', 'positions.manage']}>
                    <SecretaryHub />
                  </ProtectedRoute>
                } />

                {/* Excusal Review: Restricted to President, Secretary, SAA */}
                <Route path="/excusals/review" element={
                  <ProtectedRoute permission="excusals.review">
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
                  <ProtectedRoute permission="reports.view_all">
                    <AdminReports />
                  </ProtectedRoute>
                } />

                {/* Dues Tracking (Finance): Restricted to President, Secretary, Treasurer, Assistant Treasurer */}
                <Route path="/finance/dues" element={
                  <ProtectedRoute permission="finance.dues.view">
                    <DuesTracking />
                  </ProtectedRoute>
                } />

                {/* Placeholders */}
                <Route path="/roster" element={
                  <ProtectedRoute permission="roster.view">
                    <MemberDirectory />
                  </ProtectedRoute>
                } />
                <Route path="/admin/members" element={
                  <ProtectedRoute permission="admin.members.view">
                    <SecretaryMemberRegistry />
                  </ProtectedRoute>
                } />
                <Route path="/admin/members/verification" element={
                  <ProtectedRoute permission="admin.members.view">
                    <SecretaryVerificationReview />
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

const shouldShowTopBarSearch = (pathname: string) => {
  const routesWithLocalSearch = ['/events', '/roster', '/admin/members'];
  return !routesWithLocalSearch.some(route => pathname === route || pathname.startsWith(`${route}/`));
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
