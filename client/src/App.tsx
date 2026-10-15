import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Layout } from './components/Layout/Layout.js';
import { Dashboard } from './pages/Dashboard.js';
import { Firms } from './pages/Firms.js';
import { Members } from './pages/Members.js';
import { Receipts } from './pages/Receipts.js';
import { NiyariReport } from './pages/NiyariReport.js';
import { Masters } from './pages/Masters.js';
import { Reports } from './pages/Reports.js';
import { DataOperations } from './pages/DataOperations.js';
import { AdminAudit } from './pages/AdminAudit.js';
import { BackupRestore } from './pages/BackupRestore.js';
import { Login } from './pages/Login.js';
import { Recovery } from './pages/Recovery.js';
import { Loader2 } from 'lucide-react';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-brand-orange">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/recovery" element={<Recovery />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="firms" element={<Firms />} />
        <Route path="members" element={<Members />} />
        <Route path="receipts" element={<Receipts />} />
        <Route path="niyari" element={<NiyariReport />} />
        <Route path="masters" element={<Masters />} />
        <Route path="reports" element={<Reports />} />
        <Route path="data-ops" element={<DataOperations />} />
        <Route path="backup" element={<BackupRestore />} />
        <Route path="admin" element={<AdminAudit />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
};
