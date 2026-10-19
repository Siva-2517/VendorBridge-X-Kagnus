import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  ShoppingCart,
  Receipt,
  BarChart3,
  Activity,
  LogOut,
  Shield,
  Menu,
  X,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../types';

export const AppLayout: React.FC = () => {
  const { user, logout, switchDemoRole } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Vendors', path: '/vendors', icon: Users },
    { name: "RFQ's", path: '/rfqs', icon: FileText, badge: 'W2' },
    { name: 'Quotations', path: '/quotations', icon: FileSpreadsheet, badge: 'W2' },
    { name: 'Approvals', path: '/approvals', icon: CheckCircle2, badge: 'W3' },
    { name: 'Purchase orders', path: '/purchase-orders', icon: ShoppingCart, badge: 'W3' },
    { name: 'Invoices', path: '/invoices', icon: Receipt, badge: 'W3' },
    { name: 'Reports', path: '/reports', icon: BarChart3, badge: 'W4' },
    { name: 'Activity', path: '/activity', icon: Activity, badge: 'W4' },
  ];

  const getRoleDisplayName = (role?: Role) => {
    switch (role) {
      case 'ADMIN':
        return 'System Admin';
      case 'PROCUREMENT_OFFICER':
        return 'Procurement Officer';
      case 'MANAGER_APPROVER':
        return 'Manager / Approver';
      case 'VENDOR':
        return 'Vendor Partner';
      default:
        return 'Authorized User';
    }
  };

  return (
    <div className="flex h-screen bg-[#0b110e] text-slate-100 overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0d1612] border-r border-[#19281f] select-none">
        {/* Brand */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-[#19281f]">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold">
            VB
          </div>
          <div>
            <h1 className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
              VendorBridge
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </h1>
            <p className="text-[10px] text-emerald-400/80 uppercase tracking-widest font-semibold">
              ERP Suite • Week 1
            </p>
          </div>
        </div>

        {/* Navigation items matching Excalidraw exactly */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#132018]'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#182a20] text-emerald-500/70 border border-[#233b2d]">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Demo Role Switcher Quick Pill */}
        <div className="p-3 mx-3 my-2 bg-[#121f18] border border-[#213529] rounded-xl text-xs">
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-2">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Role Switcher (Evaluation)</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => switchDemoRole('ADMIN')}
              className={`px-2 py-1 rounded text-[11px] font-medium border text-left transition-all ${
                user?.role === 'ADMIN'
                  ? 'bg-emerald-800 text-white border-emerald-600'
                  : 'bg-[#182920] text-slate-300 border-[#284234] hover:bg-[#20362b]'
              }`}
            >
              Admin
            </button>
            <button
              onClick={() => switchDemoRole('PROCUREMENT_OFFICER')}
              className={`px-2 py-1 rounded text-[11px] font-medium border text-left transition-all ${
                user?.role === 'PROCUREMENT_OFFICER'
                  ? 'bg-emerald-800 text-white border-emerald-600'
                  : 'bg-[#182920] text-slate-300 border-[#284234] hover:bg-[#20362b]'
              }`}
            >
              Officer
            </button>
            <button
              onClick={() => switchDemoRole('MANAGER_APPROVER')}
              className={`px-2 py-1 rounded text-[11px] font-medium border text-left transition-all ${
                user?.role === 'MANAGER_APPROVER'
                  ? 'bg-emerald-800 text-white border-emerald-600'
                  : 'bg-[#182920] text-slate-300 border-[#284234] hover:bg-[#20362b]'
              }`}
            >
              Manager
            </button>
            <button
              onClick={() => switchDemoRole('VENDOR')}
              className={`px-2 py-1 rounded text-[11px] font-medium border text-left transition-all ${
                user?.role === 'VENDOR'
                  ? 'bg-emerald-800 text-white border-emerald-600'
                  : 'bg-[#182920] text-slate-300 border-[#284234] hover:bg-[#20362b]'
              }`}
            >
              Vendor
            </button>
          </div>
        </div>

        {/* Current User & Logout */}
        <div className="p-3 border-t border-[#19281f] bg-[#0c1410]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-emerald-900/60 border border-emerald-600/50 flex items-center justify-center font-bold text-emerald-300 text-xs shrink-0">
                {user?.firstName?.[0] || 'U'}
                {user?.lastName?.[0] || ''}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-[10px] text-emerald-400 font-medium truncate flex items-center gap-1">
                  <Shield className="w-2.5 h-2.5 shrink-0" />
                  {getRoleDisplayName(user?.role)}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-950/40 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 bg-[#0d1612] border-b border-[#19281f] flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
            VB
          </div>
          <span className="font-bold text-white text-sm">VendorBridge</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 text-slate-300 hover:text-white rounded"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/80 backdrop-blur-sm pt-14">
          <div className="bg-[#0d1612] border-b border-[#19281f] p-4 space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium ${
                    isActive
                      ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800'
                      : 'text-slate-300'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#182a20] text-emerald-400">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
            <div className="pt-4 border-t border-[#19281f]">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2 text-rose-400 font-medium text-sm bg-rose-950/30 rounded-lg"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto flex flex-col pt-14 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
};
