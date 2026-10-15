import React, { useEffect, useState } from 'react';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { PageId, ForecastSummaryItem } from '../types';
import { api } from '../services/api';
import {
  Search,
  Plus,
  ArrowRight,
  Download
} from 'lucide-react';

interface Props {
  onNavigate: (page: PageId) => void;
}

export const ProductExplorerPage: React.FC<Props> = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [skus, setSkus] = useState<ForecastSummaryItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedTier, setSelectedTier] = useState('ALL');

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    try {
      setLoading(true);
      const res = await api.getForecastsSummary();
      setSkus(res.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const departments = Array.from(new Set(skus.map((s) => s.department)));
  const brandTiers = Array.from(new Set(skus.map((s) => s.brand_tier)));

  const filtered = skus.filter((s) => {
    const matchSearch =
      s.sku_id.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase()) ||
      s.department.toLowerCase().includes(search.toLowerCase());
    const matchDept = selectedDept === 'ALL' || s.department === selectedDept;
    const matchTier = selectedTier === 'ALL' || s.brand_tier === selectedTier;
    return matchSearch && matchDept && matchTier;
  });

  return (
    <div className="space-y-4">
      {/* Search & Filter Header Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-2 border-b border-[#2A3544]">
        <div>
          <h2 className="text-base font-semibold text-[#E7EDF5] flex items-center gap-2">
            <span>Product Catalog Explorer</span>
            <Badge variant="cyan">{skus.length} Cold-Start SKUs</Badge>
          </h2>
          <p className="text-xs text-[#9AA9BC] mt-0.5">
            Browse, filter, and inspect new product introductions with zero historical sales records.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <a
            href={api.getForecastsExportUrl()}
            download="launchcast_forecasts_150_skus.csv"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#1D2734] border border-[#2A3544] text-[#E7EDF5] hover:text-[#4DAEAB] transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#4DAEAB]" />
            <span>Export Catalog CSV</span>
          </a>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate('simulator')}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Simulate New SKU
          </Button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-[#171F2A] border border-[#2A3544]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#75859A] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search SKU ID, department, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded bg-[#10151D] border border-[#2A3544] text-xs text-[#E7EDF5] placeholder-[#75859A] focus:outline-none focus:border-[#4DAEAB]"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#9AA9BC] whitespace-nowrap">Department:</span>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full px-2 py-1.5 rounded bg-[#10151D] border border-[#2A3544] text-xs text-[#E7EDF5] focus:outline-none focus:border-[#4DAEAB]"
          >
            <option value="ALL">All Departments ({departments.length})</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#9AA9BC] whitespace-nowrap">Brand Tier:</span>
          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="w-full px-2 py-1.5 rounded bg-[#10151D] border border-[#2A3544] text-xs text-[#E7EDF5] focus:outline-none focus:border-[#4DAEAB]"
          >
            <option value="ALL">All Tiers ({brandTiers.length})</option>
            {brandTiers.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Catalog Table */}
      <div className="p-4 rounded-lg bg-[#171F2A] border border-[#2A3544] space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-[#2A3544]">
          <h3 className="text-sm font-semibold text-[#E7EDF5]">
            Candidate Introductions ({filtered.length} of {skus.length} SKUs)
          </h3>
          <span className="text-xs text-[#75859A]">Zero historical sales records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#2A3544] text-[#75859A] font-mono tabular-nums text-[11px]">
                <th className="py-2 px-3">SKU Identifier</th>
                <th className="py-2 px-3">Department & Category</th>
                <th className="py-2 px-3">Positioning Tier</th>
                <th className="py-2 px-3 text-right">Target MSRP</th>
                <th className="py-2 px-3 text-right">Store Doors</th>
                <th className="py-2 px-3 text-right text-[#4DAEAB]">8-Wk P50 Demand</th>
                <th className="py-2 px-3 text-right">Uncertainty (P10-P90)</th>
                <th className="py-2 px-3">Top Analog</th>
                <th className="py-2 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A3544]/60 font-mono tabular-nums">
              {loading && (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-xs text-[#75859A]">
                    Loading catalog candidates...
                  </td>
                </tr>
              )}
              {filtered.map((item) => (
                <tr key={item.sku_id} className="hover:bg-[#1D2734] transition-colors">
                  <td className="py-2 px-3 font-bold text-[#E7EDF5]">
                    {item.sku_id}
                  </td>
                  <td className="py-2 px-3 text-[#E7EDF5]">
                    <div>{item.category}</div>
                    <div className="text-[10px] text-[#75859A] font-sans">{item.department}</div>
                  </td>
                  <td className="py-2 px-3 font-sans">
                    <Badge variant={item.brand_tier === 'Luxury' ? 'violet' : item.brand_tier === 'Premium' ? 'cyan' : 'slate'}>
                      {item.brand_tier}
                    </Badge>
                  </td>
                  <td className="py-2 px-3 text-right text-[#9AA9BC]">${item.target_msrp}</td>
                  <td className="py-2 px-3 text-right text-[#75859A]">{item.target_store_count} Doors</td>
                  <td className="py-2 px-3 text-right text-[#4DAEAB] font-bold">{item.cumulative_p50} units</td>
                  <td className="py-2 px-3 text-right text-[#9AA9BC]">
                    [{item.cumulative_p10} – {item.cumulative_p90}]
                  </td>
                  <td className="py-2 px-3 text-[#E7EDF5]">
                    <span className="text-[#4DAEAB]">{item.top_analog_sku}</span>
                  </td>
                  <td className="py-2 px-3 text-right font-sans">
                    <button
                      onClick={() => onNavigate('forecasts')}
                      className="inline-flex items-center gap-1 text-[11px] text-[#4DAEAB] hover:text-[#65C4BF] font-medium px-2 py-0.5 rounded bg-[#1D2734] border border-[#2A3544] transition-colors"
                    >
                      <span>Forecast</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
