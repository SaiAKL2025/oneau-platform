import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { NotificationProvider } from './contexts/NotificationContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudentDashboard from './pages/student/StudentDashboard';
import OrgDashboard from './pages/organization/OrgDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import LandingPage from './pages/LandingPage';
import OrganizationStatusPage from './pages/OrganizationStatusPage';
import AuthCallback from './pages/AuthCallback';
import GoogleProfileCompletion from './pages/GoogleProfileCompletion';
import EmailVerification from './pages/EmailVerification';
import VerifyEmailCodePage from './pages/VerifyEmailCodePage';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && user?.role && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  
  return children;
}

function AppRoutes() {
  const { isAuthenticated, user } = useAuth();
  
  // Debug logging
  console.log('🔍 AppRoutes - isAuthenticated:', isAuthenticated, 'user:', user);
  
  return (
    <Routes>
      <Route path="/" element={
        isAuthenticated ? (
          user?.role === 'student' ? <Navigate to="/student" replace /> :
          user?.role === 'organization' ? (
            user?.status === 'pending' || user?.status === 'suspended' ? <Navigate to="/organization-status" replace /> :
            <Navigate to="/organization" replace />
          ) :
          user?.role === 'admin' ? <Navigate to="/admin" replace /> :
          <LandingPage />
        ) : <LandingPage />
      } />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<EmailVerification />} />
      <Route path="/verify-email-code" element={<VerifyEmailCodePage />} />
      <Route path="/google-complete" element={<GoogleProfileCompletion />} />
      <Route path="/organization-status" element={<OrganizationStatusPage />} />
      <Route path="/student/*" element={
        <ProtectedRoute allowedRoles={['student']}>
          <StudentDashboard />
        </ProtectedRoute>
      } />
      <Route path="/organization/*" element={
        <ProtectedRoute allowedRoles={['organization']}>
          <OrgDashboard />
        </ProtectedRoute>
      } />
      <Route path="/admin/*" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/auth/callback" element={<AuthCallback />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <NotificationProvider>
          <Router>
            <div className="min-h-screen bg-gray-50">
              <AppRoutes />
            </div>
          </Router>
        </NotificationProvider>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;