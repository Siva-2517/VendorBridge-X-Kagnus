import React from 'react';
import { Calendar, Clock, ArrowRight, Lock } from 'lucide-react';

interface FutureModulePlaceholderProps {
  moduleName: string;
  scheduledWeek: string;
  description: string;
  features: string[];
}

export const FutureModulePlaceholder: React.FC<FutureModulePlaceholderProps> = ({
  moduleName,
  scheduledWeek,
  description,
  features,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-[#1E293B] border border-[#334155] rounded-2xl max-w-3xl mx-auto my-12 shadow-xl">
      <div className="w-16 h-16 rounded-2xl bg-[#0B1220] border border-[#334155] flex items-center justify-center text-[#36C9A5] mb-6 shadow-inner">
        <Lock className="w-8 h-8" />
      </div>
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-[#36C9A5]/10 text-[#36C9A5] border border-[#36C9A5]/30 mb-3">
        <Calendar className="w-3.5 h-3.5" />
        Scheduled for {scheduledWeek}
      </div>
      <h2 className="text-2xl font-bold text-white mb-3">{moduleName} Module</h2>
      <p className="text-[#94A3B8] max-w-lg mb-8 text-sm leading-relaxed">{description}</p>

      <div className="w-full bg-[#111827] border border-[#334155] rounded-xl p-6 text-left mb-6">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#36C9A5] mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4" /> Upcoming Architecture Capabilities
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {features.map((feat, idx) => (
            <div key={idx} className="flex items-center gap-2.5 text-sm text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-[#36C9A5]" />
              {feat}
            </div>
          ))}
        </div>
      </div>

      <div className="text-xs text-[#94A3B8] flex items-center gap-1.5">
        <span>Week 1 Foundation active: Vendor Management & RBAC ready</span>
        <ArrowRight className="w-3.5 h-3.5 text-[#36C9A5]" />
      </div>
    </div>
  );
};
