import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Vendors } from './pages/Vendors';
import { Profile } from './pages/Profile';
import { FutureModulePlaceholder } from './components/common/FutureModulePlaceholder';
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
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Application Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
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

            {/* Honest Empty States for Scheduled Future Modules */}
            <Route
              path="rfqs"
              element={
                <RoleRouteGuard
                  allowedRoles={['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER_APPROVER']}
                  resourceName="Request for Quotations (RFQ)"
                >
                  <FutureModulePlaceholder
                    moduleName="Request for Quotations (RFQ)"
                    scheduledWeek="Week 2"
                    description="Create, structure, and dispatch multi-line RFQ packages to invited and verified vendor partners."
                    features={[
                      'Multi-line item requisition tables',
                      'Vendor dispatch and notification list',
                      'RFQ submission deadlines and tracking',
                      'Category-based vendor matching',
                    ]}
                  />
                </RoleRouteGuard>
              }
            />

            <Route
              path="quotations"
              element={
                <FutureModulePlaceholder
                  moduleName="Quotations & Comparison Matrix"
                  scheduledWeek="Week 2"
                  description="Supplier bidding portal and side-by-side quotation comparison matrix with automated L1 recommendation."
                  features={[
                    'Supplier bid submission interface',
                    'Side-by-side cost and delivery matrix',
                    'L1 lowest-price vendor calculation',
                    'Comparative tax and freight breakdown',
                  ]}
                />
              }
            />

            <Route
              path="approvals"
              element={
                <RoleRouteGuard
                  allowedRoles={['ADMIN', 'MANAGER_APPROVER']}
                  resourceName="Approvals Workflow"
                >
                  <FutureModulePlaceholder
                    moduleName="Multi-Level Approvals Workflow"
                    scheduledWeek="Week 3"
                    description="Hierarchical procurement approval chains (L1, L2, Finance) with remarks, approval status, and audit trail."
                    features={[
                      'Multi-tier managerial approval stages',
                      'Role-based delegation and remarks',
                      'Single-click approve / reject decisions',
                      'Instant PO conversion triggers',
                    ]}
                  />
                </RoleRouteGuard>
              }
            />

            <Route
              path="purchase-orders"
              element={
                <FutureModulePlaceholder
                  moduleName="Purchase Orders"
                  scheduledWeek="Week 3"
                  description="Official purchase order generation, digital sign-off, supplier PDF transmission, and fulfillment status."
                  features={[
                    'Automated PO number sequencing',
                    'Delivery and milestone tracking',
                    'PDF export and supplier email dispatch',
                    'GRN / fulfillment reconciliation',
                  ]}
                />
              }
            />

            <Route
              path="invoices"
              element={
                <FutureModulePlaceholder
                  moduleName="Invoices & 3-Way Matching"
                  scheduledWeek="Week 3"
                  description="Vendor invoice submission, 3-way matching against PO and delivery receipt, payment status tracking."
                  features={[
                    'Vendor tax invoice upload',
                    'Automated 3-way matching (PO-GRN-Invoice)',
                    'Tax liability and TDS breakdown',
                    'Payment authorization pipeline',
                  ]}
                />
              }
            />

            <Route
              path="reports"
              element={
                <RoleRouteGuard
                  allowedRoles={['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER_APPROVER']}
                  resourceName="Procurement Reports & Analytics"
                >
                  <FutureModulePlaceholder
                    moduleName="Reports & Procurement Analytics"
                    scheduledWeek="Week 4"
                    description="Executive dashboard analytics, department spending breakdown, supplier performance scoring, and SLA tracking."
                    features={[
                      'Spend analysis by category and department',
                      'Supplier performance scorecards (OTIF)',
                      'Cost savings and variance reports',
                      'CSV & PDF data export pipelines',
                    ]}
                  />
                </RoleRouteGuard>
              }
            />

            <Route
              path="activity"
              element={
                <RoleRouteGuard
                  allowedRoles={['ADMIN']}
                  resourceName="Audit Logs & Activity Trail"
                >
                  <FutureModulePlaceholder
                    moduleName="Audit Logs & Activity Trail"
                    scheduledWeek="Week 4"
                    description="Immutable, tamper-evident procurement event logging recording all state changes, authorizations, and deletions."
                    features={[
                      'Immutable system-wide event logging',
                      'User and role action attribution',
                      'Timestamped state change diffs',
                      'Compliance audit export archive',
                    ]}
                  />
                </RoleRouteGuard>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
