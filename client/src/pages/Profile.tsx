import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
import {
  Shield,
  User as UserIcon,
  Lock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sliders,
  Building2,
  Phone,
  Globe,
  FileText,
  Save,
  Check,
  X,
  Laptop,
  IndianRupee,
  BellRing,
} from 'lucide-react';
import { api, ApiError } from '../api/client';

export const Profile: React.FC = () => {
  const { user, updateLocalUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'account' | 'permissions' | 'security' | 'preferences'>('account');

  // Account form state
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phoneNumber: user?.phoneNumber || '',
    country: user?.country || 'India',
    additionalInfo: user?.additionalInfo || '',
  });

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  // Sync form data if user changes
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phoneNumber: user.phoneNumber || '',
        country: user.country || 'India',
        additionalInfo: user.additionalInfo || '',
      });
    }
  }, [user]);

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState<string | null>(null);
  const [passwordErrorMsg, setPasswordErrorMsg] = useState<string | null>(null);

  // Preferences state (backed by localStorage)
  const [sidebarPref, setSidebarPref] = useState<boolean>(() => {
    return localStorage.getItem('vendorbridge_sidebar_collapsed') === 'true';
  });
  const [alertsPref, setAlertsPref] = useState<boolean>(() => {
    return localStorage.getItem('vendorbridge_alerts_enabled') !== 'false';
  });
  const [prefSavedMsg, setPrefSavedMsg] = useState<string | null>(null);

  const getRoleDisplayName = (role?: Role) => {
    switch (role) {
      case 'ADMIN':
        return 'System Administrator';
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

  const getRoleBadgeStyle = (role?: Role) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-950/60 text-purple-300 border-purple-800/60';
      case 'PROCUREMENT_OFFICER':
        return 'bg-blue-950/60 text-blue-300 border-blue-800/60';
      case 'MANAGER_APPROVER':
        return 'bg-amber-950/60 text-amber-300 border-amber-800/60';
      case 'VENDOR':
        return 'bg-[#36C9A5]/15 text-[#36C9A5] border-[#36C9A5]/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  // RBAC Permission derivation
  const getRolePermissions = (role?: Role) => {
    return [
      {
        resource: 'Procurement Dashboard',
        access: role === 'VENDOR' ? 'Scoped to own profile' : 'Full system overview',
        allowed: true,
      },
      {
        resource: 'View Supplier Directory',
        access: role === 'VENDOR' ? 'Restricted to own supplier record' : 'All 28 enterprise vendors',
        allowed: role !== 'VENDOR',
      },
      {
        resource: 'Onboard & Register Vendors',
        access: 'Create new supplier profile with GSTIN validation',
        allowed: role === 'ADMIN' || role === 'PROCUREMENT_OFFICER',
      },
      {
        resource: 'Update Vendor Records',
        access: role === 'VENDOR' ? 'Edit own company details' : 'Edit any registered vendor',
        allowed: true,
      },
      {
        resource: 'Delete Vendor Records',
        access: 'Irreversible deletion with PO audit check',
        allowed: role === 'ADMIN',
      },
      {
        resource: 'Purchase Order Creation',
        access: 'Initiate and record purchase commitments',
        allowed: role === 'ADMIN' || role === 'PROCUREMENT_OFFICER',
      },
      {
        resource: 'Financial Approvals',
        access: 'Multi-tier review (L1, L2, and Finance sign-off)',
        allowed: role === 'ADMIN' || role === 'MANAGER_APPROVER',
      },
      {
        resource: 'User Administration',
        access: 'System account management and access governance',
        allowed: role === 'ADMIN',
      },
    ];
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccessMsg(null);
    setProfileErrorMsg(null);

    try {
      const data = await api.put<{ user: any }>('/api/auth/profile', formData);
      updateLocalUser(data.user);
      setProfileSuccessMsg('Profile information updated successfully.');
      setTimeout(() => setProfileSuccessMsg(null), 4000);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Network error while connecting to authorization server.';
      setProfileErrorMsg(msg);
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordSuccessMsg(null);
    setPasswordErrorMsg(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordErrorMsg('New password and password confirmation do not match.');
      setPasswordSaving(false);
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordErrorMsg('New password must be at least 8 characters long.');
      setPasswordSaving(false);
      return;
    }

    try {
      await api.put('/api/auth/change-password', passwordForm);
      setPasswordSuccessMsg('Password has been changed successfully.');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setTimeout(() => setPasswordSuccessMsg(null), 5000);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Network error while contacting server.';
      setPasswordErrorMsg(msg);
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSidebarPrefToggle = () => {
    const next = !sidebarPref;
    setSidebarPref(next);
    localStorage.setItem('vendorbridge_sidebar_collapsed', String(next));
    window.dispatchEvent(new Event('vendorbridge_pref_changed'));
    setPrefSavedMsg('Desktop sidebar preference updated.');
    setTimeout(() => setPrefSavedMsg(null), 3000);
  };

  const handleAlertsPrefToggle = () => {
    const next = !alertsPref;
    setAlertsPref(next);
    localStorage.setItem('vendorbridge_alerts_enabled', String(next));
    setPrefSavedMsg('Alert preferences updated.');
    setTimeout(() => setPrefSavedMsg(null), 3000);
  };

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 max-w-6xl mx-auto w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#334155] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#94A3B8] mb-1">
            <span>VendorBridge</span>
            <span>/</span>
            <span className="text-[#36C9A5]">Account Settings</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            User Profile & Security
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
            Manage your personal profile, role permissions, authentication credentials, and workspace preferences.
          </p>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1E293B] border border-[#334155] text-xs self-start sm:self-center">
          <span className="w-2 h-2 rounded-full bg-[#36C9A5] animate-pulse"></span>
          <span className="text-slate-300 font-medium">Session Active</span>
        </div>
      </div>

      {/* Identity Summary Card */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#0B1220] border-2 border-[#36C9A5]/40 flex items-center justify-center font-bold text-[#36C9A5] text-xl shrink-0 shadow-lg">
              {user?.firstName?.[0] || 'U'}
              {user?.lastName?.[0] || ''}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  {user?.firstName} {user?.lastName}
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getRoleBadgeStyle(
                    user?.role
                  )}`}
                >
                  <Shield className="w-3 h-3" />
                  {getRoleDisplayName(user?.role)}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#94A3B8] mt-1 font-mono">{user?.email}</p>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-[#36C9A5]" /> VendorBridge ERP
                </span>
                <span>•</span>
                <span className="font-mono text-slate-400">ID: {user?.id || 'usr-default'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#334155] gap-2 overflow-x-auto select-none">
        <button
          onClick={() => setActiveTab('account')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'account'
              ? 'border-[#36C9A5] text-[#36C9A5]'
              : 'border-transparent text-[#94A3B8] hover:text-[#F8FAFC]'
          }`}
        >
          <UserIcon className="w-4 h-4" /> Account Details
        </button>

        <button
          onClick={() => setActiveTab('permissions')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'permissions'
              ? 'border-[#36C9A5] text-[#36C9A5]'
              : 'border-transparent text-[#94A3B8] hover:text-[#F8FAFC]'
          }`}
        >
          <Shield className="w-4 h-4" /> Role & Permissions
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'security'
              ? 'border-[#36C9A5] text-[#36C9A5]'
              : 'border-transparent text-[#94A3B8] hover:text-[#F8FAFC]'
          }`}
        >
          <Lock className="w-4 h-4" /> Security & Password
        </button>

        <button
          onClick={() => setActiveTab('preferences')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'preferences'
              ? 'border-[#36C9A5] text-[#36C9A5]'
              : 'border-transparent text-[#94A3B8] hover:text-[#F8FAFC]'
          }`}
        >
          <Sliders className="w-4 h-4" /> Workspace Preferences
        </button>
      </div>

      {/* Tab 1: Account Information */}
      {activeTab === 'account' && (
        <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-5 sm:p-6 shadow-lg">
          <div className="mb-6">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-[#36C9A5]" /> Personal Profile
            </h3>
            <p className="text-xs text-[#94A3B8] mt-1">
              Identity parameters are managed by system authorization. Contact administration for identity reassignment.
            </p>
          </div>

          {profileSuccessMsg && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{profileSuccessMsg}</span>
            </div>
          )}

          {profileErrorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{profileErrorMsg}</span>
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-5">
            {/* Read-Only Identity Fields */}
            <div className="p-4 rounded-xl bg-[#0B1220] border border-[#334155] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" /> Identity & Organization (Read-Only)
                </span>
                <span className="text-[11px] text-slate-500 font-mono">Immutable System Records</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-[#94A3B8] mb-1 font-medium">User System ID</label>
                  <input
                    type="text"
                    disabled
                    value={user?.id || 'usr-default'}
                    className="w-full px-3 py-2 bg-[#111827] border border-[#334155] rounded-lg text-slate-300 font-mono cursor-not-allowed text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[#94A3B8] mb-1 font-medium">Primary Email Address</label>
                  <input
                    type="text"
                    disabled
                    value={user?.email || ''}
                    className="w-full px-3 py-2 bg-[#111827] border border-[#334155] rounded-lg text-slate-300 font-mono cursor-not-allowed text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[#94A3B8] mb-1 font-medium">Security Role</label>
                  <input
                    type="text"
                    disabled
                    value={getRoleDisplayName(user?.role)}
                    className="w-full px-3 py-2 bg-[#111827] border border-[#334155] rounded-lg text-[#36C9A5] font-semibold cursor-not-allowed text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Editable Fields */}
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                Editable Contact Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#0B1220] border border-[#334155] focus:border-[#36C9A5] focus:outline-none rounded-xl text-sm text-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#0B1220] border border-[#334155] focus:border-[#36C9A5] focus:outline-none rounded-xl text-sm text-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#36C9A5]" /> Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98765 00000"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#0B1220] border border-[#334155] focus:border-[#36C9A5] focus:outline-none rounded-xl text-sm text-white transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#36C9A5]" /> Country / Region
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#0B1220] border border-[#334155] focus:border-[#36C9A5] focus:outline-none rounded-xl text-sm text-white transition-all"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#36C9A5]" /> Job Title & Department Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Lead Procurement Analyst / Operations"
                    value={formData.additionalInfo}
                    onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#0B1220] border border-[#334155] focus:border-[#36C9A5] focus:outline-none rounded-xl text-sm text-white transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#334155] flex justify-end">
              <button
                type="submit"
                disabled={profileSaving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#36C9A5] hover:bg-[#2db893] text-[#0B1220] font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {profileSaving ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Role & Permissions */}
      {activeTab === 'permissions' && (
        <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-5 sm:p-6 shadow-lg space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#334155] pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#36C9A5]" /> Role-Based Access Control (RBAC) Matrix
              </h3>
              <p className="text-xs text-[#94A3B8] mt-1">
                Your account is bound to the{' '}
                <span className="text-white font-semibold">{getRoleDisplayName(user?.role)}</span> security policy.
              </p>
            </div>

            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border self-start ${getRoleBadgeStyle(
                user?.role
              )}`}
            >
              <Shield className="w-3.5 h-3.5" />
              {user?.role}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#334155] text-[#94A3B8] uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Resource / Workflow</th>
                  <th className="py-3 px-4">Access Scope</th>
                  <th className="py-3 px-4 text-right">Privilege Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155]/60">
                {getRolePermissions(user?.role).map((perm, idx) => (
                  <tr key={idx} className="hover:bg-[#273449]/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">{perm.resource}</td>
                    <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">{perm.access}</td>
                    <td className="py-3 px-4 text-right">
                      {perm.allowed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 text-[10px] font-bold">
                          <Check className="w-3 h-3" /> Granted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700 text-[10px] font-semibold">
                          <X className="w-3 h-3" /> Restricted
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 rounded-xl bg-[#0B1220] border border-[#334155] text-xs text-[#94A3B8] flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#36C9A5] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Role permissions are verified on the backend for every request. Any client-side alteration or unauthorized
              API invocation is rejected with an HTTP 403 Forbidden status code.
            </p>
          </div>
        </div>
      )}

      {/* Tab 3: Security & Password */}
      {activeTab === 'security' && (
        <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-5 sm:p-6 shadow-lg space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#36C9A5]" /> Change Password
            </h3>
            <p className="text-xs text-[#94A3B8] mt-1">
              Update your account password. Requires verification of your current password.
            </p>
          </div>

          {passwordSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{passwordSuccessMsg}</span>
            </div>
          )}

          {passwordErrorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{passwordErrorMsg}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Current Password *</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  required
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full px-3.5 py-2 pr-10 bg-[#0B1220] border border-[#334155] focus:border-[#36C9A5] focus:outline-none rounded-xl text-sm text-white transition-all"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">New Password *</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full px-3.5 py-2 pr-10 bg-[#0B1220] border border-[#334155] focus:border-[#36C9A5] focus:outline-none rounded-xl text-sm text-white transition-all"
                  placeholder="Minimum 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-[#94A3B8] mt-1">
                Must be at least 8 characters long and contain both letters and numbers.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Confirm New Password *</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full px-3.5 py-2 pr-10 bg-[#0B1220] border border-[#334155] focus:border-[#36C9A5] focus:outline-none rounded-xl text-sm text-white transition-all"
                  placeholder="Re-enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={passwordSaving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#36C9A5] hover:bg-[#2db893] text-[#0B1220] font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
              >
                <KeyRound className="w-4 h-4" />
                {passwordSaving ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>

          {/* Security Architecture Notes */}
          <div className="pt-4 border-t border-[#334155]">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Authentication Architecture
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#0B1220] border border-[#334155]">
                <p className="text-[#94A3B8]">Session Storage</p>
                <p className="text-white font-medium mt-1">HTTP-Only Cookie</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Protected from XSS tampering</p>
              </div>

              <div className="p-3 rounded-xl bg-[#0B1220] border border-[#334155]">
                <p className="text-[#94A3B8]">Password Hashing</p>
                <p className="text-white font-medium mt-1">bcrypt (10 salt rounds)</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Zero plaintext persistence</p>
              </div>

              <div className="p-3 rounded-xl bg-[#0B1220] border border-[#334155]">
                <p className="text-[#94A3B8]">Brute Force Guard</p>
                <p className="text-white font-medium mt-1">Rate Limiter Active</p>
                <p className="text-[10px] text-slate-500 mt-0.5">30 attempts / 15 mins max</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Workspace Preferences */}
      {activeTab === 'preferences' && (
        <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-5 sm:p-6 shadow-lg space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#36C9A5]" /> Workspace & Layout Preferences
            </h3>
            <p className="text-xs text-[#94A3B8] mt-1">
              Configure local layout and application preferences. Stored locally in your browser session.
            </p>
          </div>

          {prefSavedMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{prefSavedMsg}</span>
            </div>
          )}

          <div className="space-y-4 max-w-xl">
            {/* Desktop Sidebar Preference */}
            <div className="p-4 rounded-xl bg-[#0B1220] border border-[#334155] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#1E293B] border border-[#334155] flex items-center justify-center text-[#36C9A5]">
                  <Laptop className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Default Desktop Sidebar Mode</h4>
                  <p className="text-[11px] text-[#94A3B8] mt-0.5">
                    {sidebarPref ? 'Collapsed (64px icon rail)' : 'Expanded (256px full menu)'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSidebarPrefToggle}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  sidebarPref ? 'bg-[#36C9A5]' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[#0B1220] shadow ring-0 transition duration-200 ease-in-out ${
                    sidebarPref ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Currency Convention */}
            <div className="p-4 rounded-xl bg-[#0B1220] border border-[#334155] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#1E293B] border border-[#334155] flex items-center justify-center text-[#36C9A5]">
                  <IndianRupee className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Procurement Currency Baseline</h4>
                  <p className="text-[11px] text-[#94A3B8] mt-0.5">Indian Rupee (₹ INR) with Lakhs format</p>
                </div>
              </div>

              <span className="text-[11px] font-semibold text-[#36C9A5] px-2.5 py-1 rounded bg-[#36C9A5]/10 border border-[#36C9A5]/30">
                Active Standard
              </span>
            </div>

            {/* In-App Alerts Notification */}
            <div className="p-4 rounded-xl bg-[#0B1220] border border-[#334155] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#1E293B] border border-[#334155] flex items-center justify-center text-[#36C9A5]">
                  <BellRing className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">In-App Notification Alerts</h4>
                  <p className="text-[11px] text-[#94A3B8] mt-0.5">
                    {alertsPref ? 'Enabled for procurement events' : 'Disabled'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAlertsPrefToggle}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  alertsPref ? 'bg-[#36C9A5]' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[#0B1220] shadow ring-0 transition duration-200 ease-in-out ${
                    alertsPref ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
