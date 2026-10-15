import React from 'react';
import { Badge } from './Badge';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';

interface FeatureRoadmapItem {
  title: string;
  description: string;
}

interface EmptyStateProps {
  icon: React.ReactNode;
  badgeText: string;
  badgeVariant?: 'cyan' | 'violet' | 'emerald' | 'amber';
  title: string;
  description: string;
  roadmapItems?: FeatureRoadmapItem[];
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
  secondaryNotice?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  badgeText,
  badgeVariant = 'cyan',
  title,
  description,
  roadmapItems,
  actionLabel,
  onAction,
  actionIcon,
  secondaryNotice,
}) => {
  return (
    <div className="rounded-xl border border-dashed border-navy-750 bg-navy-900/40 p-8 md:p-12 text-center max-w-4xl mx-auto my-6">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-navy-800/80 border border-navy-700 text-cyan-400 mb-4 shadow-inner">
        {icon}
      </div>

      <div className="mb-2">
        <Badge variant={badgeVariant}>{badgeText}</Badge>
      </div>

      <h3 className="text-xl font-bold text-slate-100 mb-2">{title}</h3>
      <p className="text-slate-400 text-sm max-w-xl mx-auto leading-relaxed mb-6">
        {description}
      </p>

      {roadmapItems && roadmapItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-left mb-8 max-w-3xl mx-auto">
          {roadmapItems.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-lg bg-navy-850/80 border border-navy-800 hover:border-navy-700 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <h4 className="text-xs font-semibold text-slate-200">{item.title}</h4>
              </div>
              <p className="text-xs text-slate-400 leading-normal">{item.description}</p>
            </div>
          ))}
        </div>
      )}

      {actionLabel && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-navy-800 hover:bg-navy-750 border border-navy-700 hover:border-cyan-500/50 text-slate-200 hover:text-cyan-300 text-xs font-medium transition-all group"
        >
          {actionIcon || <Sparkles className="w-3.5 h-3.5 text-cyan-400" />}
          <span>{actionLabel}</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}

      {secondaryNotice && (
        <p className="text-xs text-slate-500 mt-4 italic">
          {secondaryNotice}
        </p>
      )}
    </div>
  );
};
