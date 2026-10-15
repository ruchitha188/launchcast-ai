import React, { useEffect, useState } from 'react';
import { Button } from '../components/common/Button';
import { PageId, StoreAllocationData, ForecastSummaryItem } from '../types';
import { api } from '../services/api';
import {
  RefreshCw,
  Info,
  ArrowRight
} from 'lucide-react';

interface Props {
  onNavigate: (page: PageId) => void;
}

export const StoreAllocationPage: React.FC<Props> = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [skus, setSkus] = useState<ForecastSummaryItem[]>([]);
  const [selectedSkuId, setSelectedSkuId] = useState('SKU-NEW-001');
  const [orderUnits, setOrderUnits] = useState<number>(350);
  const [allocation, setAllocation] = useState<StoreAllocationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCatalogAndAllocation();
  }, []);

  const loadCatalogAndAllocation = async () => {
    try {
      setLoading(true);
      const forecastsRes = await api.getForecastsSummary();
      setSkus(forecastsRes.items);
      if (forecastsRes.items.length > 0) {
        const firstSku = forecastsRes.items[0];
        setSelectedSkuId(firstSku.sku_id);
        const estUnits = Math.round(firstSku.cumulative_p90 * 1.1) || 350;
        setOrderUnits(estUnits);
        await runAllocation(firstSku.sku_id, estUnits);
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch allocation data.');
    } finally {
      setLoading(false);
    }
  };

  const runAllocation = async (skuId: string, units: number) => {
    try {
      setLoading(true);
      const res = await api.getAllocationForSku(skuId, units);
      setAllocation(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSkuChange = (skuId: string) => {
    setSelectedSkuId(skuId);
    const sku = skus.find((s) => s.sku_id === skuId);
    const units = sku ? Math.round(sku.cumulative_p90 * 1.1) : 350;
    setOrderUnits(units);
    runAllocation(skuId, units);
  };

  const handleCustomRecalculate = (e: React.FormEvent) => {
    e.preventDefault();
    runAllocation(selectedSkuId, orderUnits);
  };

  // SVG Donut Chart Renderer
  const renderDonutChart = () => {
    if (!allocation) return null;
    const clusters = allocation.cluster_allocations;
    const colors = ['#4DAEAB', '#36B98A', '#75859A'];
    
    const size = 180;
    const strokeWidth = 24;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    let accumulatedPct = 0;

    return (
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
        <div className="relative w-44 h-44 flex items-center justify-center">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
            {/* Background ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#10151D"
              strokeWidth={strokeWidth}
            />
            {/* Cluster segments */}
            {clusters.map((c, i) => {
              const dash = (c.allocation_share_pct / 100) * circumference;
              const offset = (accumulatedPct / 100) * circumference;
              accumulatedPct += c.allocation_share_pct;

              return (
                <circle
                  key={c.cluster_id}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke={colors[i % colors.length]}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${dash} ${circumference}`}
                  strokeDashoffset={-offset}
                  className="transition-all duration-300"
                />
              );
            })}
          </svg>

          {/* Center Callout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-[10px] uppercase font-mono text-[#75859A]">Total Allocated</span>
            <span className="text-xl font-bold font-mono text-[#E7EDF5] tabular-nums">
              {allocation.reconciled_total_quantity.toLocaleString()}
            </span>
            <span className="text-[9px] text-[#9AA9BC]">units</span>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-2 text-xs">
          {clusters.map((c, i) => (
            <div key={c.cluster_id} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
              <div>
                <span className="text-[#E7EDF5] font-medium block truncate max-w-[170px]">{c.cluster_name}</span>
                <span className="text-[10px] font-mono tabular-nums text-[#9AA9BC]">
                  {c.allocated_units} units ({c.allocation_share_pct}%) &bull; {c.store_count} doors
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2A3544] pb-3">
        <div>
          <h1 className="text-lg font-semibold text-[#E7EDF5]">Store Door Allocation Engine</h1>
          <p className="text-xs text-[#9AA9BC]">Reconciles total purchase orders across 150 doors in 3 store tiers without fractional unit loss.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate('inventory')}
          icon={<ArrowRight className="w-3.5 h-3.5" />}
        >
          View Inventory Orders
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded bg-[#3D1C21] border border-[#E06C75] text-[#E7EDF5] text-xs flex items-center gap-2">
          <Info className="w-4 h-4 text-[#E06C75] shrink-0" />
          {error}
        </div>
      )}

      {/* Controller Bar */}
      <form onSubmit={handleCustomRecalculate} className="p-3 rounded-lg bg-[#171F2A] border border-[#2A3544] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <label className="block text-[#9AA9BC] mb-1 font-medium">Candidate SKU</label>
          <select
            value={selectedSkuId}
            onChange={(e) => handleSkuChange(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded bg-[#10151D] border border-[#2A3544] text-xs font-mono text-[#E7EDF5] focus:outline-none focus:border-[#4DAEAB]"
          >
            {skus.map((s) => (
              <option key={s.sku_id} value={s.sku_id}>
                {s.sku_id} &bull; {s.category} (${s.target_msrp || s.target_msrp})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[#9AA9BC] mb-1 font-medium">National Order Quantity (Units)</label>
          <input
            type="number"
            min="1"
            value={orderUnits}
            onChange={(e) => setOrderUnits(parseInt(e.target.value, 10) || 1)}
            className="w-full px-2.5 py-1.5 rounded bg-[#10151D] border border-[#2A3544] text-xs font-mono text-[#E7EDF5] tabular-nums focus:outline-none focus:border-[#4DAEAB]"
          />
        </div>

        <div className="flex items-end">
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={loading}
            className="w-full"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            {loading ? 'Reconciling...' : 'Reconcile Allocation'}
          </Button>
        </div>
      </form>

      {/* Main Chart-First Allocation Matrix */}
      {allocation && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Donut Chart (5 cols) */}
          <div className="lg:col-span-5 p-4 rounded-lg bg-[#171F2A] border border-[#2A3544] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-1 border-b border-[#2A3544]">
                <h3 className="text-sm font-semibold text-[#E7EDF5]">Cluster Allocation Share</h3>
                <span className="text-[10px] font-mono text-[#36B98A] bg-[#133227] px-2 py-0.5 rounded border border-[#24654F]">
                  {allocation.reconciliation_status}
                </span>
              </div>
              <p className="text-[11px] text-[#75859A] mt-1">
                Largest Remainder method ensures 100% exact unit reconciliation.
              </p>
            </div>

            {renderDonutChart()}

            <div className="text-[10px] text-[#75859A] border-t border-[#2A3544] pt-2">
              National Buy: {allocation.total_order_quantity.toLocaleString()} units &bull; Zero inventory lost in rounding.
            </div>
          </div>

          {/* Allocation Table (7 cols) */}
          <div className="lg:col-span-7 p-4 rounded-lg bg-[#171F2A] border border-[#2A3544] space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-[#2A3544]">
              <div>
                <h3 className="text-sm font-semibold text-[#E7EDF5]">Cluster Delivery Ledger</h3>
                <p className="text-[11px] text-[#75859A]">Door counts, weights, and allocated pack quantities</p>
              </div>
              <span className="text-xs font-mono text-[#E7EDF5]">SKU: {allocation.sku_id}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#2A3544] text-[#75859A] font-mono">
                    <th className="py-2 px-2.5">Cluster Tier</th>
                    <th className="py-2 px-2.5 text-right">Doors</th>
                    <th className="py-2 px-2.5 text-right">Weight</th>
                    <th className="py-2 px-2.5 text-right text-[#4DAEAB]">Total Units</th>
                    <th className="py-2 px-2.5 text-right">Units / Door</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A3544]/50 font-mono tabular-nums text-[#E7EDF5]">
                  {allocation.cluster_allocations.map((c) => (
                    <tr key={c.cluster_id} className="hover:bg-[#1D2734]/50">
                      <td className="py-2.5 px-2.5">
                        <div className="font-semibold text-[#E7EDF5] font-sans">{c.cluster_name}</div>
                        <div className="text-[10px] text-[#75859A]">{c.cluster_id}</div>
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-[#9AA9BC]">{c.store_count}</td>
                      <td className="py-2.5 px-2.5 text-right text-[#75859A]">{(c.weight_pct * 100).toFixed(0)}%</td>
                      <td className="py-2.5 px-2.5 text-right text-[#4DAEAB] font-bold text-sm">
                        {c.allocated_units.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-[#9AA9BC] font-semibold">
                        {c.units_per_store}
                      </td>
                    </tr>
                  ))}
                  {/* Total Row */}
                  <tr className="bg-[#1D2734] font-bold border-t border-[#2A3544]">
                    <td className="py-2.5 px-2.5 text-[#E7EDF5] font-sans">National Total</td>
                    <td className="py-2.5 px-2.5 text-right text-[#E7EDF5]">150</td>
                    <td className="py-2.5 px-2.5 text-right text-[#E7EDF5]">100%</td>
                    <td className="py-2.5 px-2.5 text-right text-[#4DAEAB] text-sm font-bold">
                      {allocation.reconciled_total_quantity.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2.5 text-right text-[#E7EDF5]">
                      {(allocation.reconciled_total_quantity / 150).toFixed(1)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="text-[11px] text-[#75859A] border-t border-[#2A3544] pt-2">
              Reconciled via Largest Remainder integer rule. Units match supplier purchase order exactly.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
