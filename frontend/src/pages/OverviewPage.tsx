import React, { useEffect, useState } from 'react';
import { Button } from '../components/common/Button';
import { PageId, EvaluationMetricsData, ForecastSummaryItem } from '../types';
import { api } from '../services/api';
import {
  RefreshCw,
  BarChart2
} from 'lucide-react';

interface Props {
  onNavigate: (page: PageId) => void;
}

export const OverviewPage: React.FC<Props> = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [skuCount, setSkuCount] = useState(150);
  const [totalDemandP50, setTotalDemandP50] = useState(8820);
  const [skus, setSkus] = useState<ForecastSummaryItem[]>([]);
  const [evalData, setEvalData] = useState<EvaluationMetricsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [fcsRes, evalRes] = await Promise.all([
        api.getForecastsSummary(),
        api.getEvaluationMetrics(),
      ]);

      setSkuCount(fcsRes.total_skus);
      setTotalDemandP50(fcsRes.total_p50_demand);
      setSkus(fcsRes.items);
      setEvalData(evalRes);
    } catch (err: any) {
      console.error(err);
      setError('Could not connect to live FastAPI backend at http://127.0.0.1:8000');
    } finally {
      setLoading(false);
    }
  };

  // Compute category volume distribution from real backend items
  const categoryBreakdown = React.useMemo(() => {
    const map: Record<string, number> = {};
    skus.forEach((s) => {
      map[s.category] = (map[s.category] || 0) + s.cumulative_p50;
    });
    return Object.entries(map)
      .map(([cat, units]) => ({ category: cat, units }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 5);
  }, [skus]);

  // Executive Chart 1: 8-Week Portfolio Aggregate Launch Trajectory
  const renderPortfolioTrajectoryChart = () => {
    const rampShares = [0.08, 0.14, 0.18, 0.16, 0.14, 0.12, 0.10, 0.08];
    const weeklyP50 = rampShares.map(s => Math.round(totalDemandP50 * s));
    const maxVal = Math.max(...weeklyP50, 100);

    const width = 640;
    const height = 220;
    const padX = 45;
    const padY = 25;
    const chartW = width - padX * 2;
    const chartH = height - padY * 2;

    const getX = (idx: number) => padX + (idx / (weeklyP50.length - 1)) * chartW;
    const getY = (val: number) => height - padY - (val / (maxVal * 1.15)) * chartH;

    let areaPoints = '';
    weeklyP50.forEach((val, idx) => {
      areaPoints += `${getX(idx)},${getY(val * 1.25)} `;
    });
    for (let i = weeklyP50.length - 1; i >= 0; i--) {
      areaPoints += `${getX(i)},${getY(weeklyP50[i] * 0.75)} `;
    }

    const path = weeklyP50.reduce((acc, val, idx) => {
      return `${acc} ${idx === 0 ? 'M' : 'L'} ${getX(idx)},${getY(val)}`;
    }, '');

    return (
      <div className="w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56 select-none">
          <defs>
            <linearGradient id="overviewBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4DAEAB" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#4DAEAB" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {[0, 0.33, 0.66, 1].map((pct, i) => {
            const y = padY + chartH * (1 - pct);
            const val = Math.round(maxVal * 1.15 * pct);
            return (
              <g key={i}>
                <line x1={padX} y1={y} x2={width - padX} y2={y} stroke="#2A3544" strokeDasharray="3 3" />
                <text x={padX - 8} y={y + 3} fill="#75859A" fontSize="9" textAnchor="end" className="tabular-nums font-mono">
                  {val.toLocaleString()}
                </text>
              </g>
            );
          })}

          {weeklyP50.map((_, idx) => {
            const x = getX(idx);
            return (
              <g key={idx}>
                <line x1={x} y1={padY} x2={x} y2={height - padY} stroke="#2A3544" strokeDasharray="2 2" opacity="0.4" />
                <text x={x} y={height - 8} fill="#9AA9BC" fontSize="10" textAnchor="middle" className="tabular-nums font-mono">
                  W{idx + 1}
                </text>
              </g>
            );
          })}

          <polygon points={areaPoints} fill="url(#overviewBand)" stroke="#4DAEAB" strokeWidth="0.75" strokeDasharray="4 2" opacity="0.9" />
          <path d={path} fill="none" stroke="#4DAEAB" strokeWidth="2.5" />

          {weeklyP50.map((val, idx) => {
            const x = getX(idx);
            const y = getY(val);
            return (
              <g key={idx}>
                <circle cx={x} cy={y} r="4" fill="#4DAEAB" stroke="#10151D" strokeWidth="2" />
                <text x={x} y={y - 8} fill="#E7EDF5" fontSize="9" textAnchor="middle" className="tabular-nums font-mono font-bold">
                  {val.toLocaleString()}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="flex items-center justify-between text-[11px] text-[#9AA9BC] mt-2 px-1 border-t border-[#2A3544] pt-2">
          <span className="flex items-center gap-1.5 text-[#E7EDF5]">
            <span className="w-3 h-0.5 bg-[#4DAEAB] rounded inline-block" />
            Aggregate Portfolio Expected Volume
          </span>
          <span className="text-[10px] text-[#75859A]">Across all {skuCount} cold-start candidate introductions</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2A3544] pb-3">
        <div>
          <h1 className="text-lg font-semibold text-[#E7EDF5]">Executive Portfolio Overview</h1>
          <p className="text-xs text-[#9AA9BC]">Real-time demand forecasting intelligence and retail replenishment command center.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate('wizard')}
          >
            Launch Studio &rarr;
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded bg-[#3D1C21] border border-[#E06C75] text-[#E7EDF5] text-xs flex items-center gap-2">
          {error}
        </div>
      )}

      {/* 4 Minimal Metric KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-lg bg-[#171F2A] border border-[#2A3544]">
          <div className="text-[11px] text-[#9AA9BC]">Active Candidate SKUs</div>
          <div className="text-2xl font-bold font-mono text-[#E7EDF5] tabular-nums mt-0.5">
            {skuCount}
          </div>
          <div className="text-[10px] text-[#75859A]">zero historical sales proxy</div>
        </div>

        <div className="p-3.5 rounded-lg bg-[#171F2A] border border-[#2A3544]">
          <div className="text-[11px] text-[#9AA9BC]">Total 8-Week Demand</div>
          <div className="text-2xl font-bold font-mono text-[#4DAEAB] tabular-nums mt-0.5">
            {totalDemandP50.toLocaleString()}
          </div>
          <div className="text-[10px] text-[#75859A]">cumulative P50 expected units</div>
        </div>

        <div className="p-3.5 rounded-lg bg-[#171F2A] border border-[#2A3544]">
          <div className="text-[11px] text-[#9AA9BC]">Holdout Model WAPE</div>
          <div className="text-2xl font-bold font-mono text-[#36B98A] tabular-nums mt-0.5">
            {evalData ? evalData.metrics.wape_percentage : '30.44%'}
          </div>
          <div className="text-[10px] text-[#75859A]">evaluated on untouched test set</div>
        </div>

        <div className="p-3.5 rounded-lg bg-[#171F2A] border border-[#2A3544]">
          <div className="text-[11px] text-[#9AA9BC]">Newsvendor Fractile (CR)</div>
          <div className="text-2xl font-bold font-mono text-[#E7EDF5] tabular-nums mt-0.5">
            62.5%
          </div>
          <div className="text-[10px] text-[#75859A]">optimal stockout vs holding balance</div>
        </div>
      </div>

      {/* ================= CHART-FIRST EXECUTIVE DASHBOARD ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Chart 1: Aggregate Portfolio Trajectory (7 cols) */}
        <div className="lg:col-span-7 p-4 rounded-lg bg-[#171F2A] border border-[#2A3544] space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-[#2A3544]">
            <h3 className="text-sm font-semibold text-[#E7EDF5]">Portfolio Aggregate Demand Ramp</h3>
            <span className="text-xs font-mono text-[#4DAEAB] tabular-nums">Weeks 1 – 8</span>
          </div>
          {renderPortfolioTrajectoryChart()}
        </div>

        {/* Chart 2: Category Volume Breakdown (5 cols) */}
        <div className="lg:col-span-5 p-4 rounded-lg bg-[#171F2A] border border-[#2A3544] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-1 border-b border-[#2A3544]">
              <h3 className="text-sm font-semibold text-[#E7EDF5]">Category Volume Share</h3>
              <BarChart2 className="w-4 h-4 text-[#4DAEAB]" />
            </div>

            <div className="space-y-3 py-3">
              {categoryBreakdown.map((item, idx) => {
                const maxCat = categoryBreakdown[0]?.units || 1;
                const pct = Math.round((item.units / maxCat) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#E7EDF5] font-medium truncate max-w-[170px]">{item.category}</span>
                      <span className="font-mono tabular-nums text-[#4DAEAB] font-semibold">{item.units.toLocaleString()} units</span>
                    </div>
                    <div className="w-full h-2 rounded bg-[#10151D] overflow-hidden">
                      <div
                        className="h-full rounded bg-[#4DAEAB] transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-[#2A3544] pt-2 flex items-center justify-between text-xs text-[#9AA9BC]">
            <span>Computed from {skuCount} active product models.</span>
            <button
              type="button"
              onClick={() => onNavigate('demand_planning')}
              className="text-[#4DAEAB] hover:underline font-medium"
            >
              Open Demand Planning &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* ================= COMPACT RECENT CANDIDATE PREVIEWS ================= */}
      <div className="p-4 rounded-lg bg-[#171F2A] border border-[#2A3544] space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-[#2A3544]">
          <div>
            <h3 className="text-sm font-semibold text-[#E7EDF5]">Top Launch Candidates</h3>
            <p className="text-[11px] text-[#75859A]">Leading cold-start product introductions by expected volume</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('demand_planning')}
          >
            View All 150 SKUs
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[#2A3544] text-[#75859A] font-mono">
                <th className="py-2 px-3">SKU ID</th>
                <th className="py-2 px-3">Department</th>
                <th className="py-2 px-3">Category</th>
                <th className="py-2 px-3 text-right">Target MSRP</th>
                <th className="py-2 px-3 text-right">Planned Doors</th>
                <th className="py-2 px-3 text-right text-[#4DAEAB]">Expected P50</th>
                <th className="py-2 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A3544]/50 font-mono tabular-nums text-[#E7EDF5]">
              {skus.slice(0, 5).map((item) => (
                <tr key={item.sku_id} className="hover:bg-[#1D2734]/50">
                  <td className="py-2 px-3 font-bold text-[#E7EDF5]">{item.sku_id}</td>
                  <td className="py-2 px-3 text-[#9AA9BC] font-sans">{item.department}</td>
                  <td className="py-2 px-3 text-[#9AA9BC] font-sans">{item.category}</td>
                  <td className="py-2 px-3 text-right text-[#9AA9BC]">${item.target_msrp}</td>
                  <td className="py-2 px-3 text-right text-[#75859A]">{item.target_store_count || 150}</td>
                  <td className="py-2 px-3 text-right text-[#4DAEAB] font-bold">{item.cumulative_p50}</td>
                  <td className="py-2 px-3 text-right font-sans">
                    <button
                      type="button"
                      onClick={() => onNavigate('demand_planning')}
                      className="text-[#4DAEAB] hover:underline font-medium"
                    >
                      Inspect &rarr;
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
