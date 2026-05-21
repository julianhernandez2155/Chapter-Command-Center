import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShieldAlert } from 'lucide-react';
import { Permission, hasAllPermissions, hasAnyPermission, isOfficerPosition } from '../lib/permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requireOfficer?: boolean;
  permission?: Permission;
  anyPermissions?: Permission[];
  allPermissions?: Permission[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles = [],
  requireOfficer = false,
  permission,
  anyPermissions = [],
  allPermissions = []
}) => {
  const { user, member, roles, permissions, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="relative flex flex-col items-center">
          <div className="w-16 h-16 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="mt-6 text-sm text-text-muted font-mono tracking-widest uppercase animate-pulse">
            Authenticating...
          </p>
        </div>
      </div>
    );
  }

  // 1. Unauthenticated -> Redirect to sign-in
  if (!user) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // 2. Authenticated but no member profile -> Force onboarding (unless already there)
  if (!member && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // 3. Authenticated & Onboarded -> Check role requirements
  const isOfficer = roles.some(isOfficerPosition);

  const hasAllowedRole = allowedRoles.length === 0 || roles.some(role => allowedRoles.includes(role));
  const satisfiesOfficerReq = !requireOfficer || isOfficer;
  const satisfiesSinglePermission = !permission || permissions.includes(permission);
  const satisfiesAnyPermissions = anyPermissions.length === 0 || hasAnyPermission(permissions, anyPermissions);
  const satisfiesAllPermissions = allPermissions.length === 0 || hasAllPermissions(permissions, allPermissions);

  const isAuthorized = hasAllowedRole
    && satisfiesOfficerReq
    && satisfiesSinglePermission
    && satisfiesAnyPermissions
    && satisfiesAllPermissions;

  if (!isAuthorized) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-surface-nav/20 border border-border/40 rounded-3xl backdrop-blur-md">
        <div className="p-4 bg-error/10 border border-error/20 text-error rounded-2xl mb-6">
          <ShieldAlert className="w-12 h-12" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-text">Access Denied</h2>
        <p className="mt-2 text-sm text-text-muted text-center max-w-md">
          Your credentials do not grant access to this security tier. Contact the Chapter Secretary if you believe this is an error.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
