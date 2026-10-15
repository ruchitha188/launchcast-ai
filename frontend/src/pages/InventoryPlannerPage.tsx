import React, { useEffect, useState } from 'react';
import { Button } from '../components/common/Button';
import { PageId, InventoryRecommendationItem } from '../types';
import { api } from '../services/api';
import {
  Download,
  Store,
  RefreshCw,
  Info,
} from 'lucide-react';

interface Props {
  onNavigate: (page: PageId) => void;
  subTab?: 'all' | 'buy_quantity' | 'purchase_orders';
}

export const InventoryPlannerPage: React.FC<Props> = ({ onNavigate, subTab: _subTab = 'all' }) => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InventoryRecommendationItem[]>([]);
  const [understockCost, setUnderstockCost] = useState(25.0);
  const [overstockCost, setOverstockCost] = useState(15.0);
  const [enableConstraint] = useState(false);
  const [serviceLevelConstraint] = useState(0.95);
  const [selectedItem, setSelectedItem] = useState<InventoryRecommendationItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);
      const constraint = enableConstraint ? serviceLevelConstraint : undefined;
      const res = await api.getInventoryRecommendations(constraint, understockCost, overstockCost);
      setItems(res.recommendations);
      if (res.recommendations.length > 0) {
        setSelectedItem(res.recommendations[0]);
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch inventory recommendations.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = (e: React.FormEvent) => {
    e.preventDefault();
    loadRecommendations();
  };

  const totalBuyUnits = items.reduce((acc, i) => acc + i.recommendation.recommended_order_quantity, 0);
  const totalCost = items.reduce((acc, i) => acc + i.financial_projection.total_order_cost, 0);
  // const _totalSafetyStock = items.reduce((acc, i) => acc + i.recommendation.safety_stock_units, 0);

  const criticalRatioNum = understockCost / (understockCost + overstockCost);
  const criticalRatioStr = criticalRatioNum.toFixed(3);
  /* const _effectiveTargetQuantile = enableConstraint
    ? Math.max(criticalRatioNum, serviceLevelConstraint)
    : criticalRatioNum; */

  // Chart 1: Grouped / Stacked Bar Chart for Top 8 SKUs (Demand vs Q* vs Safety Buffer)
  const renderInventoryComparisonChart = () => {
    if (items.length === 0) {
      return (
        <div className="h-64 flex items-center justify-center text-xs text-[#75859A]">
          Loading inventory optimization data...
        </div>
      );
    }

    const displayItems = items.slice(0, 8);
    const maxVal = Math.max(...displayItems.map((i) => i.recommendation.recommended_order_quantity), 10);
    const width = 640;
    const height = 240;
    const padX = 40;
    const padY = 25;
    const chartW = width - padX * 2;
    const chartH = height - padY * 2;
    const barGroupW = chartW / displayItems.length;

    return (
      <div className="w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-60 select-none">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = padY + chartH * (1 - pct);
            const val = Math.round(maxVal * 1.15 * pct);
            return (
              <g key={i}>
                <line x1={padX} y1={y} x2={width - padX} y2={y} stroke="#2A3544" strokeDasharray="3 3" />
                <text x={padX - 8} y={y + 3} fill="#75859A" fontSize="9" textAnchor="end" className="tabular-nums font-mono">
                  {val}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {displayItems.map((item, idx) => {
            const groupX = padX + idx * barGroupW;
            const barW = Math.min(18, barGroupW * 0.35);
            
            // P50 Demand Bar
            const p50H = (item.recommendation.p50_median_demand / (maxVal * 1.15)) * chartH;
            const p50Y = height - padY - p50H;

            // Q* Order Bar
            const qH = (item.recommendation.recommended_order_quantity / (maxVal * 1.15)) * chartH;
            const qY = height - padY - qH;

            const isSelected = selectedItem?.sku_id === item.sku_id;

            return (
              <g
                key={item.sku_id}
                onClick={() => setSelectedItem(item)}
                className="cursor-pointer"
              >
                {/* P50 Demand */}
                <rect
                  x={groupX + barGroupW * 0.12}
                  y={p50Y}
                  width={barW}
                  height={p50H}
                  rx="2"
                  fill="#4DAEAB"
                  opacity={isSelected ? 1 : 0.8}
                />
                {/* Q* Optimal Buy */}
                <rect
                  x={groupX + barGroupW * 0.12 + barW + 2}
                  y={qY}
                  width={barW}
                  height={qH}
                  rx="2"
                  fill="#36B98A"
                  opacity={isSelected ? 1 : 0.8}
                />

                {/* SKU Label */}
                <text
                  x={groupX + barGroupW * 0.5}
                  y={height - 8}
                  fill={isSelected ? '#E7EDF5' : '#9AA9BC'}
                  fontSize="9"
                  textAnchor="middle"
                  className="font-mono tabular-nums"
                  fontWeight={isSelected ? 'bold' : 'normal'}
                >
                  {item.sku_id.replace('SKU-', '')}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="flex flex-wrap items-center justify-between text-[11px] text-[#9AA9BC] mt-2 px-1 border-t border-[#2A3544] pt-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[#E7EDF5]">
              <span className="w-3 h-2 bg-[#4DAEAB] rounded-xs inline-block" />
              <span>P50 Expected Demand</span>
            </span>
            <span className="flex items-center gap-1.5 text-[#E7EDF5]">
              <span className="w-3 h-2 bg-[#36B98A] rounded-xs inline-block" />
              <span>Recommended Buy Q*</span>
            </span>
          </div>
          <span className="text-[10px] text-[#75859A]">Click any bar to inspect financial unit metrics.</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2A3544] pb-3">
        <div>
          <h1 className="text-lg font-semibold text-[#E7EDF5]">Inventory Orders & Optimal Buy Quantities</h1>
          <p className="text-xs text-[#9AA9BC]">Newsvendor critical fractile profit maximization balancing understock and overstock risks.</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={api.getInventoryExportUrl(enableConstraint ? serviceLevelConstraint : undefined, understockCost, overstockCost)}
            download="launchcast_purchase_orders.csv"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#171F2A] border border-[#2A3544] text-xs text-[#E7EDF5] hover:bg-[#1D2734] transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#4DAEAB]" />
            <span>Export PO CSV</span>
          </a>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('allocation')}
          >
            Open Store Allocation &rarr;
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded bg-[#3D1C21] border border-[#E06C75] text-[#E7EDF5] text-xs flex items-center gap-2">
          <Info className="w-4 h-4 text-[#E06C75] shrink-0" />
          {error}
        </div>
      )}

      {/* ================= CHART-FIRST INVENTORY VIEW ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Chart 1: Demand vs Recommended Buy Quantity (7 cols) */}
        <div className="lg:col-span-7 p-4 rounded-lg bg-[#171F2A] border border-[#2A3544] space-y-2">
          <div className="flex items-center justify-between pb-1">
            <div>
              <h3 className="text-sm font-semibold text-[#E7EDF5]">Expected Demand vs Recommended Buy (Q*)</h3>
              <p className="text-[11px] text-[#75859A]">Candidate SKU order quantities under critical fractile {criticalRatioStr}</p>
            </div>
            <span className="text-xs font-mono text-[#36B98A] tabular-nums font-bold">
              Total Outlay: ${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>

          {renderInventoryComparisonChart()}
        </div>

        {/* Selected SKU Financial Box (5 cols) */}
        <div className="lg:col-span-5 p-4 rounded-lg bg-[#171F2A] border border-[#2A3544] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#2A3544]">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#75859A]">Selected SKU Details</span>
                <div className="font-mono text-base font-bold text-[#E7EDF5]">{selectedItem?.sku_id || 'Select SKU'}</div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#142C30] text-[#4DAEAB] border border-[#26555C]">
                {selectedItem?.category || 'Retail'}
              </span>
            </div>

            {selectedItem ? (
              <div className="space-y-2.5 py-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#9AA9BC]">P50 Expected Demand:</span>
                  <span className="font-mono tabular-nums text-[#E7EDF5] font-semibold">{selectedItem.recommendation.p50_median_demand} units</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9AA9BC]">Optimal Buy Quantity (Q*):</span>
                  <span className="font-mono tabular-nums text-[#36B98A] font-bold text-sm">
                    {selectedItem.recommendation.recommended_order_quantity} units
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9AA9BC]">Safety Stock Buffer:</span>
                  <span className="font-mono tabular-nums text-[#E7EDF5]">+{selectedItem.recommendation.safety_stock_units} units</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9AA9BC]">Unit Retail MSRP:</span>
                  <span className="font-mono tabular-nums text-[#E7EDF5]">${selectedItem.cost_parameters.unit_msrp.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9AA9BC]">Total Initial Purchase Cost:</span>
                  <span className="font-mono tabular-nums text-[#E7EDF5]">${selectedItem.financial_projection.total_order_cost.toFixed(0)}</span>
                </div>
                <div className="flex justify-between border-t border-[#2A3544] pt-2">
                  <span className="text-[#9AA9BC] font-medium">Expected Net Profit:</span>
                  <span className="font-mono tabular-nums text-[#36B98A] font-bold">
                    ${selectedItem.financial_projection.expected_net_profit.toFixed(0)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-[#75859A]">Click any row in the ledger to view economics.</div>
            )}
          </div>

          <div className="border-t border-[#2A3544] pt-2">
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => onNavigate('allocation')}
              icon={<Store className="w-3.5 h-3.5" />}
            >
              Allocate {selectedItem?.recommendation.recommended_order_quantity || 0} Units Across Stores
            </Button>
          </div>
        </div>
      </div>

      {/* ================= NEWSVENDOR OPTIMIZATION STRIP ================= */}
      <form onSubmit={handleRecalculate} className="p-3 rounded-lg bg-[#171F2A] border border-[#2A3544] grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="block text-[#9AA9BC] mb-1 font-medium">Understock Margin Cu ($/unit)</label>
          <input
            type="number"
            value={understockCost}
            onChange={(e) => setUnderstockCost(parseFloat(e.target.value) || 1)}
            className="w-full px-2.5 py-1.5 rounded bg-[#10151D] border border-[#2A3544] text-[#E7EDF5] font-mono tabular-nums focus:outline-none focus:border-[#4DAEAB]"
          />
        </div>

        <div>
          <label className="block text-[#9AA9BC] mb-1 font-medium">Overstock Loss Co ($/unit)</label>
          <input
            type="number"
            value={overstockCost}
            onChange={(e) => setOverstockCost(parseFloat(e.target.value) || 1)}
            className="w-full px-2.5 py-1.5 rounded bg-[#10151D] border border-[#2A3544] text-[#E7EDF5] font-mono tabular-nums focus:outline-none focus:border-[#4DAEAB]"
          />
        </div>

        <div>
          <label className="block text-[#9AA9BC] mb-1 font-medium">Economic Ratio Cu / (Cu + Co)</label>
          <div className="px-2.5 py-1.5 rounded bg-[#10151D] border border-[#2A3544] text-[#4DAEAB] font-mono font-bold tabular-nums">
            {criticalRatioStr} ({(criticalRatioNum * 100).toFixed(1)}%)
          </div>
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
            {loading ? 'Recalculating...' : 'Recalculate Orders'}
          </Button>
        </div>
      </form>

      {/* ================= PURCHASE ORDER LEDGER TABLE ================= */}
      <div className="p-4 rounded-lg bg-[#171F2A] border border-[#2A3544] space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-[#2A3544]">
          <div>
            <h3 className="text-sm font-semibold text-[#E7EDF5]">Purchase Order Ledger</h3>
            <p className="text-[11px] text-[#75859A]">{items.length} initial purchase recommendations</p>
          </div>
          <span className="text-xs font-mono text-[#E7EDF5] tabular-nums">
            Total Units: {totalBuyUnits.toLocaleString()}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[#2A3544] text-[#75859A] font-mono">
                <th className="py-2 px-3">SKU ID</th>
                <th className="py-2 px-3">Category</th>
                <th className="py-2 px-3 text-right">MSRP</th>
                <th className="py-2 px-3 text-right">P50 Demand</th>
                <th className="py-2 px-3 text-right text-[#36B98A]">Order Q*</th>
                <th className="py-2 px-3 text-right">Buffer</th>
                <th className="py-2 px-3 text-right">Spend</th>
                <th className="py-2 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A3544]/50 font-mono tabular-nums text-[#E7EDF5]">
              {items.map((r) => {
                const isSelected = selectedItem?.sku_id === r.sku_id;
                return (
                  <tr
                    key={r.sku_id}
                    onClick={() => setSelectedItem(r)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#1D2734] border-l-2 border-[#4DAEAB]' : 'hover:bg-[#1D2734]/50'
                    }`}
                  >
                    <td className="py-2 px-3 font-bold text-[#E7EDF5]">{r.sku_id}</td>
                    <td className="py-2 px-3 text-[#9AA9BC] font-sans">{r.category}</td>
                    <td className="py-2 px-3 text-right text-[#9AA9BC]">${r.cost_parameters.unit_msrp.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right text-[#75859A]">{r.recommendation.p50_median_demand}</td>
                    <td className="py-2 px-3 text-right font-bold text-[#36B98A] text-sm">
                      {r.recommendation.recommended_order_quantity}
                    </td>
                    <td className="py-2 px-3 text-right text-[#75859A]">+{r.recommendation.safety_stock_units}</td>
                    <td className="py-2 px-3 text-right text-[#E7EDF5]">${r.financial_projection.total_order_cost.toFixed(0)}</td>
                    <td className="py-2 px-3 text-right font-sans">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('allocation');
                        }}
                        className="text-[11px] text-[#4DAEAB] hover:underline font-medium"
                      >
                        Allocate &rarr;
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
