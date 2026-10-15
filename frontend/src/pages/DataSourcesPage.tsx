import React, { useEffect, useState } from 'react';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import {
  PageId,
  DatasetSummaryData,
  LiveProviderResponse,
  LiveProductRecord
} from '../types';
import { api } from '../services/api';
import {
  Database,
  FileText,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Wifi,
  Search,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface Props {
  onNavigate: (page: PageId) => void;
  mode?: 'all' | 'historical_sales' | 'external_sources';
}

export const DataSourcesPage: React.FC<Props> = ({ onNavigate: _onNavigate, mode = 'all' }) => {
  const [_loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DatasetSummaryData | null>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Sample catalog stream state
  const [liveData, setLiveData] = useState<LiveProviderResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [_liveError, setLiveError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // User External Dataset Connector State
  const [externalUrl, setExternalUrl] = useState('');
  const [externalName, setExternalName] = useState('');
  const [connectingExternal, setConnectingExternal] = useState(false);
  const [externalError, setExternalError] = useState<string | null>(null);
  const [externalResult, setExternalResult] = useState<any | null>(null);

  const handleConnectExternal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!externalUrl.trim()) return;
    try {
      setConnectingExternal(true);
      setExternalError(null);
      const res = await api.connectExternalDataset(externalUrl.trim(), externalName.trim() || undefined);
      setExternalResult(res);
    } catch (err: any) {
      setExternalError(err.message || 'Failed to connect external dataset');
    } finally {
      setConnectingExternal(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [sumRes, srcRes, liveRes] = await Promise.all([
        api.getDataSummary(),
        api.getDataSources(),
        api.getLiveData()
      ]);
      setSummary(sumRes);
      setSources(srcRes.sources);
      setLiveData(liveRes);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch dataset summaries or sample feeds.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshLive = async () => {
    try {
      setRefreshing(true);
      setLiveError(null);
      await api.refreshLiveData();
      const [newLive, srcRes] = await Promise.all([
        api.getLiveData(),
        api.getDataSources()
      ]);
      setLiveData(newLive);
      setSources(srcRes.sources);
    } catch (err: any) {
      console.error(err);
      setLiveError(err.message || 'Sample catalog refresh failed.');
    } finally {
      setRefreshing(false);
    }
  };

  const liveStatus = liveData?.provider_status;
  const records: LiveProductRecord[] = liveData?.records || [];
  const categories = ['ALL', ...Array.from(new Set(records.map(r => r.category))).sort()];

  const filteredRecords = records.filter(r => {
    const matchesCat = selectedCategory === 'ALL' || r.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.sku && r.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.brand && r.brand.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded bg-[#3D1C21] border border-[#E06C75] text-[#E7EDF5] text-xs">
          {error}
        </div>
      )}

      {/* Top Banner KPI Cards */}
      <div className={`grid grid-cols-1 ${mode === 'historical_sales' ? 'md:grid-cols-3' : mode === 'external_sources' ? 'md:grid-cols-1 max-w-sm' : 'md:grid-cols-4'} gap-3`}>
        {(mode === 'all' || mode === 'historical_sales') && (
          <>
            <div className="p-3.5 rounded-lg bg-[#171F2A] border border-[#2A3544] flex items-center gap-3">
              <div className="p-2.5 rounded bg-[#102A2B] border border-[#4DAEAB] text-[#4DAEAB]">
                <FileText className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <div className="text-[11px] text-[#9AA9BC]">Raw Dataset File</div>
                <div className="text-xs font-bold text-[#E7EDF5] font-mono truncate">
                  {summary ? summary.file_info.filename : 'Sales_Transactions...'}
                </div>
                <div className="text-[10px] text-[#75859A]">
                  {summary ? summary.file_info.size_mb : 5.48} MB CSV
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#171F2A] border border-[#2A3544] flex items-center gap-3">
              <div className="p-2.5 rounded bg-[#271E3A] border border-[#8B5CF6] text-[#B4A5EC]">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] text-[#9AA9BC]">Historical SKUs</div>
                <div className="text-lg font-bold text-[#E7EDF5] font-mono">
                  {summary ? (summary.dataset_statistics?.total_products || summary.dimensions?.unique_products || 811) : 811} Products
                </div>
                <div className="text-[10px] text-[#75859A]">42,172 weekly observations</div>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#171F2A] border border-[#2A3544] flex items-center gap-3">
              <div className="p-2.5 rounded bg-[#3D2C1B] border border-[#E5B454] text-[#E5B454]">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] text-[#9AA9BC]">Active at Week 0</div>
                <div className="text-lg font-bold text-[#E5B454] font-mono">68.4% (555 SKUs)</div>
                <div className="text-[10px] text-[#75859A]">Unrecorded launch dates</div>
              </div>
            </div>
          </>
        )}

        {(mode === 'all' || mode === 'external_sources') && (
          <div className="p-3.5 rounded-lg bg-[#171F2A] border border-[#2A3544] flex items-center gap-3">
            <div className="p-2.5 rounded bg-[#102A2B] border border-[#36B98A] text-[#36B98A]">
              <Wifi className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-[#9AA9BC]">Sample Online Feed</div>
              <div className="text-lg font-bold text-[#36B98A] font-mono">
                {liveStatus?.is_connected ? `${liveStatus.record_count} Sample Items` : 'Disconnected'}
              </div>
              <div className="text-[10px] text-[#75859A]">
                {liveStatus?.is_connected ? `${liveStatus.latency_ms || 0}ms response (DummyJSON)` : 'No connection'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* External Sources Section */}
      {(mode === 'all' || mode === 'external_sources') && (
        <>
          {/* Custom Connector */}
          <div className="p-4 rounded-lg bg-[#171F2A] border border-[#2A3544] space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-[#2A3544]">
              <div>
                <h3 className="text-sm font-semibold text-[#E7EDF5]">Connect Custom Dataset or Sample Feed</h3>
                <p className="text-[11px] text-[#75859A]">Paste any online CSV link or REST JSON endpoint to inspect columns and preview sample records</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-[#1D2734] border border-[#2A3544] text-[#B4A5EC]">
                External Link Ingestion
              </span>
            </div>

            <form onSubmit={handleConnectExternal} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-semibold text-[#9AA9BC] uppercase tracking-wider mb-1">
                    Feed URL <span className="text-[#E06C75]">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://raw.githubusercontent.com/.../sales.csv or https://api..."
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#10151D] border border-[#2A3544] rounded text-xs text-[#E7EDF5] placeholder-[#75859A] focus:outline-none focus:border-[#4DAEAB]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#9AA9BC] uppercase tracking-wider mb-1">
                    Dataset Label (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sample Category Reference"
                    value={externalName}
                    onChange={(e) => setExternalName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#10151D] border border-[#2A3544] rounded text-xs text-[#E7EDF5] placeholder-[#75859A] focus:outline-none focus:border-[#4DAEAB]"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-[#75859A]">Sample Presets:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setExternalUrl('https://dummyjson.com/products?limit=15');
                      setExternalName('DummyJSON Sample Catalog');
                    }}
                    className="px-2 py-1 text-[11px] bg-[#10151D] hover:bg-[#1D2734] text-[#4DAEAB] border border-[#2A3544] rounded transition-colors"
                  >
                    Sample JSON Feed
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExternalUrl('https://raw.githubusercontent.com/datasets/gdp/master/data/gdp.csv');
                      setExternalName('Public Sample CSV');
                    }}
                    className="px-2 py-1 text-[11px] bg-[#10151D] hover:bg-[#1D2734] text-[#36B98A] border border-[#2A3544] rounded transition-colors"
                  >
                    Sample Online CSV
                  </button>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={connectingExternal || !externalUrl.trim()}
                  className="flex items-center gap-2"
                >
                  {connectingExternal ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Connect & Inspect</span>
                    </>
                  )}
                </Button>
              </div>
            </form>

            {externalError && (
              <div className="p-3 bg-[#3D1C21] border border-[#E06C75] rounded flex items-center gap-2 text-xs text-[#E7EDF5]">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#E06C75]" />
                <span>{externalError}</span>
              </div>
            )}

            {externalResult && (
              <div className="p-3 bg-[#10151D] border border-[#36B98A] rounded-lg space-y-2">
                <div className="flex items-center justify-between border-b border-[#2A3544] pb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#36B98A]" />
                    <span className="text-xs font-semibold text-[#E7EDF5]">
                      Connected: {externalResult.dataset_name}
                    </span>
                    <Badge variant="cyan">{externalResult.format_detected.toUpperCase()}</Badge>
                    <Badge variant="violet">{externalResult.record_count.toLocaleString()} Records</Badge>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {externalResult.columns_or_keys.map((col: string, idx: number) => (
                    <span key={idx} className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#1D2734] text-[#E7EDF5] border border-[#2A3544]">
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sample Online Retail Catalog Feed (DummyJSON) */}
          <div className="p-4 rounded-lg bg-[#171F2A] border border-[#2A3544] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-[#2A3544]">
              <div>
                <h3 className="text-sm font-semibold text-[#E7EDF5]">Sample Online Catalog & Pricing Feed (DummyJSON)</h3>
                <p className="text-[11px] text-[#75859A]">Sample retail catalog feed for benchmarking product attributes and pricing; not verified live retail transaction data.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[#36B98A] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#36B98A]" />
                  Connected (200 OK)
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshLive}
                  disabled={refreshing}
                  icon={<RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
                >
                  {refreshing ? 'Refreshing...' : 'Refresh Feed'}
                </Button>
              </div>
            </div>

            {/* Integrity Notice */}
            <div className="p-2.5 rounded bg-[#10151D] border border-[#2A3544] text-[11px] text-[#9AA9BC] flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-[#4DAEAB] shrink-0 mt-0.5" />
              <div>
                <span className="text-[#E7EDF5] font-semibold">Integrity Notice: </span>
                External sample records are used strictly as merchandise attribute reference presets. They do NOT represent historical sales transactions and are isolated from the 8-week holdout evaluation model.
              </div>
            </div>

            {/* Filter */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="relative w-full max-w-xs">
                <Search className="w-3.5 h-3.5 text-[#75859A] absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Filter sample products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#10151D] border border-[#2A3544] rounded pl-8 pr-2.5 py-1 text-xs text-[#E7EDF5] placeholder-[#75859A] focus:outline-none focus:border-[#4DAEAB]"
                />
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#75859A]">Category:</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-[#10151D] border border-[#2A3544] rounded px-2 py-1 text-xs text-[#E7EDF5] focus:outline-none focus:border-[#4DAEAB]"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <span className="text-[11px] text-[#75859A] font-mono">
                  {filteredRecords.length} records
                </span>
              </div>
            </div>

            {/* Records Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#2A3544] text-[#75859A] font-mono text-[11px]">
                    <th className="py-2 px-3">ID / SKU</th>
                    <th className="py-2 px-3">Product Title</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3">Brand</th>
                    <th className="py-2 px-3 text-right">Sample MSRP</th>
                    <th className="py-2 px-3 text-right">Discount</th>
                    <th className="py-2 px-3 text-center">Rating</th>
                    <th className="py-2 px-3 text-center">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A3544]/60 font-mono tabular-nums text-[#E7EDF5]">
                  {filteredRecords.slice(0, 10).map((r) => (
                    <tr key={r.product_id} className="hover:bg-[#1D2734]/50">
                      <td className="py-2 px-3 text-[#4DAEAB] font-bold">{r.product_id}</td>
                      <td className="py-2 px-3 font-sans truncate max-w-xs">{r.title}</td>
                      <td className="py-2 px-3 font-sans text-[#9AA9BC]">{r.category}</td>
                      <td className="py-2 px-3 font-sans text-[#75859A]">{r.brand || 'Unbranded'}</td>
                      <td className="py-2 px-3 text-right text-[#36B98A] font-bold">${r.price.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right text-[#E5B454]">{r.discount_percentage ? `${r.discount_percentage.toFixed(1)}%` : '—'}</td>
                      <td className="py-2 px-3 text-center text-[#9AA9BC]">{r.rating ? `★ ${r.rating.toFixed(2)}` : '—'}</td>
                      <td className="py-2 px-3 text-center font-sans text-[11px] text-[#75859A]">{r.stock} units</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Historical Sources Grid */}
      {(mode === 'all' || mode === 'historical_sales') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sources.map((src) => (
            <div key={src.source_id} className="p-4 rounded-lg bg-[#171F2A] border border-[#2A3544] space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-[#2A3544]">
                <h4 className="text-xs font-semibold text-[#E7EDF5]">{src.name}</h4>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#10151D] border border-[#2A3544] text-[#4DAEAB]">
                  {src.status === 'live_connected' ? 'Connected' : 'Integrated'}
                </span>
              </div>
              <p className="text-[11px] text-[#9AA9BC] leading-relaxed">{src.notes || src.data_type}</p>
              <div className="pt-2 border-t border-[#2A3544] flex items-center justify-between text-[11px] text-[#75859A] font-mono">
                <span>Records: {src.record_count.toLocaleString()}</span>
                <span className="text-[#36B98A] flex items-center gap-1 font-sans">
                  <CheckCircle className="w-3 h-3" /> Pipeline Ready
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
