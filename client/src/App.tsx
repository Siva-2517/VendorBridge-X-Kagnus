import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Vendors } from './pages/Vendors';
import { Rfqs } from './pages/Rfqs';
import { RfqDetail } from './pages/RfqDetail';
import { Quotations } from './pages/Quotations';
import { Approvals } from './pages/Approvals';
import { PurchaseOrders } from './pages/PurchaseOrders';
import { Invoices } from './pages/Invoices';
import { Profile } from './pages/Profile';
import { ActivityPage } from './pages/Activity';
import { Reports } from './pages/Reports';
import { AccessDenied } from './components/common/AccessDenied';
import { Role } from './types';
import { Loader2 } from 'lucide-react';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111827] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#36C9A5] animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const RoleRouteGuard: React.FC<{
  allowedRoles: Role[];
  resourceName?: string;
  children: React.ReactNode;
}> = ({ allowedRoles, resourceName, children }) => {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    return <AccessDenied resourceName={resourceName} allowedRoles={allowedRoles} />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Landing & Auth Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Application Routes */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<Dashboard />} />
            <Route
              path="vendors"
              element={
                <RoleRouteGuard
                  allowedRoles={['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER_APPROVER']}
                  resourceName="Vendor Directory"
                >
                  <Vendors />
                </RoleRouteGuard>
              }
            />
            <Route path="profile" element={<Profile />} />

            {/* Week 2 Live Production Modules */}
            <Route path="rfqs" element={<Rfqs />} />
            <Route path="rfqs/:id" element={<RfqDetail />} />
            <Route path="quotations" element={<Quotations />} />

            {/* Week 3 Live Production Modules */}
            <Route
              path="approvals"
              element={
                <RoleRouteGuard
                  allowedRoles={['ADMIN', 'MANAGER_APPROVER', 'PROCUREMENT_OFFICER']}
                  resourceName="Approvals Workflow"
                >
                  <Approvals />
                </RoleRouteGuard>
              }
            />

            {/* Honest Empty States for Scheduled Future Modules */}

            <Route path="purchase-orders" element={<PurchaseOrders />} />

            <Route path="invoices" element={<Invoices />} />

            <Route
              path="reports"
              element={
                <RoleRouteGuard
                  allowedRoles={['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER_APPROVER', 'VENDOR']}
                  resourceName="Procurement Reports & Analytics"
                >
                  <Reports />
                </RoleRouteGuard>
              }
            />

            <Route
              path="activity"
              element={
                <RoleRouteGuard
                  allowedRoles={['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER_APPROVER', 'VENDOR']}
                  resourceName="Audit Logs & Activity Trail"
                >
                  <ActivityPage />
                </RoleRouteGuard>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
