import React from 'react';
import { VendorStatus, POStatus } from '../../types';

interface BadgeProps {
  status: VendorStatus | POStatus | string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, className = '' }) => {
  const normalized = status.toUpperCase();

  let styles = 'bg-slate-800/80 text-slate-300 border-slate-700/80';
  let dotColor = 'bg-slate-400';

  if (normalized === 'ACTIVE' || normalized === 'APPROVED') {
    styles = 'bg-emerald-950/40 text-emerald-300 border-emerald-700/40';
    dotColor = 'bg-emerald-400';
  } else if (normalized === 'PENDING') {
    styles = 'bg-amber-950/40 text-amber-300 border-amber-700/40';
    dotColor = 'bg-amber-400';
  } else if (normalized === 'BLOCKED' || normalized === 'REJECTED') {
    styles = 'bg-rose-950/40 text-rose-300 border-rose-700/40';
    dotColor = 'bg-rose-400';
  } else if (normalized === 'DRAFT') {
    styles = 'bg-slate-800/60 text-slate-300 border-slate-700/60';
    dotColor = 'bg-slate-400';
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles} ${className}`}
    >
      <span className={`w-1.5 h-1.5 mr-1.5 rounded-full ${dotColor}`} />
      {status}
    </span>
  );
};
