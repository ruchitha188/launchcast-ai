import React, { useEffect, useState } from 'react';
import { PageId, SystemHealth } from '../../types';
import { fetchHealth } from '../../services/api';
import {
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { Button } from '../common/Button';

interface HeaderProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
}

const pageTitles: Record<PageId, { title: string; subtitle: string }> = {
  // 6 Main Destinations
  wizard: {
    title: 'Guided Launch Studio',
    subtitle: '3-step workflow: configure product, predict demand curve, and optimize initial buy quantity',
  },
  demand_planning: {
    title: 'Demand Planning',
    subtitle: 'Forecast portfolio across launch SKUs and what-if parameter sensitivity analysis',
  },
  inventory_fulfillment: {
    title: 'Inventory & Fulfillment',
    subtitle: 'Optimal Newsvendor buy quantities, purchase order generation, and store door allocation',
  },
  data_products: {
    title: 'Data & Products',
    subtitle: 'Product catalog specifications, historical sales transactions, and external catalog sample feeds',
  },
  evaluation: {
    title: 'Model Validation',
    subtitle: 'Holdout evaluation, WAPE benchmarks, conformal calibration, and feature attribution',
  },
  overview: {
    title: 'Overview',
    subtitle: 'Portfolio health, aggregate launch velocity, and inventory readiness metrics',
  },

  // Legacy Aliases & Direct Deep Links
  forecasts: {
    title: 'Demand Planning — Forecast Portfolio',
    subtitle: 'Zero-sales cold-start sales curves with multi-quantile uncertainty bounds (P10/P50/P90)',
  },
  simulator: {
    title: 'Demand Planning — What-If Simulator',
    subtitle: 'Simulate early 8-week sales velocity from product metadata, price, and category priors',
  },
  inventory: {
    title: 'Inventory & Fulfillment — Buy Quantity',
    subtitle: 'Newsvendor critical-fractile purchase orders, service level buffers, and safety stock',
  },
  allocation: {
    title: 'Inventory & Fulfillment — Store Allocation',
    subtitle: 'Distribute planned inventory across store clusters, flagship doors, and regional tiers',
  },
  explorer: {
    title: 'Data & Products — Product Catalog',
    subtitle: 'Browse cold-start launch candidates and historical nearest-neighbor reference SKUs',
  },
  datasources: {
    title: 'Data & Products — External Sources',
    subtitle: 'Product catalog metadata, historical POS reference, store hierarchy, and calendar feeds',
  },
  explainability: {
    title: 'Model Validation — Explainability & Attribution',
    subtitle: 'SHAP value drivers, category price elasticity, and attribute similarity weights',
  },
};

export const Header: React.FC<HeaderProps> = ({ currentPage, onNavigate }) => {
  const [health, setHealth] = useState<SystemHealth>({ status: 'standby', version: '0.1.0' });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkStatus = async () => {
    setIsRefreshing(true);
    const h = await fetchHealth();
    setHealth(h);
    setIsRefreshing(false);
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const meta = pageTitles[currentPage] || pageTitles.wizard;

  return (
    <header className="h-14 border-b border-[#2A3544] bg-[#10151D] px-5 flex items-center justify-between sticky top-0 z-20">
      {/* Page Title & Breadcrumb */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold text-[#E7EDF5] tracking-tight">
            {meta.title}
          </h1>
        </div>
        <p className="text-[11px] text-[#9AA9BC] hidden md:block">
          {meta.subtitle}
        </p>
      </div>

      {/* Right Action Tools */}
      <div className="flex items-center gap-2.5">
        {/* Quick Launch Shortcut */}
        {currentPage !== 'wizard' && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onNavigate('wizard')}
            icon={<Sparkles className="w-3.5 h-3.5 text-[#4DAEAB]" />}
            className="hidden sm:inline-flex"
          >
            Guided Launch
          </Button>
        )}

        {/* Backend Health Badge */}
        <div
          onClick={checkStatus}
          className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#171F2A] border border-[#2A3544] text-xs cursor-pointer hover:border-[#3A485B] transition-colors"
          title="Click to re-ping FastAPI backend"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              health.status === 'online'
                ? 'bg-[#36B98A]'
                : 'bg-[#E5B454]'
            }`}
          />
          <span className="font-mono text-[11px] text-[#9AA9BC]">
            {isRefreshing ? 'Checking...' : health.status === 'online' ? 'API Online' : 'Standby'}
          </span>
          <RefreshCw className={`w-3 h-3 text-[#75859A] ${isRefreshing ? 'animate-spin' : ''}`} />
        </div>
      </div>
    </header>
  );
};
