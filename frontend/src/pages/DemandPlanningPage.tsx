import React, { useState, useEffect } from 'react';
import { PageId } from '../types';
import { DemandForecastsPage } from './DemandForecastsPage';
import { NewProductSimulatorPage } from './NewProductSimulatorPage';
import { TrendingUp, Sliders } from 'lucide-react';

interface Props {
  onNavigate: (page: PageId) => void;
  initialTab?: 'portfolio' | 'simulator';
}

export const DemandPlanningPage: React.FC<Props> = ({ onNavigate, initialTab = 'portfolio' }) => {
  const [activeTab, setActiveTab] = useState<'portfolio' | 'simulator'>(initialTab);

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
          onClick={() => setActiveTab('portfolio')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'portfolio'
              ? 'bg-[#1D2734] text-[#E7EDF5] border border-[#2A3544] font-semibold'
              : 'text-[#9AA9BC] hover:text-[#E7EDF5] hover:bg-[#171F2A] border border-transparent'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Forecast Portfolio</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('simulator')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'simulator'
              ? 'bg-[#1D2734] text-[#E7EDF5] border border-[#2A3544] font-semibold'
              : 'text-[#9AA9BC] hover:text-[#E7EDF5] hover:bg-[#171F2A] border border-transparent'
            }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>What-If Simulator</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'portfolio' ? (
        <DemandForecastsPage onNavigate={onNavigate} />
      ) : (
        <NewProductSimulatorPage onNavigate={onNavigate} />
      )}
    </div>
  );
};
