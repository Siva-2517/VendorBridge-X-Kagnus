import React, { useState } from 'react';
import { Modal } from '../components/common/Modal';
import { KeyRound, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { api, ApiError } from '../api/client';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRequestToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const data = await api.post<{ success: boolean; message: string; demoResetToken?: string }>(
        '/api/auth/forgot-password',
        { email }
      );
      setMessage(data.message);
      if (data.demoResetToken) {
        setToken(data.demoResetToken);
        setStep('reset');
      }
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Network error occurred. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.post('/api/auth/reset-password', { token, newPassword });
      setMessage('Your password has been successfully reset. You can now log in.');
      setTimeout(() => {
        onClose();
        setStep('request');
        setMessage(null);
      }, 2000);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Network error occurred. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reset Account Password" maxWidth="max-w-md">
      {message && (
        <div className="mb-4 p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-rose-950/40 border border-rose-800/60 rounded-lg text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {step === 'request' ? (
        <form onSubmit={handleRequestToken} className="space-y-4">
          <p className="text-xs text-[#94A3B8]">
            Enter your registered email address. A secure, single-use password reset token will be verified.
          </p>
          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. officer@vendorbridge.com"
              className="w-full px-3 py-2 bg-[#111827] border border-[#334155] rounded-lg text-sm text-[#F8FAFC] placeholder-slate-500 focus:outline-none focus:border-[#36C9A5]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-[#94A3B8] hover:text-[#F8FAFC] rounded-lg hover:bg-[#273449] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-[#36C9A5] hover:bg-[#2db893] text-[#0B1220] text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
              Generate Reset Token
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1">Verification Token</label>
            <input
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full px-3 py-2 bg-[#111827] border border-[#334155] rounded-lg text-xs font-mono text-[#36C9A5] focus:outline-none focus:border-[#36C9A5]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1">New Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters (letters & numbers)"
              className="w-full px-3 py-2 bg-[#111827] border border-[#334155] rounded-lg text-sm text-[#F8FAFC] placeholder-slate-500 focus:outline-none focus:border-[#36C9A5]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1">Confirm New Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full px-3 py-2 bg-[#111827] border border-[#334155] rounded-lg text-sm text-[#F8FAFC] placeholder-slate-500 focus:outline-none focus:border-[#36C9A5]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStep('request')}
              className="px-3 py-1.5 text-xs text-[#94A3B8] hover:text-[#F8FAFC] rounded-lg hover:bg-[#273449] transition-colors"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-[#36C9A5] hover:bg-[#2db893] text-[#0B1220] text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save New Password
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
