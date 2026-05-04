import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import AIKitchen from './pages/AIKitchen';
import Calendar from './pages/Calendar';
import Meals from './pages/Meals';
import RecipeDetail from './pages/RecipeDetail';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import Settings from './pages/Settings';

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

function AppContent() {
  const { user } = useAuth();

  return (
    <Router>
      <Routes>
        {/* Public Routes - No Layout */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/onboarding" element={<Onboarding />} />

        {/* Protected Routes - Wrapped in Layout */}
        <Route path="/*" element={
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

            </Routes>
          </Layout>
        } />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
