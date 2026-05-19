import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ScrollToTop from './components/common/ScrollToTop';
import { Layout } from './components/layout/Layout';
import AIKitchen from './pages/AIKitchen';
import Calendar from './pages/Calendar';
import DailyPlan from './pages/DailyPlan';
import Meals from './pages/Meals';
import RecipeDetail from './pages/RecipeDetail';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import Settings from './pages/Settings';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ForceChangePassword from './pages/ForceChangePassword';

import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';

import ParentDashboard from './pages/ParentDashboard';
import NutritionistDashboard from './pages/NutritionistDashboard';
import { useAuth } from './context/AuthContext';

import ClientDetails from './pages/ClientDetails';
import MealHistory from './pages/MealHistory';
import ProtectedRoute from './components/ProtectedRoute';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsersList from './pages/AdminUsersList';
import AdminAuditLogs from './pages/AdminAuditLogs';
import AdminAIHealth from './pages/AdminAIHealth';
import AdminDataOversight from './pages/AdminDataOversight';

import config from '../../env_config';
import Maintenance from './pages/Maintenance';

function AppContent() {
  const { user } = useAuth();

  if (config.maintenanceMode) {
    return <Maintenance />;
  }

  return (
    <Router>
      <ScrollToTop />
      <Routes>
        {/* Public Routes - No Layout */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/maintenance" element={<Maintenance />} />
        
        {/* Force Password Reset - Dedicated Top Level Route */}
        <Route path="/force-password-reset" element={
          <ProtectedRoute>
            <ForceChangePassword />
          </ProtectedRoute>
        } />

        {/* Protected Routes - Wrapped in Layout and ProtectedRoute */}
        <Route path="/*" element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={
                  user?.role === 'admin' ? <AdminDashboard /> : 
                  user?.role === 'nutritionist' ? <NutritionistDashboard /> : 
                  <ParentDashboard />
                } />
                <Route path="/parent-dashboard" element={<ParentDashboard />} />
                <Route path="/nutritionist-dashboard" element={<NutritionistDashboard />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/daily-plan" element={<DailyPlan />} />
                <Route path="/ai-kitchen" element={<AIKitchen />} />
                <Route path="/meals" element={<Meals />} />
                <Route path="/meals/:id" element={<RecipeDetail />} />
                <Route path="/meal-history" element={<MealHistory />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />

                {/* Nutritionist Routes */}
                <Route path="/nutritionist/client/:clientId" element={
                  <ProtectedRoute requiredRole="nutritionist">
                    <ClientDetails />
                  </ProtectedRoute>
                } />
                {/* Admin Routes */}
                <Route path="/admin" element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/admin/users" element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminUsersList />
                  </ProtectedRoute>
                } />
                <Route path="/admin/audit" element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminAuditLogs />
                  </ProtectedRoute>
                } />
                <Route path="/admin/ai-health" element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminAIHealth />
                  </ProtectedRoute>
                } />
                <Route path="/admin/data" element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminDataOversight />
                  </ProtectedRoute>
                } />
              </Routes>
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

import { ProfileProvider } from './context/ProfileContext';
import { LoadingProvider } from './context/LoadingContext';
import { MealLoggerProvider } from './context/MealLoggerContext';

function App() {
  return (
    <AuthProvider>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <ProfileProvider>
          <LoadingProvider>
            <MealLoggerProvider>
              <AppContent />
            </MealLoggerProvider>
          </LoadingProvider>
        </ProfileProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
