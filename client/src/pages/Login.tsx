import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { LogIn, AlertCircle, Loader2, Building2 } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Authentication failed. Please check your credentials.');
    }
  };

  const handleQuickDemoFill = (demoEmail: string) => {
    if (import.meta.env.DEV) {
      setEmail(demoEmail);
      setPassword('VendorBridge@2025');
    }
  };

  return (
    <div className="min-h-screen bg-[#111827] flex flex-col justify-center items-center p-4 selection:bg-[#36C9A5]/30 selection:text-[#36C9A5]">
      {/* Container matching Screen 1 (Login Screen) */}
      <div className="w-full max-w-md bg-[#1E293B] border border-[#334155] rounded-2xl p-8 shadow-2xl">
        {/* Brand Logo & Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#0B1220] border border-[#36C9A5]/40 flex items-center justify-center text-[#36C9A5] mb-3 shadow-lg shadow-black/30 group hover:border-[#36C9A5] transition-all">
            <Building2 className="w-8 h-8 text-[#36C9A5]" />
          </div>
          <h2 className="text-xl font-bold text-[#F8FAFC] tracking-tight">Sign In to VendorBridge</h2>
          <p className="text-xs text-[#94A3B8] mt-1">Procurement & Vendor ERP Suite</p>
        </div>

        {error && (
          <div className="mb-5 p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5 uppercase tracking-wider">
              Username / Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. officer@vendorbridge.com"
              className="w-full px-4 py-2.5 bg-[#111827] border border-[#334155] rounded-xl text-sm text-[#F8FAFC] placeholder-slate-500 focus:outline-none focus:border-[#36C9A5] focus:ring-1 focus:ring-[#36C9A5] transition-all"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-xs text-[#36C9A5] hover:text-[#2db893] font-medium transition-colors"
              >
                Forgot?
              </button>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-[#111827] border border-[#334155] rounded-xl text-sm text-[#F8FAFC] placeholder-slate-500 focus:outline-none focus:border-[#36C9A5] focus:ring-1 focus:ring-[#36C9A5] transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-[#36C9A5] hover:bg-[#2db893] text-[#0B1220] font-semibold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            Sign in
          </button>
        </form>

        {/* Quick Demo Credentials Autofill Helper (Development Only) */}
        {import.meta.env.DEV && (
          <div className="mt-6 pt-5 border-t border-[#334155]">
            <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-2 text-center">
              Demo Credentials (Dev Mode)
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickDemoFill('admin@vendorbridge.com')}
                className="px-2.5 py-1.5 bg-[#0B1220] hover:bg-[#273449] text-slate-300 border border-[#334155] rounded-lg text-left transition-colors"
              >
                <div className="font-semibold text-[#36C9A5]">Admin</div>
                <div className="text-[10px] text-[#94A3B8] truncate">admin@vendorbridge.com</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoFill('officer@vendorbridge.com')}
                className="px-2.5 py-1.5 bg-[#0B1220] hover:bg-[#273449] text-slate-300 border border-[#334155] rounded-lg text-left transition-colors"
              >
                <div className="font-semibold text-[#36C9A5]">Procurement Officer</div>
                <div className="text-[10px] text-[#94A3B8] truncate">officer@vendorbridge.com</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoFill('manager@vendorbridge.com')}
                className="px-2.5 py-1.5 bg-[#0B1220] hover:bg-[#273449] text-slate-300 border border-[#334155] rounded-lg text-left transition-colors"
              >
                <div className="font-semibold text-[#36C9A5]">Manager / Approver</div>
                <div className="text-[10px] text-[#94A3B8] truncate">manager@vendorbridge.com</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoFill('vendor@infrasupplies.com')}
                className="px-2.5 py-1.5 bg-[#0B1220] hover:bg-[#273449] text-slate-300 border border-[#334155] rounded-lg text-left transition-colors"
              >
                <div className="font-semibold text-[#36C9A5]">Vendor</div>
                <div className="text-[10px] text-[#94A3B8] truncate">vendor@infrasupplies.com</div>
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 text-center text-xs text-[#94A3B8]">
          Don't have an account?{' '}
          <Link to="/register" className="text-[#36C9A5] hover:text-[#2db893] font-semibold underline underline-offset-4 transition-colors">
            Register here
          </Link>
        </div>
      </div>

      <ForgotPasswordModal isOpen={showForgotModal} onClose={() => setShowForgotModal(false)} />
    </div>
  );
};
