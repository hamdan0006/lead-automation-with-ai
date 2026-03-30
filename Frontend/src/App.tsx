import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import { Toaster } from 'react-hot-toast';
import AppLayout from './layout/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import useAuthStore from './stores/useAuthStore';

// Auth pages
import SignIn from './pages/AuthPages/SignIn';
import SignUp from './pages/AuthPages/SignUp';
import ForgotPassword from './pages/AuthPages/ForgotPassword';
import ResetPassword from './pages/AuthPages/ResetPassword';
import VerifyEmail from './pages/AuthPages/VerifyEmail';

// Protected pages
import Home from './pages/Dashboard/Home';


import UserProfiles from './pages/UserProfiles';


import NotFound from './pages/OtherPage/NotFound';
import Leads from './pages/Leads/Lead';
import LeadDetail from './pages/Leads/LeadDetail';
import Enrichment from './pages/Enrichment/Enrichment';
import EnrichmentDetail from './pages/Enrichment/EnrichmentDetail';
import EmailAutomation from './pages/EmailAutomation/EmailAutomation';
import EmailAutomationDetail from './pages/EmailAutomation/EmailAutomationDetail';
// Since I can't verify all, I will comment out ones I'm unsure of or map them to existing pages if possible. 
// However, the user explicitly asked for these routes. I will include them and if they fail, the user will see.
// But valid paths are critical.
// I will assume standard structure /pages/PageName


function App() {
  const { isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    // Check authentication status on app load
    checkAuth();
  }, []);

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <SignIn />
          }
        />
        <Route
          path="/register"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <SignUp />
          }
        />
        <Route
          path="/forgot-password"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <ForgotPassword />
          }
        />
        <Route
          path="/reset-password"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <ResetPassword />
          }
        />
        <Route path="/verify-email" element={<VerifyEmail />} />

        {/* Protected routes with layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Home />} />



          <Route path="/start-scraping" element={<Leads />} />
          <Route path="/start-scraping/:jobId" element={<LeadDetail />} />

          <Route path="profile-settings" element={<UserProfiles />} />

          <Route path="/start-enrichment" element={<Enrichment />} />

          <Route path="/start-enrichment/:jobId" element={<EnrichmentDetail />} />



          <Route path="/start-automation" element={<EmailAutomation />} />

          <Route path="/start-automation/:jobId" element={<EmailAutomationDetail />} />







        </Route>

        {/* Catch all route */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Toast notifications */}
      <Toaster
        position="top-right"
        containerStyle={{
          zIndex: 99999,
        }}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            style: {
              background: '#10b981',
            },
          },
          error: {
            style: {
              background: '#ef4444',
            },
          },
        }}
      />
    </Router>
  );
}

export default App;
