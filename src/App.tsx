import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CaseProvider } from './context/CaseContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './components/DashboardLayout';
import { LoginPage } from './components/LoginPage';
import { Dashboard } from './components/Dashboard';
import { CaseEntryForm } from './components/CaseEntryForm';
import { CaseDetail } from './components/CaseDetail';
import { SearchCases } from './components/SearchCases';
import { HearingUpdate } from './components/HearingUpdate';
import { Reports } from './components/Reports';
import { UserManagement } from './components/UserManagement';
import { ChangePassword } from './components/ChangePassword';
import { UpdateProfile } from './components/UpdateProfile';

export function App() {
  return (
    <AuthProvider>
      <CaseProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Routes with Dashboard Layout */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Dashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/case/new"
              element={
                <ProtectedRoute allowedRoles={['Writer', 'SHO']}>
                  <DashboardLayout>
                    <CaseEntryForm />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/case/edit/:id"
              element={
                <ProtectedRoute allowedRoles={['Writer', 'SHO']}>
                  <DashboardLayout>
                    <CaseEntryForm />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/case/:id"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <CaseDetail />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/search"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <SearchCases />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/hearings"
              element={
                <ProtectedRoute allowedRoles={['SHO', 'SP']}>
                  <DashboardLayout>
                    <HearingUpdate />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/reports"
              element={
                <ProtectedRoute allowedRoles={['SHO', 'SP']}>
                  <DashboardLayout>
                    <Reports />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/users"
              element={
                <ProtectedRoute allowedRoles={['SP']}>
                  <DashboardLayout>
                    <UserManagement />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/change-password"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <ChangePassword />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <UpdateProfile />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </CaseProvider>
    </AuthProvider>
  );
}
