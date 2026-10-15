import React, { useState, useEffect } from 'react';
import { PageId } from '../types';
import { ModelEvaluationPage } from './ModelEvaluationPage';
import { ExplainabilityPage } from './ExplainabilityPage';
import { Target, Brain } from 'lucide-react';

interface Props {
  onNavigate: (page: PageId) => void;
  initialTab?: 'accuracy' | 'explainability';
}

export const ModelValidationPage: React.FC<Props> = ({
  onNavigate,
  initialTab = 'accuracy',
}) => {
  const [activeTab, setActiveTab] = useState<'accuracy' | 'explainability'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#2A3544] pb-2.5">
        <button
          type="button"
          onClick={() => setActiveTab('accuracy')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'accuracy'
              ? 'bg-[#1D2734] text-[#E7EDF5] border border-[#2A3544] font-semibold'
              : 'text-[#9AA9BC] hover:text-[#E7EDF5] hover:bg-[#171F2A] border border-transparent'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>Model Accuracy & Calibration</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('explainability')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'explainability'
              ? 'bg-[#1D2734] text-[#E7EDF5] border border-[#2A3544] font-semibold'
              : 'text-[#9AA9BC] hover:text-[#E7EDF5] hover:bg-[#171F2A] border border-transparent'
          }`}
        >
          <Brain className="w-3.5 h-3.5" />
          <span>Explainability & Attribution</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'accuracy' ? (
        <ModelEvaluationPage onNavigate={onNavigate} />
      ) : (
        <ExplainabilityPage onNavigate={onNavigate} />
      )}
    </div>
  );
};
