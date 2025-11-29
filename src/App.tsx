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
import { Putaway } from './components/picking/Putaway';
import { PutawayTasks } from './components/picking/PutawayTasks';
import { PackingDashboard } from './components/packing/PackingDashboard';
import { ReceptionDashboard } from './components/reception/ReceptionDashboard';
import { ReplenishmentDashboard } from './components/replenishment/ReplenishmentDashboard';
import { IntegrationsDashboard } from './components/integrations/IntegrationsDashboard';
import { ReportsDashboard } from './components/reports/ReportsDashboard';
import { UserManagementDashboard } from './components/users/UserManagementDashboard';
import { Loader2 } from 'lucide-react';
import { GeneralSettings } from './components/config/GeneralSettings';
import SupabaseConfig from './components/config/SupabaseConfig';
import { ActivityLogs } from './components/users/ActivityLogs';
import { IncidenciasDashboard } from './components/incidents/IncidenciasDashboard';

// ErrorBoundary para capturar errores de render y mostrar mensaje útil
class ErrorBoundary extends React.Component<{}, { hasError: boolean; error?: Error | null; errorInfo?: React.ErrorInfo | null }>{
  constructor(props: {}) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo });
    // Log básico
    console.error('ErrorBoundary capturó un error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="max-w-2xl w-full bg-white shadow rounded-lg p-6">
            <h1 className="text-xl font-semibold text-red-600 mb-2">Se produjo un error de renderizado</h1>
            <p className="text-sm text-gray-700 mb-4">Intenta recargar la página. Si persiste, consulta la consola del navegador para más detalles.</p>
            {this.state.error && (
              <div className="text-sm text-gray-800 bg-red-50 border border-red-200 rounded p-3 mb-3">
                <div className="font-medium">Mensaje:</div>
                <pre className="whitespace-pre-wrap break-words">{String(this.state.error.message || this.state.error)}</pre>
              </div>
            )}
            {this.state.errorInfo && (
              <div className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded p-3">
                <div className="font-medium mb-1">Stack:</div>
                <pre className="whitespace-pre-wrap break-words">{this.state.errorInfo.componentStack}</pre>
              </div>
            )}
          </div>
        </div>
      );
    }
    return this.props.children as React.ReactNode;
  }
}

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
              <Route path="/putaway" element={<Protected permissionId="putaway.view"><Putaway /></Protected>} />
              <Route path="/putaway/tasks" element={<Protected permissionId="putaway.view"><PutawayTasks /></Protected>} />
              <Route path="/packing/*" element={<Protected permissionId="packing.view"><PackingDashboard /></Protected>} />
              <Route path="/reception/*" element={<Protected permissionId="reception.view"><ReceptionDashboard /></Protected>} />
              <Route path="/replenishment/*" element={<Protected permissionId="replenishment.view"><ReplenishmentDashboard /></Protected>} />
              <Route path="/integrations/*" element={<Protected permissionId="integrations.view"><IntegrationsDashboard /></Protected>} />
              <Route path="/reports/*" element={<Protected permissionId="reports.view"><ReportsDashboard /></Protected>} />
              <Route path="/users/*" element={<Protected permissionId="users.view"><UserManagementDashboard /></Protected>} />
              <Route path="/config/general" element={<Protected permissionId="settings.view"><GeneralSettings /></Protected>} />
              <Route path="/config/supabase" element={<Protected permissionId="settings.view"><SupabaseConfig /></Protected>} />
              <Route path="/config/logs" element={<Protected permissionId="settings.view"><ActivityLogs /></Protected>} />
              <Route path="/incidencias" element={<Protected permissionId="picking.view"><IncidenciasDashboard /></Protected>} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
