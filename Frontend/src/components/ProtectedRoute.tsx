import React from 'react';
import { Navigate, useLocation } from 'react-router';
import useAuthStore from '../stores/useAuthStore';
import Loader from './ui/loader/Loader';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireEmailVerification?: boolean;
}

const ProtectedRoute = ({
  children,
  requireEmailVerification = false,
}: ProtectedRouteProps) => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const isLoading = useAuthStore(state => state.isLoading);
  const user = useAuthStore(state => state.user);

  const location = useLocation();

  /* 
    Enforce a minimum loading time to show the verified animation 
    and prevent flickering on fast connections.
  */
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
    return (
      <Navigate
        to="/login"   // ✅ FIXED
        replace
        state={{ from: location }}
      />
    );
  }

  if (requireEmailVerification && user && !user.emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
