import React, { useState, useEffect } from 'react';
import { PageId } from '../types';
import { InventoryPlannerPage } from './InventoryPlannerPage';
import { StoreAllocationPage } from './StoreAllocationPage';
import { Store, Calculator, FileText } from 'lucide-react';

interface Props {
  onNavigate: (page: PageId) => void;
  initialTab?: 'buy_quantity' | 'purchase_orders' | 'store_allocation';
}

export const InventoryFulfillmentPage: React.FC<Props> = ({
  onNavigate,
  initialTab = 'buy_quantity',
}) => {
  const [activeTab, setActiveTab] = useState<'buy_quantity' | 'purchase_orders' | 'store_allocation'>(initialTab);

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
          onClick={() => setActiveTab('buy_quantity')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'buy_quantity'
              ? 'bg-[#1D2734] text-[#E7EDF5] border border-[#2A3544] font-semibold'
              : 'text-[#9AA9BC] hover:text-[#E7EDF5] hover:bg-[#171F2A] border border-transparent'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>Buy Quantity (Q*)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('purchase_orders')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'purchase_orders'
              ? 'bg-[#1D2734] text-[#E7EDF5] border border-[#2A3544] font-semibold'
              : 'text-[#9AA9BC] hover:text-[#E7EDF5] hover:bg-[#171F2A] border border-transparent'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Purchase Orders</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('store_allocation')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'store_allocation'
              ? 'bg-[#1D2734] text-[#E7EDF5] border border-[#2A3544] font-semibold'
              : 'text-[#9AA9BC] hover:text-[#E7EDF5] hover:bg-[#171F2A] border border-transparent'
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          <span>Store Allocation</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'buy_quantity' ? (
        <InventoryPlannerPage onNavigate={onNavigate} subTab="buy_quantity" />
      ) : activeTab === 'purchase_orders' ? (
        <InventoryPlannerPage onNavigate={onNavigate} subTab="purchase_orders" />
      ) : (
        <StoreAllocationPage onNavigate={onNavigate} />
      )}
    </div>
  );
};
