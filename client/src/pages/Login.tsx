import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { LogIn, AlertCircle, Loader2, UserCircle } from 'lucide-react';

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
    setEmail(demoEmail);
    setPassword('VendorBridge@2025');
  };

  return (
    <div className="min-h-screen bg-[#070c0a] flex flex-col justify-center items-center p-4 selection:bg-emerald-500 selection:text-white">
      {/* Container matching Screen 1 (Login Screen) */}
      <div className="w-full max-w-md bg-[#0f1813] border border-[#1b2b21] rounded-2xl p-8 shadow-2xl">
        {/* Brand Logo & Photo Avatar Placeholder */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-emerald-500/50 bg-[#14231b] flex flex-col items-center justify-center text-emerald-400 mb-3 shadow-inner">
            <UserCircle className="w-10 h-10" />
            <span className="text-[10px] uppercase font-bold tracking-wider mt-0.5 text-emerald-500/80">Photo</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Sign In to VendorBridge</h2>
          <p className="text-xs text-slate-400 mt-1">Procurement & Vendor ERP Suite</p>
        </div>

        {error && (
          <div className="mb-5 p-3 bg-rose-950/70 border border-rose-800/80 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Username / Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. officer@vendorbridge.com"
              className="w-full px-4 py-2.5 bg-[#090f0c] border border-[#213528] rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
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
              className="w-full px-4 py-2.5 bg-[#090f0c] border border-[#213528] rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            Login Button
          </button>
        </form>

        {/* Quick Demo Credentials Autofill Helper */}
        <div className="mt-6 pt-5 border-t border-[#1b2b21]">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center">
            Demo Credentials (1-Click Fill)
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickDemoFill('admin@vendorbridge.com')}
              className="px-2.5 py-1.5 bg-[#14231b] hover:bg-[#1b3125] text-slate-300 border border-[#253f30] rounded-lg text-left"
            >
              <div className="font-semibold text-emerald-400">Admin</div>
              <div className="text-[10px] text-slate-400 truncate">admin@vendorbridge.com</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoFill('officer@vendorbridge.com')}
              className="px-2.5 py-1.5 bg-[#14231b] hover:bg-[#1b3125] text-slate-300 border border-[#253f30] rounded-lg text-left"
            >
              <div className="font-semibold text-emerald-400">Procurement Officer</div>
              <div className="text-[10px] text-slate-400 truncate">officer@vendorbridge.com</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoFill('manager@vendorbridge.com')}
              className="px-2.5 py-1.5 bg-[#14231b] hover:bg-[#1b3125] text-slate-300 border border-[#253f30] rounded-lg text-left"
            >
              <div className="font-semibold text-emerald-400">Manager / Approver</div>
              <div className="text-[10px] text-slate-400 truncate">manager@vendorbridge.com</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoFill('vendor@infrasupplies.com')}
              className="px-2.5 py-1.5 bg-[#14231b] hover:bg-[#1b3125] text-slate-300 border border-[#253f30] rounded-lg text-left"
            >
              <div className="font-semibold text-emerald-400">Vendor</div>
              <div className="text-[10px] text-slate-400 truncate">vendor@infrasupplies.com</div>
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-4">
            Register here
          </Link>
        </div>
      </div>

      <ForgotPasswordModal isOpen={showForgotModal} onClose={() => setShowForgotModal(false)} />
    </div>
  );
};
