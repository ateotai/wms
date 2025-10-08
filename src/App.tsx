import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthForm } from './components/auth/AuthForm';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './components/dashboard/Dashboard';
import { InventoryDashboard } from './components/inventory/InventoryDashboard';
import { WarehouseLayout } from './components/warehouse/WarehouseLayout';
import { PickingDashboard } from './components/picking/PickingDashboard';
import { PackingDashboard } from './components/packing/PackingDashboard';
import { ReceptionDashboard } from './components/reception/ReceptionDashboard';
import { IntegrationsDashboard } from './components/integrations/IntegrationsDashboard';
import { ReportsDashboard } from './components/reports/ReportsDashboard';
import { UserManagementDashboard } from './components/users/UserManagementDashboard';
import { Loader2 } from 'lucide-react';

function AuthScreen() {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 flex items-center justify-center px-4">
      <AuthForm 
        mode={authMode} 
        onToggle={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')} 
      />
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const { hasPermissionId } = useAuth();

  const Protected = ({ children, permissionId }: { children: React.ReactNode; permissionId: string }) => {
    if (!hasPermissionId(permissionId)) {
      return <Navigate to="/dashboard" replace />;
    }
    return <>{children}</>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-lg text-gray-600">Cargando...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 ml-64 p-8">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/inventory/*" element={<Protected permissionId="inventory.view"><InventoryDashboard /></Protected>} />
              <Route path="/warehouse/*" element={<Protected permissionId="warehouse.view"><WarehouseLayout /></Protected>} />
              <Route path="/picking/*" element={<Protected permissionId="picking.view"><PickingDashboard /></Protected>} />
              <Route path="/packing/*" element={<Protected permissionId="packing.view"><PackingDashboard /></Protected>} />
              <Route path="/reception/*" element={<Protected permissionId="reception.view"><ReceptionDashboard /></Protected>} />
              <Route path="/integrations/*" element={<Protected permissionId="integrations.view"><IntegrationsDashboard /></Protected>} />
              <Route path="/reports/*" element={<Protected permissionId="reports.view"><ReportsDashboard /></Protected>} />
              <Route path="/users/*" element={<Protected permissionId="users.view"><UserManagementDashboard /></Protected>} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;