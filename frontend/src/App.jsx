import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AccountsPage from './pages/AccountsPage';
import DashboardLayout from './layouts/DashboardLayout';
import LaboratoriesPage from './pages/LaboratoriesPage';
import ComponentsPage from './pages/ComponentsPage';
import LaboratoryComputersPage from './pages/LaboratoryComputersPage';
import LabResourcesPage from './pages/LabResourcesPage';
import ProfilePage from './pages/ProfilePage';
import ProtectedRoute from './components/ProtectedRoute';
import ThemedToaster from './components/ThemedToaster';
import { ReauthProvider } from './components/ReauthModal';

import { ThemeProvider } from './context/ThemeContext';
import ErrorPage from './pages/Error';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ReauthProvider>
          <ThemedToaster />
          <Router>
            <Routes>
              <Route path="/" element={<LoginPage />} />
              <Route path='/dashboard' element={<DashboardLayout />}>
                <Route index element={<DashboardPage />} />
                <Route element={<ProtectedRoute allowedRoles={['admin', 'it_head', 'lab_head']} />}>
                  <Route path='accounts' element={<AccountsPage />} />
                </Route>
                <Route element={<ProtectedRoute allowedRoles={['admin', 'it_head', 'lab_head']} />}>
                  <Route path='components' element={<ComponentsPage />} />
                </Route>
                <Route element={<ProtectedRoute allowedRoles={['admin', 'it_head', 'lab_head', 'it_technician', 'lab_assistant']} />}>
                  <Route path='laboratories' element={<LaboratoriesPage />} />
                  <Route path='laboratories/:id' element={<LaboratoryComputersPage />} />
                  <Route path='lab-resources' element={<LabResourcesPage />} />
                </Route>

                <Route path='profile' element={<ProfilePage />} />

                <Route path="*" element={<ErrorPage />} />

              </Route>

              <Route path="*" element={<ErrorPage />} />
            </Routes>
          </Router>
        </ReauthProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
