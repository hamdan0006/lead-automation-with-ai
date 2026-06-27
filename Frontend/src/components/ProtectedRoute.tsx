import React from 'react';
import { Navigate, useLocation } from 'react-router';
import useAuthStore from '../stores/useAuthStore';
import Loader from './ui/loader/Loader';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireEmailVerification?: boolean;
  /** If provided, only users with one of these roles may access this route. */
  allowedRoles?: string[];
}

const ProtectedRoute = ({
  children,
  requireEmailVerification = false,
  allowedRoles,
}: ProtectedRouteProps) => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const isLoading = useAuthStore(state => state.isLoading);
  const user = useAuthStore(state => state.user);

  const location = useLocation();

  const [showLoader, setShowLoader] = React.useState(true);

  React.useEffect(() => {
    if (isLoading) {
      setShowLoader(true);
    } else {
      const timer = setTimeout(() => {
        setShowLoader(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (showLoader) {
    return <Loader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requireEmailVerification && user && !user.emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  // VIEWERs can only access the welcome page
  if (user?.role === 'VIEWER' && location.pathname !== '/welcome') {
    return <Navigate to="/welcome" replace />;
  }

  // Route-level role restriction (for admin-only pages)
  if (allowedRoles && user?.role && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
