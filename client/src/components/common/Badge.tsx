import React from 'react';
import { VendorStatus, POStatus } from '../../types';

interface BadgeProps {
  status: VendorStatus | POStatus | string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, className = '' }) => {
  const normalized = status.toUpperCase();

  let styles = 'bg-slate-800 text-slate-300 border-slate-700';

  if (normalized === 'ACTIVE' || normalized === 'APPROVED') {
    styles = 'bg-emerald-950/70 text-emerald-400 border-emerald-800/60';
  } else if (normalized === 'PENDING') {
    styles = 'bg-amber-950/70 text-amber-400 border-amber-800/60';
  } else if (normalized === 'BLOCKED' || normalized === 'REJECTED') {
    styles = 'bg-rose-950/70 text-rose-400 border-rose-800/60';
  } else if (normalized === 'DRAFT') {
    styles = 'bg-slate-800 text-slate-400 border-slate-700';
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles} ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 mr-1.5 rounded-full ${
          normalized === 'ACTIVE' || normalized === 'APPROVED'
            ? 'bg-emerald-400'
            : normalized === 'PENDING'
            ? 'bg-amber-400'
            : normalized === 'BLOCKED' || normalized === 'REJECTED'
            ? 'bg-rose-400'
            : 'bg-slate-400'
        }`}
      />
      {status}
    </span>
  );
};
