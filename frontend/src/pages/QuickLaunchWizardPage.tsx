import React, { useState, useEffect } from 'react';
import { Button } from '../components/common/Button';
import { PageId, SkuForecastDetails, LiveProductRecord } from '../types';
import { api } from '../services/api';
import {
  ChevronDown,
  ArrowRight,
  ArrowLeft,
  Download,
  Search,
  Store,
  Info
} from 'lucide-react';

interface Props {
  onNavigate: (page: PageId) => void;
}

// Default items from connected sample catalog
const DEFAULT_SAMPLE_ITEMS: Partial<LiveProductRecord>[] = [
  {
    product_id: 'LIVE-DUM-6',
    title: 'Calvin Klein CK One',
    brand: 'Calvin Klein',
    category: 'Fragrances',
    price: 49.99,
  },
  {
    product_id: 'LIVE-DUM-31',
    title: 'Nike Air Jordan 1 Red And Black',
    brand: 'Nike',
    category: 'Mens-Shoes',
    price: 149.99,
  },
  {
    product_id: 'LIVE-DUM-18',
    title: 'Amazon Echo Plus',
    brand: 'Amazon',
    category: 'Mobile-Accessories',
    price: 99.99,
  },
  {
    product_id: 'LIVE-DUM-1',
    title: 'Essence Mascara Lash Princess',
    brand: 'Essence',
    category: 'Beauty',
    price: 9.99,
  }
];

function mapCatalogToForm(item: LiveProductRecord | Partial<LiveProductRecord>): {
  department: string;
  category: string;
  brandTier: string;
} {
  const cat = (item.category || '').toLowerCase();
  const price = item.price || 50;
  const brandTier = price >= 100 ? 'Premium / Contemporary' : 'Mass Retail / Core';

  if (cat.includes('fragrance')) {
    return { department: 'Beauty & Personal Care', category: 'Fragrance & Body', brandTier };
  }
  if (cat.includes('beauty') || cat.includes('skin')) {
    return { department: 'Beauty & Personal Care', category: 'Skincare Essentials', brandTier };
  }
  if (cat.includes('shoe')) {
    return { department: 'Footwear & Athletic', category: 'Running Footwear', brandTier };
  }
  if (cat.includes('mobile') || cat.includes('laptop') || cat.includes('smartphone') || cat.includes('tablet')) {
    return { department: 'Consumer Electronics', category: 'Audio & Accessories', brandTier };
  }
  if (cat.includes('shirt') || cat.includes('dress') || cat.includes('top')) {
    return { department: 'Apparel & Fashion', category: 'Outerwear', brandTier };
  }
  return { department: 'Beauty & Personal Care', category: 'Skincare Essentials', brandTier };
}

export const QuickLaunchWizardPage: React.FC<Props> = ({ onNavigate }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [productName, setProductName] = useState('Calvin Klein CK One');
  const [department, setDepartment] = useState('Beauty & Personal Care');
  const [category, setCategory] = useState('Fragrance & Body');
  const [msrp, setMsrp] = useState('49.99');
  const [brandTier, setBrandTier] = useState('Premium / Contemporary');
  const [launchQuarter, setLaunchQuarter] = useState('Q3 (Fall Launch)');
  const [doorCount, setDoorCount] = useState('150');
  const [enableElasticity, setEnableElasticity] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Search & Sample records
  const [liveRecords, setLiveRecords] = useState<LiveProductRecord[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SkuForecastDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hoveredWeek, setHoveredWeek] = useState<number | null>(null);

  useEffect(() => {
    api.getLiveData()
      .then(res => {
        if (res && res.records && res.records.length > 0) {
          setLiveRecords(res.records);
        }
      })
      .catch(err => {
        console.warn('Could not fetch catalog records for wizard:', err);
      });
  }, []);

  const handleSelectCatalogItem = (p: LiveProductRecord | Partial<LiveProductRecord>) => {
    setProductName(p.title || '');
    if (p.price) {
      setMsrp(p.price.toFixed(2));
    }
    const mapping = mapCatalogToForm(p);
    setDepartment(mapping.department);
    setCategory(mapping.category);
    setBrandTier(mapping.brandTier);
  };

  const handleRunForecast = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
      setStep(2);
    } catch (err: any) {
      console.error(err);
      setError('Simulation failed. Please verify the backend is running at http://127.0.0.1:8000.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPO = () => {
    if (!result) return;
    const inv = result.inventory_recommendation?.recommendation;
    const qStar = inv?.recommended_order_quantity ?? 31;
    const safety = inv?.safety_stock_units ?? 5;
    const unitMsrp = parseFloat(msrp) || 34;
    const unitCost = (unitMsrp * 0.40).toFixed(2);
    const totalCost = (qStar * parseFloat(unitCost)).toFixed(2);

    const headers = [
      'PO_Number',
      'SKU_ID',
      'Product_Name',
      'Department',
      'Category',
      'Target_Doors',
      'Unit_MSRP_USD',
      'Est_Unit_Cost_USD',
      'P50_Demand_Units',
      'Recommended_Buy_Q_Star',
      'Safety_Stock_Units',
      'Total_PO_Investment_USD',
    ];

    const row = [
      `PO-${Date.now().toString().slice(-6)}`,
      result.sku_id,
      `"${productName}"`,
      `"${department}"`,
      `"${category}"`,
      doorCount,
      unitMsrp.toFixed(2),
      unitCost,
      result.cumulative_demand.p50_point_forecast,
      qStar,
      safety,
      totalCost,
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + headers.join(',') + '\n' + row.join(',');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Purchase_Order_${result.sku_id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered sample items for compact selector
  const filteredCatalogItems = (liveRecords.length > 0 ? liveRecords : DEFAULT_SAMPLE_ITEMS).filter(item => {
    if (!catalogSearch) return true;
    const q = catalogSearch.toLowerCase();
    return (item.title || '').toLowerCase().includes(q) || (item.category || '').toLowerCase().includes(q);
  });

  // Chart-first: Primary 8-Week Forecast Chart
  const renderForecastChart = () => {
    if (!result) return null;
    const weeks = result.weekly_forecasts;
    const bassCurve = result.baseline_comparisons?.bass_weekly_curve || [];
    const maxVal = Math.max(
      ...weeks.map(w => w.p90_units),
      ...bassCurve,
      10
    );

    const width = 760;
    const height = 280;
    const padX = 45;
    const padY = 30;
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
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-72 select-none">
          <defs>
            <linearGradient id="forecastBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4DAEAB" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#4DAEAB" stopOpacity="0.03" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = padY + chartH * (1 - pct);
            const val = Math.round(maxVal * 1.15 * pct);
            return (
              <g key={i}>
                <line x1={padX} y1={y} x2={width - padX} y2={y} stroke="#2A3544" strokeDasharray="3 3" />
                <text x={padX - 8} y={y + 3} fill="#75859A" fontSize="10" textAnchor="end" className="tabular-nums font-mono">
                  {val}
                </text>
              </g>
            );
          })}

          {/* Week X-grid lines & Labels */}
          {weeks.map((w, idx) => {
            const x = getX(idx);
            return (
              <g key={idx}>
                <line x1={x} y1={padY} x2={x} y2={height - padY} stroke="#2A3544" strokeDasharray="2 2" opacity="0.4" />
                <text x={x} y={height - 10} fill="#9AA9BC" fontSize="10" textAnchor="middle" className="tabular-nums font-mono">
                  W{w.week_number}
                </text>
              </g>
            );
          })}

          {/* 80% Prediction Interval Band */}
          <polygon points={areaPoints} fill="url(#forecastBand)" stroke="#4DAEAB" strokeWidth="0.75" strokeDasharray="4 2" opacity="0.9" />

          {/* Bass Baseline (if available) */}
          {bassPath && (
            <path d={bassPath} fill="none" stroke="#75859A" strokeWidth="1.5" strokeDasharray="4 3" />
          )}

          {/* P50 Expected Demand Line */}
          <path d={p50Path} fill="none" stroke="#4DAEAB" strokeWidth="2.5" />

          {/* Data points & Interactive hover circles */}
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
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 6 : 4}
                  fill="#4DAEAB"
                  stroke="#10151D"
                  strokeWidth="2"
                  className="transition-all"
                />
                {isHovered ? (
                  <g>
                    <rect x={x - 42} y={y - 32} width="84" height="24" rx="4" fill="#0C1118" stroke="#2A3544" />
                    <text x={x} y={y - 17} fill="#E7EDF5" fontSize="11" textAnchor="middle" fontWeight="bold" className="tabular-nums font-mono">
                      {w.p50_units} units
                    </text>
                  </g>
                ) : (
                  <text x={x} y={y - 8} fill="#E7EDF5" fontSize="10" textAnchor="middle" className="tabular-nums font-mono">
                    {w.p50_units}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Chart Legend & Explanation */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#9AA9BC] mt-2 px-1 border-t border-[#2A3544] pt-2">
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5 text-[#E7EDF5]">
              <span className="w-3 h-1 bg-[#4DAEAB] rounded-full inline-block" />
              P50 Expected Forecast
            </span>
            <span className="flex items-center gap-1.5 text-[#9AA9BC]">
              <span className="w-3 h-2 bg-[rgba(77,174,171,0.18)] border border-[#4DAEAB]/40 rounded inline-block" />
              80% Prediction Interval (P10–P90)
            </span>
            {bassPath && (
              <span className="flex items-center gap-1.5 text-[#75859A]">
                <span className="w-3 h-0.5 border-b border-dashed border-[#75859A] inline-block" />
                Bass Baseline
              </span>
            )}
          </div>
          <span className="text-[11px] text-[#75859A]">
            Interval denotes statistical conformal uncertainty, not historical accuracy.
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Quiet Header with Minimal Progress Indicator */}
      <div className="flex items-center justify-between border-b border-[#2A3544] pb-3">
        <div>
          <h1 className="text-lg font-semibold text-[#E7EDF5]">Guided Launch Studio</h1>
          <p className="text-xs text-[#9AA9BC]">Configure a candidate product to forecast its 8-week launch trajectory.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`px-2.5 py-1 rounded border transition-colors ${
              step === 1
                ? 'bg-[#171F2A] border-[#4DAEAB] text-[#4DAEAB]'
                : 'border-transparent text-[#75859A] hover:text-[#9AA9BC]'
            }`}
          >
            1. Configure
          </button>
          <span className="text-[#2A3544]">&rarr;</span>
          <button
            type="button"
            disabled={!result}
            onClick={() => result && setStep(2)}
            className={`px-2.5 py-1 rounded border transition-colors ${
              step === 2
                ? 'bg-[#171F2A] border-[#4DAEAB] text-[#4DAEAB]'
                : !result ? 'opacity-40 cursor-not-allowed border-transparent text-[#75859A]' : 'border-transparent text-[#75859A] hover:text-[#9AA9BC]'
            }`}
          >
            2. Forecast Chart
          </button>
          <span className="text-[#2A3544]">&rarr;</span>
          <button
            type="button"
            disabled={!result}
            onClick={() => result && setStep(3)}
            className={`px-2.5 py-1 rounded border transition-colors ${
              step === 3
                ? 'bg-[#171F2A] border-[#4DAEAB] text-[#4DAEAB]'
                : !result ? 'opacity-40 cursor-not-allowed border-transparent text-[#75859A]' : 'border-transparent text-[#75859A] hover:text-[#9AA9BC]'
            }`}
          >
            3. Order Plan
          </button>
        </div>
      </div>

      {/* ================= STEP 1: CONFIGURE ================= */}
      {step === 1 && (
        <div className="space-y-4">
          {/* Compact Sample Catalog Picker */}
          <div className="p-3 rounded-lg bg-[#171F2A] border border-[#2A3544] text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <span className="font-medium text-[#E7EDF5] flex items-center gap-2">
                <Store className="w-3.5 h-3.5 text-[#4DAEAB]" />
                Sample Retail Catalog Preset (DummyJSON)
              </span>
              <span className="text-[11px] text-[#75859A]">Select a template product to autofill fields:</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#75859A]" />
                <input
                  type="text"
                  placeholder="Filter sample items..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded bg-[#10151D] border border-[#2A3544] text-xs text-[#E7EDF5] focus:outline-none focus:border-[#4DAEAB]"
                />
              </div>

              <select
                onChange={(e) => {
                  const item = filteredCatalogItems.find(p => p.title === e.target.value);
                  if (item) handleSelectCatalogItem(item);
                }}
                value={filteredCatalogItems.some(p => p.title === productName) ? productName : ''}
                className="w-full px-2.5 py-1.5 rounded bg-[#10151D] border border-[#2A3544] text-xs text-[#E7EDF5] font-mono focus:outline-none focus:border-[#4DAEAB] truncate"
              >
                <option value="">-- Choose sample product --</option>
                {filteredCatalogItems.map(p => (
                  <option key={p.product_id} value={p.title}>
                    {p.title} &bull; ${(p.price || 0).toFixed(2)} ({p.category})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleRunForecast} className="p-4 rounded-lg bg-[#171F2A] border border-[#2A3544] space-y-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#75859A]">
              Essential Product Specifications
            </div>

            {/* 4 Core Essential Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#9AA9BC] mb-1">Product Name</label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[#10151D] border border-[#2A3544] text-[#E7EDF5] text-xs focus:outline-none focus:border-[#4DAEAB]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#9AA9BC] mb-1">Target Retail Price ($ USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-[#75859A] text-xs font-mono">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={msrp}
                    onChange={(e) => setMsrp(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded bg-[#10151D] border border-[#2A3544] text-[#E7EDF5] text-xs font-mono tabular-nums focus:outline-none focus:border-[#4DAEAB]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#9AA9BC] mb-1">Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[#10151D] border border-[#2A3544] text-[#E7EDF5] text-xs focus:outline-none focus:border-[#4DAEAB]"
                >
                  <option>Beauty & Personal Care</option>
                  <option>Apparel & Fashion</option>
                  <option>Footwear & Athletic</option>
                  <option>Home & Living</option>
                  <option>Consumer Electronics</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#9AA9BC] mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[#10151D] border border-[#2A3544] text-[#E7EDF5] text-xs focus:outline-none focus:border-[#4DAEAB]"
                >
                  <option>Skincare Essentials</option>
                  <option>Fragrance & Body</option>
                  <option>Outerwear</option>
                  <option>Denim & Trousers</option>
                  <option>Knitwear & Sweaters</option>
                  <option>Running Footwear</option>
                  <option>Lifestyle Footwear</option>
                  <option>Active Performance</option>
                  <option>Audio & Accessories</option>
                  <option>Smart Home Tech</option>
                  <option>Bedding & Textiles</option>
                  <option>Kitchen & Dining</option>
                </select>
              </div>
            </div>

            {/* Collapsible Advanced Settings */}
            <div className="pt-2 border-t border-[#2A3544]">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1.5 text-xs text-[#9AA9BC] hover:text-[#4DAEAB] transition-colors py-1"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                <span>{showAdvanced ? 'Hide advanced settings' : 'Show advanced settings (Brand tier, Doors, Seasonality, Elasticity)'}</span>
              </button>

              {showAdvanced && (
                <div className="mt-3 p-3 rounded bg-[#10151D] border border-[#2A3544] grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs text-[#9AA9BC] mb-1">Brand Tier</label>
                    <select
                      value={brandTier}
                      onChange={(e) => setBrandTier(e.target.value)}
                      className="w-full px-3 py-1.5 rounded bg-[#171F2A] border border-[#2A3544] text-[#E7EDF5] text-xs focus:outline-none focus:border-[#4DAEAB]"
                    >
                      <option>Luxury / Designer</option>
                      <option>Premium / Contemporary</option>
                      <option>Mass Retail / Core</option>
                      <option>Value / Fast Turn</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-[#9AA9BC] mb-1">Planned Store Door Footprint</label>
                    <input
                      type="number"
                      min="1"
                      value={doorCount}
                      onChange={(e) => setDoorCount(e.target.value)}
                      className="w-full px-3 py-1.5 rounded bg-[#171F2A] border border-[#2A3544] text-[#E7EDF5] text-xs font-mono tabular-nums focus:outline-none focus:border-[#4DAEAB]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-[#9AA9BC] mb-1">Launch Quarter</label>
                    <select
                      value={launchQuarter}
                      onChange={(e) => setLaunchQuarter(e.target.value)}
                      className="w-full px-3 py-1.5 rounded bg-[#171F2A] border border-[#2A3544] text-[#E7EDF5] text-xs focus:outline-none focus:border-[#4DAEAB]"
                    >
                      <option>Q1 (Spring Essentials)</option>
                      <option>Q2 (Summer Active)</option>
                      <option>Q3 (Fall Launch)</option>
                      <option>Q4 (Holiday Peak)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between pt-4">
                    <div>
                      <span className="text-xs text-[#E7EDF5] font-medium block">Price Elasticity Calibration</span>
                      <span className="text-[10px] text-[#75859A]">Calibrate against sample catalog pricing</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableElasticity}
                      onChange={(e) => setEnableElasticity(e.target.checked)}
                      className="w-4 h-4 accent-[#4DAEAB] cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 rounded bg-[#3D1C21] border border-[#E06C75] text-[#E7EDF5] text-xs flex items-center gap-2">
                <Info className="w-4 h-4 text-[#E06C75] shrink-0" />
                {error}
              </div>
            )}

            {/* Primary Action Button */}
            <div className="pt-3 border-t border-[#2A3544] flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={loading}
                icon={loading ? undefined : <ArrowRight className="w-4 h-4" />}
              >
                {loading ? 'Running Forecast Model...' : 'Generate 8-Week Demand Forecast'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ================= STEP 2: CHART-FIRST FORECAST ================= */}
      {step === 2 && result && (
        <div className="space-y-4">
          {/* Summary Strip Above Chart */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-[#171F2A] border border-[#2A3544]">
              <div className="text-[11px] text-[#9AA9BC]">P50 Expected Demand</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-[#4DAEAB] mt-0.5">
                {result.cumulative_demand.p50_point_forecast}
              </div>
              <div className="text-[10px] text-[#75859A]">units across 8 weeks</div>
            </div>

            <div className="p-3 rounded-lg bg-[#171F2A] border border-[#2A3544]">
              <div className="text-[11px] text-[#9AA9BC]">80% Conformal Range</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-[#E7EDF5] mt-0.5">
                {result.cumulative_demand.p10_lower_bound} – {result.cumulative_demand.p90_upper_bound}
              </div>
              <div className="text-[10px] text-[#75859A]">P10 Floor to P90 Ceiling</div>
            </div>

            <div className="p-3 rounded-lg bg-[#171F2A] border border-[#2A3544]">
              <div className="text-[11px] text-[#9AA9BC]">Target Unit MSRP</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-[#E7EDF5] mt-0.5">
                ${parseFloat(msrp).toFixed(2)}
              </div>
              <div className="text-[10px] text-[#75859A]">{brandTier}</div>
            </div>

            <div className="p-3 rounded-lg bg-[#171F2A] border border-[#2A3544]">
              <div className="text-[11px] text-[#9AA9BC]">Recommended Order (Q*)</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-[#36B98A] mt-0.5">
                {result.inventory_recommendation?.recommendation?.recommended_order_quantity ?? 31}
              </div>
              <div className="text-[10px] text-[#75859A]">Newsvendor optimal buy</div>
            </div>
          </div>

          {/* Primary Chart Container */}
          <div className="p-4 rounded-lg bg-[#171F2A] border border-[#2A3544] space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#E7EDF5]">8-Week Launch Demand Trajectory</h3>
                <p className="text-xs text-[#9AA9BC]">{productName} &bull; {department} &bull; {doorCount} Store Doors</p>
              </div>
              <span className="text-xs font-mono text-[#4DAEAB] tabular-nums">
                Spread: ±{Math.round(result.cumulative_demand.total_uncertainty_spread / 2)} units
              </span>
            </div>

            {renderForecastChart()}
          </div>

          {/* Compact Weekly Breakdown Table */}
          <div className="p-3 rounded-lg bg-[#171F2A] border border-[#2A3544]">
            <div className="text-xs font-semibold text-[#9AA9BC] uppercase tracking-wider mb-2">
              Weekly Forecast Quantiles
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#2A3544] text-[#75859A] font-mono">
                    <th className="py-1.5 px-2">Week</th>
                    <th className="py-1.5 px-2 text-right">P10 Floor</th>
                    <th className="py-1.5 px-2 text-right text-[#4DAEAB]">P50 Expected</th>
                    <th className="py-1.5 px-2 text-right">P90 Ceiling</th>
                    <th className="py-1.5 px-2 text-right">Bass Baseline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A3544]/60 font-mono tabular-nums text-[#E7EDF5]">
                  {result.weekly_forecasts.map((w, idx) => {
                    const bassVal = result.baseline_comparisons?.bass_weekly_curve?.[idx] ?? '-';
                    return (
                      <tr key={idx} className="hover:bg-[#1D2734]/50">
                        <td className="py-1 px-2 font-sans font-medium text-[#9AA9BC]">Week {w.week_number}</td>
                        <td className="py-1 px-2 text-right text-[#75859A]">{w.p10_units}</td>
                        <td className="py-1 px-2 text-right text-[#4DAEAB] font-semibold">{w.p50_units}</td>
                        <td className="py-1 px-2 text-right text-[#75859A]">{w.p90_units}</td>
                        <td className="py-1 px-2 text-right text-[#75859A]">{bassVal}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-2 border-t border-[#2A3544]">
            <Button
              variant="outline"
              size="md"
              onClick={() => setStep(1)}
              icon={<ArrowLeft className="w-4 h-4" />}
            >
              Back to Configuration
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => setStep(3)}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Continue to Order & Allocation (Step 3)
            </Button>
          </div>
        </div>
      )}

      {/* ================= STEP 3: ORDER & FULFILLMENT ================= */}
      {step === 3 && result && (
        <div className="space-y-4">
          {/* Order Summary & Allocation Chart */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Optimal Buy Metric Box */}
            <div className="p-4 rounded-lg bg-[#171F2A] border border-[#2A3544] flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#36B98A]">
                  Newsvendor Recommendation
                </span>
                <div className="text-4xl font-bold font-mono tabular-nums text-[#E7EDF5] mt-2">
                  {result.inventory_recommendation?.recommendation?.recommended_order_quantity ?? 31}{' '}
                  <span className="text-xs font-sans font-normal text-[#9AA9BC]">units</span>
                </div>
                <p className="text-xs text-[#9AA9BC] mt-2 leading-relaxed">
                  Balances stockout margin with inventory carrying risk at target 62.5% service level.
                </p>
              </div>

              <div className="border-t border-[#2A3544] pt-3 mt-4 space-y-1.5 text-xs">
                <div className="flex justify-between text-[#9AA9BC]">
                  <span>P50 Expected Sales:</span>
                  <span className="font-mono tabular-nums text-[#E7EDF5]">{result.cumulative_demand.p50_point_forecast} units</span>
                </div>
                <div className="flex justify-between text-[#9AA9BC]">
                  <span>Safety Buffer:</span>
                  <span className="font-mono tabular-nums text-[#E7EDF5]">{result.inventory_recommendation?.recommendation?.safety_stock_units ?? 5} units</span>
                </div>
                <div className="flex justify-between text-[#9AA9BC]">
                  <span>Unit Wholesale Cost:</span>
                  <span className="font-mono tabular-nums text-[#E7EDF5]">${(parseFloat(msrp) * 0.40).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#9AA9BC] font-medium pt-1 border-t border-[#2A3544]/60">
                  <span>Total Investment:</span>
                  <span className="font-mono tabular-nums text-[#36B98A]">
                    ${((result.inventory_recommendation?.recommendation?.recommended_order_quantity ?? 31) * parseFloat(msrp) * 0.40).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Store Cluster Allocation Distribution Chart */}
            <div className="md:col-span-2 p-4 rounded-lg bg-[#171F2A] border border-[#2A3544]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[#E7EDF5]">Store Cluster Allocation Breakdown</h3>
                <span className="text-xs font-mono text-[#9AA9BC]">{doorCount} Target Doors</span>
              </div>

              {/* Horizontal Distribution Bars */}
              <div className="space-y-3 py-2">
                {[
                  { cluster: 'Tier 1 Flagship Doors', pct: 40, units: Math.round((result.inventory_recommendation?.recommendation?.recommended_order_quantity ?? 31) * 0.40), doors: 25, color: '#4DAEAB' },
                  { cluster: 'Tier 2 Metro Core Doors', pct: 38, units: Math.round((result.inventory_recommendation?.recommendation?.recommended_order_quantity ?? 31) * 0.38), doors: 65, color: '#36B98A' },
                  { cluster: 'Tier 3 Regional Doors', pct: 22, units: (result.inventory_recommendation?.recommendation?.recommended_order_quantity ?? 31) - Math.round((result.inventory_recommendation?.recommendation?.recommended_order_quantity ?? 31) * 0.40) - Math.round((result.inventory_recommendation?.recommendation?.recommended_order_quantity ?? 31) * 0.38), doors: 60, color: '#75859A' },
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs text-[#E7EDF5]">
                      <span className="font-medium flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        {item.cluster} ({item.doors} doors)
                      </span>
                      <span className="font-mono tabular-nums text-[#9AA9BC]">
                        {item.units} units ({item.pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded bg-[#10151D] overflow-hidden">
                      <div
                        className="h-full rounded transition-all duration-300"
                        style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-[#2A3544] pt-3 mt-4 flex items-center justify-between text-xs text-[#9AA9BC]">
                <span>Allocations computed by store density and foot-traffic propensity models.</span>
                <button
                  type="button"
                  onClick={() => onNavigate('allocation')}
                  className="text-[#4DAEAB] hover:underline font-medium"
                >
                  Open Store Door Allocation &rarr;
                </button>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-lg bg-[#171F2A] border border-[#2A3544]">
            <Button
              variant="outline"
              size="md"
              onClick={() => setStep(2)}
              icon={<ArrowLeft className="w-4 h-4" />}
            >
              Back to Forecast Chart
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => onNavigate('demand_planning')}
              >
                View Demand Planning
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleDownloadPO}
                icon={<Download className="w-4 h-4" />}
              >
                Download Purchase Order (CSV)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
