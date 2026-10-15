import React, { useState, useEffect } from 'react';
import { PageId } from '../types';
import { ProductExplorerPage } from './ProductExplorerPage';
import { DataSourcesPage } from './DataSourcesPage';
import { PackageSearch, Database, Radio, ShieldCheck } from 'lucide-react';

interface Props {
  onNavigate: (page: PageId) => void;
  initialTab?: 'catalog' | 'historical_sales' | 'external_sources';
}

export const DataProductsPage: React.FC<Props> = ({
  onNavigate,
  initialTab = 'catalog',
}) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'historical_sales' | 'external_sources'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  return (
    <div className="space-y-4">
      {/* Data Provenance & Architecture Hierarchy Banner */}
      <div className="p-3.5 rounded-lg bg-[#171F2A] border border-[#2A3544] text-xs">
        <div className="flex items-center gap-2 mb-2 font-semibold text-[#E7EDF5]">
          <ShieldCheck className="w-4 h-4 text-[#4DAEAB]" />
          <span>Data Provenance & System Architecture Hierarchy</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
          <div className="p-2.5 rounded bg-[#1D2734] border border-[#2A3544]">
            <div className="font-semibold text-[#4DAEAB] flex items-center gap-1.5 mb-0.5">
              <span className="w-2 h-2 rounded-full bg-[#4DAEAB]" />
              1. Historical Sales (Ground Truth)
            </div>
            <p className="text-[#9AA9BC] leading-tight">
              811 products across 52 weeks (42,172 weekly observations) from UCI ML Repository. Used for analog trajectory clustering and holdout backtesting.
            </p>
          </div>

          <div className="p-2.5 rounded bg-[#1D2734] border border-[#2A3544]">
            <div className="font-semibold text-[#B4A5EC] flex items-center gap-1.5 mb-0.5">
              <span className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
              2. Product Catalog (Demo SKUs)
            </div>
            <p className="text-[#9AA9BC] leading-tight">
              150 synthetic candidate SKUs (<code className="text-[#B4A5EC] font-mono">NEW-001..150</code>) modeling zero-sales launch specifications, retail pricing, and store doors.
            </p>
          </div>

          <div className="p-2.5 rounded bg-[#1D2734] border border-[#2A3544]">
            <div className="font-semibold text-[#36B98A] flex items-center gap-1.5 mb-0.5">
              <span className="w-2 h-2 rounded-full bg-[#36B98A]" />
              3. External Sources (Sample Feeds)
            </div>
            <p className="text-[#9AA9BC] leading-tight">
              Sample online merchandise stream (DummyJSON) & external URLs providing sample MSRP, ratings, and discounts for attribute benchmarking.
            </p>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#2A3544] pb-2.5">
        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'catalog'
              ? 'bg-[#1D2734] text-[#E7EDF5] border border-[#2A3544]'
              : 'text-[#9AA9BC] hover:text-[#E7EDF5] hover:bg-[#171F2A] border border-transparent'
          }`}
        >
          <PackageSearch className="w-3.5 h-3.5" />
          <span>Product Catalog</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('historical_sales')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'historical_sales'
              ? 'bg-[#1D2734] text-[#E7EDF5] border border-[#2A3544]'
              : 'text-[#9AA9BC] hover:text-[#E7EDF5] hover:bg-[#171F2A] border border-transparent'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Historical Sales</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('external_sources')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'external_sources'
              ? 'bg-[#1D2734] text-[#E7EDF5] border border-[#2A3544]'
              : 'text-[#9AA9BC] hover:text-[#E7EDF5] hover:bg-[#171F2A] border border-transparent'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>External Sources</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'catalog' ? (
        <ProductExplorerPage onNavigate={onNavigate} />
      ) : activeTab === 'historical_sales' ? (
        <DataSourcesPage onNavigate={onNavigate} mode="historical_sales" />
      ) : (
        <DataSourcesPage onNavigate={onNavigate} mode="external_sources" />
      )}
    </div>
  );
};
