import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../types';

interface AccessDeniedProps {
  resourceName?: string;
  allowedRoles?: Role[];
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
  resourceName = 'this procurement module',
  allowedRoles,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

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
        return 'Authenticated User';
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 md:p-12">
      <div className="w-full max-w-lg bg-[#1E293B] border border-[#334155] rounded-2xl p-8 shadow-2xl text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[#0B1220] border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg shadow-black/40">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
            <Lock className="w-3 h-3" />
            403 • Access Restricted
          </span>
          <h2 className="text-xl font-bold text-[#F8FAFC] tracking-tight mt-3">
            Permission Required
          </h2>
          <p className="text-xs text-[#94A3B8] mt-2 leading-relaxed">
            Your current account role (<strong className="text-[#36C9A5]">{getRoleDisplayName(user?.role)}</strong>) does not have authorization to access <span className="text-white font-medium">{resourceName}</span>.
          </p>
        </div>

        {allowedRoles && allowedRoles.length > 0 && (
          <div className="p-3 bg-[#0B1220] border border-[#334155] rounded-xl text-left">
            <p className="text-[11px] text-[#94A3B8] uppercase font-semibold tracking-wider mb-1.5">
              Authorized Roles:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {allowedRoles.map((role) => (
                <span
                  key={role}
                  className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#1E293B] text-slate-300 border border-[#334155]"
                >
                  {getRoleDisplayName(role)}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full sm:w-auto px-5 py-2.5 bg-[#36C9A5] hover:bg-[#2db893] text-[#0B1220] text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
