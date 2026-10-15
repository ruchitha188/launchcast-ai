import React, { useState, useEffect } from 'react';
import { Button } from '../components/common/Button';
import { PageId, SkuForecastDetails } from '../types';
import { api } from '../services/api';
import { Sliders, RefreshCw, Info } from 'lucide-react';

interface Props {
  onNavigate: (page: PageId) => void;
}

export const NewProductSimulatorPage: React.FC<Props> = ({ onNavigate: _onNavigate }) => {
  const [department, setDepartment] = useState('Apparel & Fashion');
  const [category, setCategory] = useState('Outerwear');
  const [msrp, setMsrp] = useState('129.00');
  const [brandTier, setBrandTier] = useState('Premium / Contemporary');
  const [launchQuarter, setLaunchQuarter] = useState('Q3 (Fall Launch)');
  const [doorCount, setDoorCount] = useState('150');
  const [enableElasticity, setEnableElasticity] = useState(true);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SkuForecastDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hoveredWeek, setHoveredWeek] = useState<number | null>(null);

  useEffect(() => {
    runSimulation();
  }, []);

  const runSimulation = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.simulateNewProduct({
        department,
        category,
        target_msrp: parseFloat(msrp) || 99,
        brand_tier: brandTier,
        launch_quarter: launchQuarter,
        target_store_count: parseInt(doorCount, 10) || 150,
        enable_live_elasticity: enableElasticity
      });
      setResult(res);
    } catch (err: any) {
      console.error(err);
      setError('Simulation failed. Please verify the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const renderSimTrajectoryChart = () => {
    if (!result) return null;
    const weeks = result.weekly_forecasts;
    const bassCurve = result.baseline_comparisons?.bass_weekly_curve || [];
    const maxVal = Math.max(...weeks.map((w) => w.p90_units), ...bassCurve, 10);
    const width = 680;
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
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-64 select-none">
          <defs>
            <linearGradient id="simBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4DAEAB" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#4DAEAB" stopOpacity="0.02" />
            </linearGradient>
          </defs>

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

          <polygon points={areaPoints} fill="url(#simBand)" stroke="#4DAEAB" strokeWidth="0.75" strokeDasharray="4 2" opacity="0.9" />

          {bassPath && (
            <path d={bassPath} fill="none" stroke="#75859A" strokeWidth="1.5" strokeDasharray="4 3" />
          )}

          <path d={p50Path} fill="none" stroke="#4DAEAB" strokeWidth="2.5" />

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
              <span>Simulated P50 Expected Curve</span>
            </span>
            <span className="flex items-center gap-1.5 text-[#9AA9BC]">
              <span className="w-3 h-2 bg-[rgba(77,174,171,0.18)] border border-[#4DAEAB]/40 rounded inline-block" />
              <span>80% Uncertainty Band</span>
            </span>
            {bassPath && (
              <span className="flex items-center gap-1.5 text-[#75859A]">
                <span className="w-3 h-0.5 border-b border-dashed border-[#75859A] inline-block" />
                <span>Bass Model Baseline</span>
              </span>
            )}
          </div>
          <span className="text-[10px] text-[#75859A]">Live ML recalculation on parameter adjustment</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2A3544] pb-3">
        <div>
          <h1 className="text-lg font-semibold text-[#E7EDF5]">What-If Demand Simulator</h1>
          <p className="text-xs text-[#9AA9BC]">Test price elasticity, door footprint, and timing to evaluate launch demand sensitivity.</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={runSimulation}
          disabled={loading}
          icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
        >
          {loading ? 'Simulating...' : 'Recalculate Forecast'}
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded bg-[#3D1C21] border border-[#E06C75] text-[#E7EDF5] text-xs flex items-center gap-2">
          <Info className="w-4 h-4 text-[#E06C75] shrink-0" />
          {error}
        </div>
      )}

      {/* Main Grid: Parameters on Left (5 cols) & Chart on Right (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Sliders & Controls */}
        <div className="lg:col-span-5 p-4 rounded-lg bg-[#171F2A] border border-[#2A3544] space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-[#2A3544]">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#75859A]">
              Simulation Parameters
            </span>
            <Sliders className="w-4 h-4 text-[#4DAEAB]" />
          </div>

          <div className="space-y-3.5 text-xs">
            {/* Price Slider */}
            <div>
              <div className="flex justify-between text-[#9AA9BC] mb-1">
                <span>Target Retail Price</span>
                <span className="font-mono text-[#E7EDF5] font-bold tabular-nums">${parseFloat(msrp).toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="10"
                max="300"
                step="5"
                value={msrp}
                onChange={(e) => setMsrp(e.target.value)}
                className="w-full accent-[#4DAEAB] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#75859A] font-mono">
                <span>$10</span>
                <span>$150</span>
                <span>$300</span>
              </div>
            </div>

            {/* Store Doors Slider */}
            <div>
              <div className="flex justify-between text-[#9AA9BC] mb-1">
                <span>Store Door Footprint</span>
                <span className="font-mono text-[#E7EDF5] font-bold tabular-nums">{doorCount} Doors</span>
              </div>
              <input
                type="range"
                min="10"
                max="500"
                step="10"
                value={doorCount}
                onChange={(e) => setDoorCount(e.target.value)}
                className="w-full accent-[#4DAEAB] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#75859A] font-mono">
                <span>10</span>
                <span>250</span>
                <span>500</span>
              </div>
            </div>

            {/* Department & Category Selectors */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[#9AA9BC] mb-1">Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-2 py-1.5 rounded bg-[#10151D] border border-[#2A3544] text-[#E7EDF5] text-xs focus:outline-none focus:border-[#4DAEAB]"
                >
                  <option>Apparel & Fashion</option>
                  <option>Beauty & Personal Care</option>
                  <option>Footwear & Athletic</option>
                  <option>Consumer Electronics</option>
                </select>
              </div>

              <div>
                <label className="block text-[#9AA9BC] mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-2 py-1.5 rounded bg-[#10151D] border border-[#2A3544] text-[#E7EDF5] text-xs focus:outline-none focus:border-[#4DAEAB]"
                >
                  <option>Outerwear</option>
                  <option>Fragrance & Body</option>
                  <option>Running Footwear</option>
                  <option>Audio & Accessories</option>
                </select>
              </div>
            </div>

            {/* Brand Tier & Launch Quarter */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[#9AA9BC] mb-1">Brand Tier</label>
                <select
                  value={brandTier}
                  onChange={(e) => setBrandTier(e.target.value)}
                  className="w-full px-2 py-1.5 rounded bg-[#10151D] border border-[#2A3544] text-[#E7EDF5] text-xs focus:outline-none focus:border-[#4DAEAB]"
                >
                  <option>Luxury / Designer</option>
                  <option>Premium / Contemporary</option>
                  <option>Mass Retail / Core</option>
                  <option>Value / Fast Turn</option>
                </select>
              </div>

              <div>
                <label className="block text-[#9AA9BC] mb-1">Launch Timing</label>
                <select
                  value={launchQuarter}
                  onChange={(e) => setLaunchQuarter(e.target.value)}
                  className="w-full px-2 py-1.5 rounded bg-[#10151D] border border-[#2A3544] text-[#E7EDF5] text-xs focus:outline-none focus:border-[#4DAEAB]"
                >
                  <option>Q1 (Spring Essentials)</option>
                  <option>Q2 (Summer Active)</option>
                  <option>Q3 (Fall Launch)</option>
                  <option>Q4 (Holiday Peak)</option>
                </select>
              </div>
            </div>

            {/* Price Elasticity Toggle */}
            <div className="pt-2 border-t border-[#2A3544] flex items-center justify-between">
              <div>
                <span className="text-[#E7EDF5] font-medium block">Price Elasticity Model</span>
                <span className="text-[10px] text-[#75859A]">Calibrate with sample market curve</span>
              </div>
              <input
                type="checkbox"
                checked={enableElasticity}
                onChange={(e) => setEnableElasticity(e.target.checked)}
                className="w-4 h-4 accent-[#4DAEAB] cursor-pointer"
              />
            </div>

            <Button
              variant="primary"
              size="md"
              className="w-full mt-2"
              onClick={runSimulation}
              disabled={loading}
            >
              {loading ? 'Simulating...' : 'Apply & Recalculate'}
            </Button>
          </div>
        </div>

        {/* Right Column: Chart-First Simulation Output (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Key Simulation KPIs */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-[#171F2A] border border-[#2A3544]">
              <div className="text-[11px] text-[#9AA9BC]">Simulated P50 Demand</div>
              <div className="text-2xl font-bold font-mono text-[#4DAEAB] tabular-nums mt-0.5">
                {result?.cumulative_demand.p50_point_forecast ?? '-'}
              </div>
              <div className="text-[10px] text-[#75859A]">units across 8 weeks</div>
            </div>

            <div className="p-3 rounded-lg bg-[#171F2A] border border-[#2A3544]">
              <div className="text-[11px] text-[#9AA9BC]">Projected Revenue</div>
              <div className="text-2xl font-bold font-mono text-[#E7EDF5] tabular-nums mt-0.5">
                ${result ? ((result.cumulative_demand.p50_point_forecast) * parseFloat(msrp)).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '-'}
              </div>
              <div className="text-[10px] text-[#75859A]">at ${parseFloat(msrp).toFixed(2)} MSRP</div>
            </div>

            <div className="p-3 rounded-lg bg-[#171F2A] border border-[#2A3544]">
              <div className="text-[11px] text-[#9AA9BC]">Optimal Buy (Q*)</div>
              <div className="text-2xl font-bold font-mono text-[#36B98A] tabular-nums mt-0.5">
                {result?.inventory_recommendation?.recommendation?.recommended_order_quantity ?? 31}
              </div>
              <div className="text-[10px] text-[#75859A]">Newsvendor order</div>
            </div>
          </div>

          {/* Chart View */}
          <div className="p-4 rounded-lg bg-[#171F2A] border border-[#2A3544] space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#E7EDF5]">Simulated Demand Trajectory</h3>
                <p className="text-xs text-[#9AA9BC]">{department} &bull; {category} &bull; {doorCount} Doors</p>
              </div>
              <span className="text-xs font-mono text-[#4DAEAB] tabular-nums">
                P10: {result?.cumulative_demand.p10_lower_bound} &bull; P90: {result?.cumulative_demand.p90_upper_bound}
              </span>
            </div>

            {renderSimTrajectoryChart()}
          </div>
        </div>
      </div>
    </div>
  );
};
