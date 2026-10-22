import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
import { Building2, UserPlus, AlertCircle, Loader2, ShieldAlert } from 'lucide-react';

export const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    role: 'VENDOR' as Role,
    inviteCode: '',
    country: 'India',
    additionalInfo: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (fieldErrors[e.target.name]) {
      const updated = { ...fieldErrors };
      delete updated[e.target.name];
      setFieldErrors(updated);
    }
  };

  const isPrivilegedRole = formData.role !== 'VENDOR';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const result = await register(formData);
    setLoading(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Registration failed');
      if (result.details) {
        setFieldErrors(result.details);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#111827] flex flex-col justify-center items-center p-4 selection:bg-[#36C9A5]/30 selection:text-[#36C9A5]">
      {/* Container matching Screen 2 (Registration Screen) */}
      <div className="w-full max-w-xl bg-[#1E293B] border border-[#334155] rounded-2xl p-8 shadow-2xl">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#0B1220] border border-[#36C9A5]/40 flex items-center justify-center text-[#36C9A5] mb-3 shadow-lg shadow-black/30 group hover:border-[#36C9A5] transition-all">
            <Building2 className="w-8 h-8 text-[#36C9A5]" />
          </div>
          <h2 className="text-xl font-bold text-[#F8FAFC] tracking-tight">Create VendorBridge Account</h2>
          <p className="text-xs text-[#94A3B8] mt-1">Enterprise Registration & Onboarding</p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* First Name & Last Name (2 columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5 uppercase tracking-wider">
                First Name *
              </label>
              <input
                type="text"
                name="firstName"
                required
                value={formData.firstName}
                onChange={handleChange}
                placeholder="e.g. Rahul"
                className="w-full px-3.5 py-2 bg-[#111827] border border-[#334155] rounded-xl text-sm text-[#F8FAFC] placeholder-slate-500 focus:outline-none focus:border-[#36C9A5] transition-all"
              />
              {fieldErrors.firstName && (
                <p className="text-[11px] text-rose-400 mt-1">{fieldErrors.firstName[0]}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5 uppercase tracking-wider">
                Last Name *
              </label>
              <input
                type="text"
                name="lastName"
                required
                value={formData.lastName}
                onChange={handleChange}
                placeholder="e.g. Mehta"
                className="w-full px-3.5 py-2 bg-[#111827] border border-[#334155] rounded-xl text-sm text-[#F8FAFC] placeholder-slate-500 focus:outline-none focus:border-[#36C9A5] transition-all"
              />
              {fieldErrors.lastName && (
                <p className="text-[11px] text-rose-400 mt-1">{fieldErrors.lastName[0]}</p>
              )}
            </div>
          </div>

          {/* Email Address & Phone Number (2 columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5 uppercase tracking-wider">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="e.g. rahul@example.com"
                className="w-full px-3.5 py-2 bg-[#111827] border border-[#334155] rounded-xl text-sm text-[#F8FAFC] placeholder-slate-500 focus:outline-none focus:border-[#36C9A5] transition-all"
              />
              {fieldErrors.email && (
                <p className="text-[11px] text-rose-400 mt-1">{fieldErrors.email[0]}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5 uppercase tracking-wider">
                Phone Number
              </label>
              <input
                type="text"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-3.5 py-2 bg-[#111827] border border-[#334155] rounded-xl text-sm text-[#F8FAFC] placeholder-slate-500 focus:outline-none focus:border-[#36C9A5] transition-all"
              />
            </div>
          </div>

          {/* Role (Admin, Officer, Manager, Vendor) & Country */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5 uppercase tracking-wider">
                Role (Admin, officer, etc.)
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-3.5 py-2 bg-[#111827] border border-[#334155] rounded-xl text-sm text-[#F8FAFC] focus:outline-none focus:border-[#36C9A5] transition-all"
              >
                <option value="VENDOR">Vendor (Default Standard)</option>
                <option value="PROCUREMENT_OFFICER">Procurement Officer (Elevated)</option>
                <option value="MANAGER_APPROVER">Manager / Approver (Elevated)</option>
                <option value="ADMIN">System Administrator (Elevated)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5 uppercase tracking-wider">
                Country
              </label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
                placeholder="e.g. India"
                className="w-full px-3.5 py-2 bg-[#111827] border border-[#334155] rounded-xl text-sm text-[#F8FAFC] focus:outline-none focus:border-[#36C9A5] transition-all"
              />
            </div>
          </div>

          {/* Privilege Escalation Protection Invite Code if elevated role */}
          {isPrivilegedRole && (
            <div className="p-3.5 bg-amber-950/30 border border-amber-800/50 rounded-xl space-y-1.5">
              <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Privileged Role Authorization Code Required</span>
              </div>
              <p className="text-[11px] text-amber-200/80">
                To prevent unauthorized privilege escalation, registering for an elevated role requires a valid organization authorization code provided by your system administrator.
              </p>
              <input
                type="password"
                name="inviteCode"
                required={isPrivilegedRole}
                value={formData.inviteCode}
                onChange={handleChange}
                placeholder="Enter Authorization Invite Code"
                className="w-full px-3 py-1.5 bg-[#111827] border border-amber-700/60 rounded-lg text-sm text-[#F8FAFC] focus:outline-none focus:border-amber-400"
              />
            </div>
          )}

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5 uppercase tracking-wider">
              Create Password * (min 8 chars, letters & numbers)
            </label>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full px-3.5 py-2 bg-[#111827] border border-[#334155] rounded-xl text-sm text-[#F8FAFC] placeholder-slate-500 focus:outline-none focus:border-[#36C9A5] transition-all"
            />
            {fieldErrors.password && (
              <p className="text-[11px] text-rose-400 mt-1">{fieldErrors.password[0]}</p>
            )}
          </div>

          {/* Additional Information ..... */}
          <div>
            <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5 uppercase tracking-wider">
              Additional Information .....
            </label>
            <textarea
              name="additionalInfo"
              rows={3}
              value={formData.additionalInfo}
              onChange={handleChange}
              placeholder="Department, supplier category, notes or registration remarks..."
              className="w-full px-3.5 py-2 bg-[#111827] border border-[#334155] rounded-xl text-sm text-[#F8FAFC] placeholder-slate-500 focus:outline-none focus:border-[#36C9A5] transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#36C9A5] hover:bg-[#2db893] text-[#0B1220] font-semibold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Register
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-[#94A3B8]">
          Already have an account?{' '}
          <Link to="/login" className="text-[#36C9A5] hover:text-[#2db893] font-semibold underline underline-offset-4 transition-colors">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
};
