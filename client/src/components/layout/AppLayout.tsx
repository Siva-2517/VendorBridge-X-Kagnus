import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
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
  Bell,
  Check,
  ChevronDown,
  Inbox,
  PanelLeftClose,
  PanelLeftOpen,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../types';

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'New Supplier Registered',
    description: 'Infra Supplies Pvt Ltd is onboarded and pending document review.',
    time: '15m ago',
    read: false,
  },
  {
    id: 'notif-2',
    title: 'Purchase Order Verified',
    description: 'PO-2025-001 has been recorded in database store.',
    time: '1h ago',
    read: false,
  },
  {
    id: 'notif-3',
    title: 'System Audit Milestone',
    description: 'Week 1 RBAC and session audit verification passed.',
    time: '3h ago',
    read: true,
  },
];

export const AppLayout: React.FC = () => {
  const { user, logout, switchDemoRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('vendorbridge_sidebar_collapsed') === 'true';
  });
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  useEffect(() => {
    const handlePrefChange = () => {
      setSidebarCollapsed(localStorage.getItem('vendorbridge_sidebar_collapsed') === 'true');
    };
    window.addEventListener('vendorbridge_pref_changed', handlePrefChange);
    return () => window.removeEventListener('vendorbridge_pref_changed', handlePrefChange);
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('vendorbridge_sidebar_collapsed', String(next));
      return next;
    });
  };

  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifBtnRef = useRef<HTMLButtonElement>(null);
  const profileBtnRef = useRef<HTMLButtonElement>(null);
  const mobileNotifBtnRef = useRef<HTMLButtonElement>(null);
  const mobileProfileBtnRef = useRef<HTMLButtonElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(target) &&
        !notifBtnRef.current?.contains(target) &&
        !mobileNotifBtnRef.current?.contains(target)
      ) {
        setNotificationsOpen(false);
      }
      if (
        profileRef.current &&
        !profileRef.current.contains(target) &&
        !profileBtnRef.current?.contains(target) &&
        !mobileProfileBtnRef.current?.contains(target)
      ) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  allowedRoles?: Role[];
}

const ALL_NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  {
    name: 'Vendors',
    path: '/vendors',
    icon: Users,
    allowedRoles: ['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER_APPROVER'],
  },
  {
    name: 'RFQs',
    path: '/rfqs',
    icon: FileText,
    badge: 'W2',
    allowedRoles: ['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER_APPROVER'],
  },
  { name: 'Quotations', path: '/quotations', icon: FileSpreadsheet, badge: 'W2' },
  {
    name: 'Approvals',
    path: '/approvals',
    icon: CheckCircle2,
    badge: 'W3',
    allowedRoles: ['ADMIN', 'MANAGER_APPROVER'],
  },
  { name: 'Purchase Orders', path: '/purchase-orders', icon: ShoppingCart, badge: 'W3' },
  { name: 'Invoices', path: '/invoices', icon: Receipt, badge: 'W3' },
  {
    name: 'Reports',
    path: '/reports',
    icon: BarChart3,
    badge: 'W4',
    allowedRoles: ['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER_APPROVER'],
  },
  {
    name: 'Activity',
    path: '/activity',
    icon: Activity,
    badge: 'W4',
    allowedRoles: ['ADMIN'],
  },
];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = ALL_NAV_ITEMS.filter((item) => {
    if (!item.allowedRoles) return true;
    return user?.role ? item.allowedRoles.includes(user.role) : false;
  });

  const handleRoleSwitch = async (targetRole: Role) => {
    await switchDemoRole(targetRole);
    const currentItem = ALL_NAV_ITEMS.find((item) => location.pathname.startsWith(item.path));
    if (currentItem?.allowedRoles && !currentItem.allowedRoles.includes(targetRole)) {
      navigate('/dashboard');
    }
  };

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

  const getCurrentPageTitle = () => {
    if (location.pathname.startsWith('/profile')) return 'Account Settings';
    const current = ALL_NAV_ITEMS.find((item) => location.pathname.startsWith(item.path));
    return current ? current.name : 'Dashboard';
  };

  return (
    <div className="flex h-screen bg-[#111827] text-[#F8FAFC] overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Sidebar for Desktop */}
      <aside
        className={`hidden md:flex flex-col bg-[#0B1220] border-r border-[#334155] select-none shrink-0 transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Brand Header */}
        <div
          className={`flex items-center h-16 border-b border-[#334155] ${
            sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4'
          }`}
        >
          {sidebarCollapsed ? (
            <button
              onClick={toggleSidebar}
              title="Expand sidebar"
              aria-label="Expand sidebar"
              className="flex flex-col items-center gap-1 group p-1.5 rounded-lg hover:bg-[#273449] transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-[#36C9A5]/10 border border-[#36C9A5]/30 flex items-center justify-center text-[#36C9A5] font-bold text-xs tracking-tight">
                VB
              </div>
              <PanelLeftOpen className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#36C9A5] transition-colors" />
            </button>
          ) : (
            <>
              <div
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-3 min-w-0 cursor-pointer group"
                title="VendorBridge Dashboard"
              >
                <div className="w-8 h-8 rounded-lg bg-[#36C9A5]/10 border border-[#36C9A5]/30 flex items-center justify-center text-[#36C9A5] font-bold text-sm tracking-tight shrink-0 group-hover:border-[#36C9A5]/60 transition-colors">
                  VB
                </div>
                <div className="min-w-0 truncate">
                  <h1 className="font-bold text-base text-white tracking-tight flex items-center gap-1.5 truncate group-hover:text-[#36C9A5] transition-colors">
                    VendorBridge
                    <span className="w-1.5 h-1.5 rounded-full bg-[#36C9A5] animate-pulse shrink-0"></span>
                  </h1>
                  <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-semibold truncate">
                    ERP Suite • Week 1
                  </p>
                </div>
              </div>
              <button
                onClick={toggleSidebar}
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#273449] transition-colors shrink-0"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-2.5 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              title={sidebarCollapsed ? item.name : undefined}
              aria-label={item.name}
              className={({ isActive }) =>
                `flex items-center rounded-lg text-sm font-medium transition-all ${
                  sidebarCollapsed
                    ? 'justify-center p-2.5 relative'
                    : 'justify-between px-3 py-2.5'
                } ${
                  isActive
                    ? 'bg-[#36C9A5]/10 text-[#36C9A5] border border-[#36C9A5]/30 font-semibold shadow-sm'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#273449]'
                }`
              }
            >
              <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
                <item.icon className="w-4 h-4 shrink-0" />
                {!sidebarCollapsed && <span>{item.name}</span>}
              </div>
              {!sidebarCollapsed && item.badge && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#1E293B] text-[#94A3B8] border border-[#334155]">
                  {item.badge}
                </span>
              )}
              {sidebarCollapsed && item.badge && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#36C9A5]/80"></span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Demo Role Switcher Quick Pill (Development & Evaluation Only) */}
        {import.meta.env.DEV && (
          sidebarCollapsed ? (
            <div className="p-2 border-t border-[#334155] flex justify-center">
              <button
                onClick={() => {
                  const roles: Role[] = ['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER_APPROVER', 'VENDOR'];
                  const nextIndex = (roles.indexOf(user?.role as Role) + 1) % roles.length;
                  handleRoleSwitch(roles[nextIndex]);
                }}
                title={`Role: ${user?.role} (Click to cycle)`}
                aria-label="Cycle demo role"
                className="w-8 h-8 rounded-lg bg-[#1E293B] border border-[#334155] flex items-center justify-center text-[#36C9A5] hover:bg-[#273449] transition-colors"
              >
                <UserCheck className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="p-3 mx-3 my-2 bg-[#1E293B] border border-[#334155] rounded-xl text-xs">
              <div className="flex items-center gap-1.5 text-[#36C9A5] font-semibold mb-2">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Role Switcher (Dev Mode)</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => handleRoleSwitch('ADMIN')}
                  className={`px-2 py-1 rounded text-[11px] font-medium border text-left transition-all ${
                    user?.role === 'ADMIN'
                      ? 'bg-[#36C9A5] text-[#0B1220] border-[#36C9A5] font-bold'
                      : 'bg-[#0B1220] text-slate-300 border-[#334155] hover:bg-[#273449]'
                  }`}
                >
                  Admin
                </button>
                <button
                  onClick={() => handleRoleSwitch('PROCUREMENT_OFFICER')}
                  className={`px-2 py-1 rounded text-[11px] font-medium border text-left transition-all ${
                    user?.role === 'PROCUREMENT_OFFICER'
                      ? 'bg-[#36C9A5] text-[#0B1220] border-[#36C9A5] font-bold'
                      : 'bg-[#0B1220] text-slate-300 border-[#334155] hover:bg-[#273449]'
                  }`}
                >
                  Officer
                </button>
                <button
                  onClick={() => handleRoleSwitch('MANAGER_APPROVER')}
                  className={`px-2 py-1 rounded text-[11px] font-medium border text-left transition-all ${
                    user?.role === 'MANAGER_APPROVER'
                      ? 'bg-[#36C9A5] text-[#0B1220] border-[#36C9A5] font-bold'
                      : 'bg-[#0B1220] text-slate-300 border-[#334155] hover:bg-[#273449]'
                  }`}
                >
                  Manager
                </button>
                <button
                  onClick={() => handleRoleSwitch('VENDOR')}
                  className={`px-2 py-1 rounded text-[11px] font-medium border text-left transition-all ${
                    user?.role === 'VENDOR'
                      ? 'bg-[#36C9A5] text-[#0B1220] border-[#36C9A5] font-bold'
                      : 'bg-[#0B1220] text-slate-300 border-[#334155] hover:bg-[#273449]'
                  }`}
                >
                  Vendor
                </button>
              </div>
            </div>
          )
        )}

        {/* Current User & Logout in Sidebar Footer */}
        <div
          className={`border-t border-[#334155] bg-[#0B1220] ${
            sidebarCollapsed ? 'p-2 flex flex-col items-center gap-2' : 'p-3'
          }`}
        >
          {sidebarCollapsed ? (
            <>
              <button
                onClick={() => navigate('/profile')}
                title={`${user?.firstName} ${user?.lastName} - Click for Profile`}
                aria-label="User Profile"
                className="w-8 h-8 rounded-lg bg-[#1E293B] border border-[#334155] flex items-center justify-center font-bold text-[#36C9A5] text-xs hover:border-[#36C9A5]/50 transition-colors"
              >
                {user?.firstName?.[0] || 'U'}
              </button>
              <button
                onClick={handleLogout}
                title="Sign out"
                aria-label="Sign out"
                className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-950/40 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="flex items-center justify-between">
              <div
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
                title="View user profile"
              >
                <div className="w-8 h-8 rounded-lg bg-[#1E293B] border border-[#334155] flex items-center justify-center font-bold text-[#36C9A5] text-xs shrink-0 group-hover:border-[#36C9A5]/50 transition-colors">
                  {user?.firstName?.[0] || 'U'}
                  {user?.lastName?.[0] || ''}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate group-hover:text-[#36C9A5] transition-colors">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-[10px] text-[#36C9A5] font-medium truncate flex items-center gap-1">
                    <Shield className="w-2.5 h-2.5 shrink-0" />
                    {getRoleDisplayName(user?.role)}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Sign out"
                aria-label="Sign out"
                className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-950/40 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Dropdown helper functions */}
        {notificationsOpen && (
          <div
            ref={notificationsRef}
            className="fixed top-16 right-4 sm:right-8 w-80 sm:w-96 bg-[#1E293B] border border-[#334155] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in"
          >
            <div className="px-4 py-3 bg-[#0B1220] border-b border-[#334155] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
                  Notifications
                </h4>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-[#36C9A5]/20 text-[#36C9A5] text-[10px] font-bold">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[#36C9A5] hover:text-[#2db893] flex items-center gap-1 font-medium transition-colors"
                  >
                    <Check className="w-3 h-3" /> Mark all read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clearNotifications}
                    className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-[#334155]/60">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-[#94A3B8] text-xs flex flex-col items-center gap-2">
                  <Inbox className="w-6 h-6 text-slate-500" />
                  <span>No notifications to display</span>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3.5 hover:bg-[#273449]/40 transition-colors ${
                      !n.read ? 'bg-[#36C9A5]/5' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {!n.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#36C9A5] shrink-0"></span>
                        )}
                        <h5 className="text-xs font-semibold text-[#F8FAFC]">{n.title}</h5>
                      </div>
                      <span className="text-[10px] text-[#94A3B8] shrink-0 font-mono">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-[#94A3B8] mt-1 leading-relaxed pl-3">
                      {n.description}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="px-4 py-2 bg-[#0B1220] border-t border-[#334155] text-center text-[10px] text-[#94A3B8]">
              Live Procurement Event Stream
            </div>
          </div>
        )}

        {profileMenuOpen && (
          <div
            ref={profileRef}
            className="fixed top-16 right-4 sm:right-6 w-72 bg-[#1E293B] border border-[#334155] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in"
          >
            <div className="p-4 bg-[#0B1220] border-b border-[#334155]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1E293B] border border-[#334155] flex items-center justify-center font-bold text-[#36C9A5] text-sm shrink-0">
                  {user?.firstName?.[0] || 'U'}
                  {user?.lastName?.[0] || ''}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-[#F8FAFC] truncate">
                    {user?.firstName} {user?.lastName}
                  </h4>
                  <p className="text-[11px] text-[#94A3B8] truncate">{user?.email}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#36C9A5]/15 text-[#36C9A5] border border-[#36C9A5]/30 text-[10px] font-semibold">
                  <Shield className="w-3 h-3" />
                  {getRoleDisplayName(user?.role)}
                </span>
                <span className="text-[10px] text-[#94A3B8]">Authenticated</span>
              </div>
            </div>

            <div className="p-3 space-y-1 text-xs">
              <div className="px-3 py-2 text-[#94A3B8] text-[11px] flex justify-between">
                <span>Organization</span>
                <span className="text-[#F8FAFC] font-medium">VendorBridge ERP</span>
              </div>
              <div className="px-3 py-2 text-[#94A3B8] text-[11px] flex justify-between">
                <span>User ID</span>
                <span className="text-[#F8FAFC] font-mono text-[10px]">{user?.id || 'usr-default'}</span>
              </div>
            </div>

            <div className="p-2 border-t border-[#334155] bg-[#0B1220] space-y-1">
              <button
                onClick={() => {
                  setProfileMenuOpen(false);
                  navigate('/profile');
                }}
                className="w-full flex items-center justify-center gap-2 py-2 text-slate-200 hover:text-white hover:bg-[#273449] rounded-lg text-xs font-semibold transition-colors"
              >
                <UserIcon className="w-3.5 h-3.5 text-[#36C9A5]" /> View Profile & Settings
              </button>
              <button
                onClick={() => {
                  setProfileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center justify-center gap-2 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg text-xs font-semibold transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign out
              </button>
            </div>
          </div>
        )}

        {/* Desktop Top Header Bar */}
        <header className="hidden md:flex h-16 border-b border-[#334155] bg-[#0B1220]/75 backdrop-blur-md px-6 md:px-8 items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-3 text-xs">
            {sidebarCollapsed && (
              <button
                onClick={toggleSidebar}
                title="Expand sidebar"
                aria-label="Expand sidebar"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#273449] transition-colors mr-1"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}
            <span
              onClick={() => navigate('/')}
              className="text-[#94A3B8] hover:text-[#36C9A5] cursor-pointer transition-colors"
              title="VendorBridge Home"
            >
              VendorBridge
            </span>
            <span className="text-[#334155]">/</span>
            <span className="text-[#F8FAFC] font-semibold text-sm">{getCurrentPageTitle()}</span>
          </div>

          <div className="flex items-center gap-3">
            {/* System Version & Milestone Pill */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1E293B] border border-[#334155] text-[11px] text-[#94A3B8]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#36C9A5]/80"></span>
              <span>ERP Suite • Week 1</span>
            </div>

            {/* Notification Bell */}
            <button
              ref={notifBtnRef}
              onClick={() => {
                setNotificationsOpen((prev) => !prev);
                setProfileMenuOpen(false);
              }}
              title="Notifications"
              aria-label="Notifications"
              className={`p-2 rounded-lg transition-colors relative ${
                notificationsOpen
                  ? 'bg-[#273449] text-[#F8FAFC]'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#273449]'
              }`}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#36C9A5]"></span>
              )}
            </button>

            {/* Profile Pill Button */}
            <button
              ref={profileBtnRef}
              onClick={() => {
                setProfileMenuOpen((prev) => !prev);
                setNotificationsOpen(false);
              }}
              title="User Profile & Account"
              aria-label="User Profile & Account"
              className={`flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-lg border transition-all ${
                profileMenuOpen
                  ? 'bg-[#273449] border-[#36C9A5]/50 text-[#F8FAFC]'
                  : 'border-transparent hover:bg-[#273449]/60 text-slate-200'
              }`}
            >
              <div className="w-7 h-7 rounded-full bg-[#1E293B] border border-[#334155] flex items-center justify-center font-bold text-[#36C9A5] text-[11px]">
                {user?.firstName?.[0] || 'U'}
              </div>
              <span className="text-xs font-medium hidden sm:inline">
                {user?.firstName}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />
            </button>
          </div>
        </header>

        {/* Mobile Header */}
        <div className="md:hidden fixed top-0 inset-x-0 z-40 bg-[#0B1220] border-b border-[#334155] flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-[#36C9A5]/15 border border-[#36C9A5]/30 text-[#36C9A5] flex items-center justify-center font-bold text-xs">
              VB
            </div>
            <span className="font-bold text-white text-sm">VendorBridge</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile Notification Bell */}
            <button
              ref={mobileNotifBtnRef}
              onClick={() => {
                setNotificationsOpen((prev) => !prev);
                setProfileMenuOpen(false);
              }}
              title="Notifications"
              aria-label="Notifications"
              className="p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#273449] rounded-lg transition-colors relative"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#36C9A5]"></span>
              )}
            </button>

            {/* Mobile Profile Trigger */}
            <button
              ref={mobileProfileBtnRef}
              onClick={() => {
                setProfileMenuOpen((prev) => !prev);
                setNotificationsOpen(false);
              }}
              title="User Profile"
              aria-label="User Profile"
              className="w-7 h-7 rounded-full bg-[#1E293B] border border-[#334155] flex items-center justify-center font-bold text-[#36C9A5] text-xs"
            >
              {user?.firstName?.[0] || 'U'}
            </button>

            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => {
                setMobileMenuOpen(!mobileMenuOpen);
                setNotificationsOpen(false);
                setProfileMenuOpen(false);
              }}
              className="p-1.5 text-slate-300 hover:text-white rounded ml-1"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-30 bg-black/80 backdrop-blur-sm pt-14">
            <div className="bg-[#0B1220] border-b border-[#334155] p-4 space-y-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium ${
                      isActive
                        ? 'bg-[#36C9A5]/15 text-[#36C9A5] border border-[#36C9A5]/30 font-semibold'
                        : 'text-slate-300'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1E293B] text-[#94A3B8] border border-[#334155]">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
              <div className="pt-4 border-t border-[#334155]">
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
        <main className="flex-1 overflow-y-auto flex flex-col pt-14 md:pt-0 bg-[#111827]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
