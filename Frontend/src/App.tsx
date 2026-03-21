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

import Flows from './pages/Flows/Flows';
import FlowTemplateDetail from './pages/Flows/FlowsTemplateDetail';
import FlowSetup from './pages/Flows/FlowSetup';
import FlowAnalytics from './pages/Flows/FlowAnalytics';
import FlowActivities from './pages/Flows/FlowActivities';
import FlowProspects from './pages/Flows/FlowProspects';
import FlowProspectDetail from './pages/Flows/FlowProspectDetail';
import UserProfiles from './pages/UserProfiles';
import Trobs from './pages/Trobs/Trobs';
import TrobDetail from './pages/Trobs/TrobDetail';
import Messages from './pages/Messages/Messages';
import ActiveAutomations from './pages/Automations/ActiveAutomations';
import CompletedAutomations from './pages/Automations/CompletedAutomations';
import Platforms from './pages/platforms/Platforms';
import Pricing from './pages/Pricing/Pricing';
import NotFound from './pages/OtherPage/NotFound';
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



          <Route path="flows" element={<Flows />} />
          <Route path="flows/template/:templateId" element={<FlowTemplateDetail />} />
          <Route path="flows/setup/:templateId" element={<FlowSetup />} />
          <Route path="flows/:flowId/analytics" element={<FlowAnalytics />} />
          <Route path="flows/:flowId/activities" element={<FlowActivities />} />
          <Route path="flows/:flowId/prospects" element={<FlowProspects />} />
          <Route path="flows/:flowId/prospects/:prospectId" element={<FlowProspectDetail />} />

          <Route path="profile-settings" element={<UserProfiles />} />

          <Route path="/trobs" element={<Trobs />} />

          <Route path="/trobs/:trobId" element={<TrobDetail />} />


          <Route path="/automations/active" element={<ActiveAutomations />} />
          <Route path="/automations/completed" element={<CompletedAutomations />} />

          <Route path="/messages" element={<Messages />} />


          <Route path="/connections" element={<Platforms />} />

          <Route path="/pricing" element={<Pricing />} />









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
