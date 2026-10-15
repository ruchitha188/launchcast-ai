import React, { useEffect, useState } from 'react';
import { Button } from '../components/common/Button';
import { PageId, ForecastSummaryItem, SkuForecastDetails } from '../types';
import { api } from '../services/api';
import {
  Download,
  Search,
  BarChart2,
  Info
} from 'lucide-react';

interface Props {
  onNavigate: (page: PageId) => void;
}

export const DemandForecastsPage: React.FC<Props> = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [skus, setSkus] = useState<ForecastSummaryItem[]>([]);
  const [selectedSkuId, setSelectedSkuId] = useState<string>('SKU-NEW-001');
  const [skuDetail, setSkuDetail] = useState<SkuForecastDetails | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [error, setError] = useState<string | null>(null);
  const [hoveredWeek, setHoveredWeek] = useState<number | null>(null);

  useEffect(() => {
    loadForecasts();
  }, []);

  const loadForecasts = async () => {
    try {
      setLoading(true);
      const res = await api.getForecastsSummary();
      setSkus(res.items);
      if (res.items.length > 0) {
        setSelectedSkuId(res.items[0].sku_id);
        loadSkuDetail(res.items[0].sku_id);
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch forecasts from backend API.');
    } finally {
      setLoading(false);
    }
  };

  const loadSkuDetail = async (skuId: string) => {
    try {
      setDetailLoading(true);
      const detail = await api.getForecast(skuId);
      setSkuDetail(detail);
      setSelectedSkuId(skuId);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredSkus = skus.filter((item) => {
    const matchesSearch =
      item.sku_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(skus.map((s) => s.category)));

  // Aggregate Category P50 Totals from real backend items for Bar Chart
  const categoryAggregates = React.useMemo(() => {
    const map: Record<string, number> = {};
    skus.forEach((s) => {
      map[s.category] = (map[s.category] || 0) + s.cumulative_p50;
    });
    return Object.entries(map)
      .map(([cat, total]) => ({ category: cat, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [skus]);

  // Chart 1: 8-Week Multi-Quantile Trajectory Line Chart
  const renderTrajectoryChart = () => {
    if (!skuDetail) {
      return (
        <div className="h-64 flex items-center justify-center text-xs text-[#75859A]">
          {detailLoading ? 'Loading forecast trajectory...' : 'Select a SKU to view its 8-week launch curve.'}
        </div>
      );
    }

    const weeks = skuDetail.weekly_forecasts;
    const bassCurve = skuDetail.baseline_comparisons?.bass_weekly_curve || [];
    const maxVal = Math.max(
      ...weeks.map((w) => w.p90_units),
      ...bassCurve,
      10
    );

    const width = 640;
    const height = 240;
    const padX = 40;
    const padY = 25;
    const chartW = width - padX * 2;
    const chartH = height - padY * 2;

    const getX = (idx: number) => padX + (idx / (weeks.length - 1)) * chartW;
    const getY = (val: number) => height - padY - (val / (maxVal * 1.15)) * chartH;

    let areaPoints = '';
    weeks.forEach((w, idx) => {
      areaPoints += `${getX(idx)},${getY(w.p90_units)} `;
    });
    for (let i = weeks.length - 1; i >= 0; i--) {
      areaPoints += `${getX(i)},${getY(weeks[i].p10_units)} `;
    }

    const p50Path = weeks.reduce((acc, w, idx) => {
      return `${acc} ${idx === 0 ? 'M' : 'L'} ${getX(idx)},${getY(w.p50_units)}`;
    }, '');

    const bassPath = bassCurve.reduce((acc, val, idx) => {
      return `${acc} ${idx === 0 ? 'M' : 'L'} ${getX(idx)},${getY(val)}`;
    }, '');

    return (
      <div className="w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-60 select-none">
          <defs>
            <linearGradient id="quantileGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4DAEAB" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#4DAEAB" stopOpacity="0.02" />
            </linearGradient>
          </defs>

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

          {/* X axis week labels */}
          {weeks.map((w, idx) => {
            const x = getX(idx);
            return (
              <g key={idx}>
                <line x1={x} y1={padY} x2={x} y2={height - padY} stroke="#2A3544" strokeDasharray="2 2" opacity="0.4" />
                <text x={x} y={height - 8} fill="#9AA9BC" fontSize="10" textAnchor="middle" className="tabular-nums font-mono">
                  W{w.week_number}
                </text>
              </g>
            );
          })}

          {/* P10 - P90 Uncertainty Corridor */}
          <polygon points={areaPoints} fill="url(#quantileGrad)" stroke="#4DAEAB" strokeWidth="0.75" strokeDasharray="4 2" opacity="0.9" />

          {/* Bass diffusion curve */}
          {bassPath && (
            <path d={bassPath} fill="none" stroke="#75859A" strokeWidth="1.5" strokeDasharray="4 3" />
          )}

          {/* P50 Median Line */}
          <path d={p50Path} fill="none" stroke="#4DAEAB" strokeWidth="2.5" />

          {/* Points on P50 */}
          {weeks.map((w, idx) => {
            const x = getX(idx);
            const y = getY(w.p50_units);
            const isHovered = hoveredWeek === w.week_number;
            return (
              <g
                key={idx}
                onMouseEnter={() => setHoveredWeek(w.week_number)}
                onMouseLeave={() => setHoveredWeek(null)}
                className="cursor-pointer"
              >
                <circle cx={x} cy={y} r={isHovered ? 5.5 : 3.5} fill="#4DAEAB" stroke="#10151D" strokeWidth="2" />
                {isHovered ? (
                  <g>
                    <rect x={x - 38} y={y - 28} width="76" height="20" rx="3" fill="#0C1118" stroke="#2A3544" />
                    <text x={x} y={y - 14} fill="#E7EDF5" fontSize="10" textAnchor="middle" fontWeight="bold" className="tabular-nums font-mono">
                      {w.p50_units} units
                    </text>
                  </g>
                ) : (
                  <text x={x} y={y - 7} fill="#E7EDF5" fontSize="9" textAnchor="middle" className="tabular-nums font-mono">
                    {w.p50_units}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        <div className="flex flex-wrap items-center justify-between text-[11px] text-[#9AA9BC] mt-2 px-1 border-t border-[#2A3544] pt-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[#E7EDF5]">
              <span className="w-3 h-0.5 bg-[#4DAEAB] rounded inline-block" />
              <span>P50 Point Forecast</span>
            </span>
            <span className="flex items-center gap-1.5 text-[#9AA9BC]">
              <span className="w-3 h-2 bg-[rgba(77,174,171,0.18)] border border-[#4DAEAB]/40 rounded inline-block" />
              <span>P10–P90 Uncertainty Band</span>
            </span>
            {bassPath && (
              <span className="flex items-center gap-1.5 text-[#75859A]">
                <span className="w-3 h-0.5 border-b border-dashed border-[#75859A] inline-block" />
                <span>Bass Baseline</span>
              </span>
            )}
          </div>
          <span className="text-[10px] text-[#75859A]">Interval denotes conformal uncertainty bounds.</span>
        </div>
      </div>
    );
  };

  // Chart 2: Category Demand Comparison Bar Chart
  const renderCategoryComparisonChart = () => {
    if (categoryAggregates.length === 0) {
      return (
        <div className="h-64 flex items-center justify-center text-xs text-[#75859A]">
          Loading category data...
        </div>
      );
    }

    const maxTotal = Math.max(...categoryAggregates.map((c) => c.total), 10);

    return (
      <div className="space-y-2.5 py-1">
        {categoryAggregates.map((item, idx) => {
          const pct = Math.round((item.total / maxTotal) * 100);
          const isSelectedCategory = skuDetail?.category === item.category;
          return (
            <div
              key={idx}
              className={`p-1.5 rounded cursor-pointer transition-colors ${
                isSelectedCategory ? 'bg-[#1D2734]' : 'hover:bg-[#1D2734]/50'
              }`}
              onClick={() => {
                setCategoryFilter(item.category);
                const firstInCat = skus.find((s) => s.category === item.category);
                if (firstInCat) loadSkuDetail(firstInCat.sku_id);
              }}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-[#E7EDF5] font-medium truncate max-w-[180px]">{item.category}</span>
                <span className="font-mono tabular-nums text-[#4DAEAB] font-semibold">{item.total.toLocaleString()} units</span>
              </div>
              <div className="w-full h-2 rounded bg-[#10151D] overflow-hidden">
                <div
                  className="h-full rounded transition-all duration-300"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: isSelectedCategory ? '#4DAEAB' : '#2A3544'
                  }}
                />
              </div>
            </div>
          );
        })}
        <div className="text-[10px] text-[#75859A] pt-2 border-t border-[#2A3544] flex justify-between">
          <span>Click a category bar to filter catalog</span>
          <span>Source: Active forecast portfolio</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2A3544] pb-3">
        <div>
          <h1 className="text-lg font-semibold text-[#E7EDF5]">Forecast Portfolio & Demand Curves</h1>
          <p className="text-xs text-[#9AA9BC]">Interactive 8-week quantile trajectories and category demand benchmarks.</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={api.getForecastsExportUrl()}
            download="launchcast_forecasts_portfolio.csv"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#171F2A] border border-[#2A3544] text-xs text-[#E7EDF5] hover:bg-[#1D2734] transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#4DAEAB]" />
            <span>Export Portfolio CSV</span>
          </a>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate('wizard')}
          >
            + New Launch Forecast
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded bg-[#3D1C21] border border-[#E06C75] text-[#E7EDF5] text-xs flex items-center gap-2">
          <Info className="w-4 h-4 text-[#E06C75] shrink-0" />
          {error}
        </div>
      )}

      {/* ================= CHART-FIRST VISUAL WORKSPACE ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Chart 1: Active SKU 8-Week Multi-Quantile Demand Trajectory (7 cols) */}
        <div className="lg:col-span-7 p-4 rounded-lg bg-[#171F2A] border border-[#2A3544] space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-[#E7EDF5]">{selectedSkuId}</span>
                <span className="text-xs text-[#9AA9BC]">&bull; {skuDetail?.category || 'Loading...'}</span>
              </div>
              <p className="text-[11px] text-[#75859A]">
                {skuDetail?.department || 'Department'} &bull; MSRP ${skuDetail?.target_msrp || 99} &bull; {skuDetail?.target_store_count || 150} Doors
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-[#9AA9BC] block">Cumulative Expected (P50)</span>
              <span className="text-lg font-bold font-mono text-[#4DAEAB] tabular-nums">
                {skuDetail?.cumulative_demand.p50_point_forecast ?? '-'} units
              </span>
            </div>
          </div>

          {renderTrajectoryChart()}
        </div>

        {/* Chart 2: Category Demand Distribution Bar Chart (5 cols) */}
        <div className="lg:col-span-5 p-4 rounded-lg bg-[#171F2A] border border-[#2A3544] space-y-2">
          <div className="flex items-center justify-between pb-1">
            <div>
              <h3 className="text-sm font-semibold text-[#E7EDF5]">Category Demand Ranking</h3>
              <p className="text-[11px] text-[#75859A]">Top portfolio categories by P50 units</p>
            </div>
            <BarChart2 className="w-4 h-4 text-[#4DAEAB]" />
          </div>

          {renderCategoryComparisonChart()}
        </div>
      </div>

      {/* ================= COMPACT SKU PORTFOLIO TABLE ================= */}
      <div className="p-4 rounded-lg bg-[#171F2A] border border-[#2A3544] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[#E7EDF5]">Candidate SKU Forecast Portfolio</h3>
            <p className="text-xs text-[#75859A]">{filteredSkus.length} launch items &bull; Click any row to view 8-week trajectory curve</p>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#75859A] absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search SKU ID or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded bg-[#10151D] border border-[#2A3544] text-xs text-[#E7EDF5] focus:outline-none focus:border-[#4DAEAB] w-48 sm:w-56"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded bg-[#10151D] border border-[#2A3544] text-xs text-[#E7EDF5] focus:outline-none focus:border-[#4DAEAB]"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[#2A3544] text-[#75859A] font-mono">
                <th className="py-2 px-3">SKU ID</th>
                <th className="py-2 px-3">Department</th>
                <th className="py-2 px-3">Category</th>
                <th className="py-2 px-3 text-right">MSRP</th>
                <th className="py-2 px-3 text-right">Doors</th>
                <th className="py-2 px-3 text-right">P10 Floor</th>
                <th className="py-2 px-3 text-right text-[#4DAEAB]">P50 Expected</th>
                <th className="py-2 px-3 text-right">P90 Ceiling</th>
                <th className="py-2 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A3544]/50 font-mono tabular-nums text-[#E7EDF5]">
              {loading && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[#75859A] font-sans">
                    Loading portfolio forecasts...
                  </td>
                </tr>
              )}
              {filteredSkus.slice(0, 50).map((item) => {
                const isSelected = item.sku_id === selectedSkuId;
                return (
                  <tr
                    key={item.sku_id}
                    onClick={() => loadSkuDetail(item.sku_id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#1D2734] border-l-2 border-[#4DAEAB]'
                        : 'hover:bg-[#1D2734]/50'
                    }`}
                  >
                    <td className="py-2 px-3 font-bold text-[#E7EDF5] flex items-center gap-1.5">
                      {item.sku_id}
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#4DAEAB]" />}
                    </td>
                    <td className="py-2 px-3 text-[#9AA9BC] font-sans">{item.department}</td>
                    <td className="py-2 px-3 text-[#9AA9BC] font-sans">{item.category}</td>
                    <td className="py-2 px-3 text-right text-[#9AA9BC]">${item.target_msrp}</td>
                    <td className="py-2 px-3 text-right text-[#75859A]">{item.target_store_count || 150}</td>
                    <td className="py-2 px-3 text-right text-[#75859A]">{item.cumulative_p10}</td>
                    <td className="py-2 px-3 text-right text-[#4DAEAB] font-semibold">{item.cumulative_p50}</td>
                    <td className="py-2 px-3 text-right text-[#75859A]">{item.cumulative_p90}</td>
                    <td className="py-2 px-3 text-center font-sans">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#142C30] text-[#4DAEAB] border border-[#26555C]">
                        Active
                      </span>
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
