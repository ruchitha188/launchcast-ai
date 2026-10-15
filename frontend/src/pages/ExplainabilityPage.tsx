import React, { useEffect, useState } from 'react';
import { Button } from '../components/common/Button';
import { PageId, TopUncertainSkuItem, ExplainabilityDetails } from '../types';
import { api } from '../services/api';
import {
  Brain,
  GitCompare,
  ShieldAlert,
  ArrowRight,
  Info,
  Download
} from 'lucide-react';

interface Props {
  onNavigate: (page: PageId) => void;
}

export const ExplainabilityPage: React.FC<Props> = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [topUncertain, setTopUncertain] = useState<TopUncertainSkuItem[]>([]);
  const [selectedSkuId, setSelectedSkuId] = useState<string>('');
  const [detail, setDetail] = useState<ExplainabilityDetails | null>(null);
  const [_detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUncertainSkus();
  }, []);

  const loadUncertainSkus = async () => {
    try {
      setLoading(true);
      const res = await api.getTop10UncertainSkus();
      const list = res.top_10_uncertain_skus || [];
      setTopUncertain(list);
      if (list.length > 0) {
        const first = list[0];
        setSelectedSkuId(first.sku_id);
        loadSkuDetail(first.sku_id);
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch uncertainty rankings.');
    } finally {
      setLoading(false);
    }
  };

  const loadSkuDetail = async (skuId: string) => {
    try {
      setDetailLoading(true);
      const res = await api.getExplainabilityForSku(skuId);
      setDetail(res);
      setSelectedSkuId(skuId);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-lg bg-[#171F2A] border border-[#2A3544] flex items-center gap-3">
          <div className="p-2.5 rounded bg-[#3D2C1B] border border-[#E5B454] text-[#E5B454]">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-[#9AA9BC]">Governance Focus</div>
            <div className="text-sm font-bold text-[#E7EDF5] font-mono">10 Least-Confident SKUs</div>
            <div className="text-[10px] text-[#75859A]">Multifactor uncertainty ranking</div>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-[#171F2A] border border-[#2A3544] flex items-center gap-3">
          <div className="p-2.5 rounded bg-[#271E3A] border border-[#8B5CF6] text-[#B4A5EC]">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-[#9AA9BC]">Feature Attribution</div>
            <div className="text-sm font-bold text-[#E7EDF5] font-mono">Category & MSRP</div>
            <div className="text-[10px] text-[#75859A]">Attribute impact weighting</div>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-[#171F2A] border border-[#2A3544] flex items-center gap-3">
          <div className="p-2.5 rounded bg-[#102A2B] border border-[#4DAEAB] text-[#4DAEAB]">
            <GitCompare className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-[#9AA9BC]">Analog Support</div>
            <div className="text-sm font-bold text-[#E7EDF5] font-mono">k = 5 Precedents</div>
            <div className="text-[10px] text-[#75859A]">Empirical historical launch curves</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded bg-[#3D1C21] border border-[#E06C75] text-[#E7EDF5] text-xs">
          {error}
        </div>
      )}

      {/* Top 10 Least-Confident SKUs Table */}
      <div className="p-4 rounded-lg bg-[#171F2A] border border-[#2A3544] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-[#2A3544]">
          <div>
            <h3 className="text-sm font-semibold text-[#E7EDF5]">Top 10 Least-Confident New SKUs</h3>
            <p className="text-[11px] text-[#75859A]">Ranked by wide prediction intervals, model divergence, and weak analog support</p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={api.getUncertainExportUrl()}
              download="launchcast_top10_uncertain_skus.csv"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-[#1D2734] border border-[#2A3544] text-[#E5B454] hover:bg-[#1D2734]/80 transition-colors"
            >
              <Download className="w-3 h-3" />
              <span>Export Top 10 CSV</span>
            </a>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('simulator')}
              icon={<ArrowRight className="w-3 h-3" />}
            >
              Simulator
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#2A3544] text-[#75859A] font-mono tabular-nums text-[11px]">
                <th className="py-2 px-3">Rank</th>
                <th className="py-2 px-3">SKU ID</th>
                <th className="py-2 px-3">Category & Department</th>
                <th className="py-2 px-3 text-right">Target MSRP</th>
                <th className="py-2 px-3 text-right">Doors</th>
                <th className="py-2 px-3 text-right">P50 (Spread)</th>
                <th className="py-2 px-3 text-center">Confidence</th>
                <th className="py-2 px-3">Reason for Uncertainty</th>
                <th className="py-2 px-3">Recommended Mitigation</th>
                <th className="py-2 px-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A3544]/60 font-mono tabular-nums">
              {loading && (
                <tr>
                  <td colSpan={10} className="py-6 text-center text-xs text-[#75859A]">
                    Evaluating uncertainty dimensions...
                  </td>
                </tr>
              )}
              {topUncertain.map((sku) => {
                const isSelected = selectedSkuId === sku.sku_id;
                return (
                  <tr
                    key={sku.sku_id}
                    onClick={() => loadSkuDetail(sku.sku_id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#1D2734]' : 'hover:bg-[#1D2734]/50'
                    }`}
                  >
                    <td className="py-2 px-3 font-bold text-[#E5B454]">#{sku.rank}</td>
                    <td className="py-2 px-3 font-bold text-[#E7EDF5]">{sku.sku_id}</td>
                    <td className="py-2 px-3 text-[#E7EDF5]">
                      <div>{sku.category}</div>
                      <div className="text-[10px] text-[#75859A] font-sans">{sku.department}</div>
                    </td>
                    <td className="py-2 px-3 text-right text-[#9AA9BC]">${sku.target_msrp}</td>
                    <td className="py-2 px-3 text-right text-[#75859A]">{sku.target_doors}</td>
                    <td className="py-2 px-3 text-right text-[#E7EDF5]">
                      <span className="font-bold text-[#4DAEAB]">{sku.p50_forecast}</span>
                      <span className="text-[#E5B454] text-[10px] ml-1">(±{Math.round(sku.p10_p90_spread / 2)})</span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#3D2C1B] border border-[#E5B454] text-[#E5B454]">
                        {Math.round(sku.overall_confidence * 100)}%
                      </span>
                    </td>
                    <td className="py-2 px-3 text-[11px] text-[#9AA9BC] max-w-xs font-sans">
                      {sku.reason_for_uncertainty}
                    </td>
                    <td className="py-2 px-3 text-[11px] text-[#36B98A] max-w-xs font-sans">
                      {sku.recommended_mitigation}
                    </td>
                    <td className="py-2 px-3 text-right font-sans">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          loadSkuDetail(sku.sku_id);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] text-[#4DAEAB] hover:text-[#65C4BF] px-2 py-0.5 rounded bg-[#10151D] border border-[#2A3544]"
                      >
                        <span>Details</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected SKU Explainability Deep-Dive */}
      {detail && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Feature Attribution Drivers (6 cols) */}
          <div className="lg:col-span-6 p-4 rounded-lg bg-[#171F2A] border border-[#2A3544] space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-[#2A3544]">
              <h3 className="text-sm font-semibold text-[#E7EDF5]">Feature Drivers: {detail.sku_id}</h3>
              <span className="text-xs text-[#9AA9BC]">{detail.category} • {detail.brand_tier}</span>
            </div>

            <div className="space-y-2 mt-2">
              {detail.feature_attributions.map((attr, idx) => (
                <div key={idx} className="p-2.5 rounded bg-[#1D2734] border border-[#2A3544] text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-[#E7EDF5]">
                      {attr.feature}: <span className="font-mono text-[#4DAEAB]">{attr.value}</span>
                    </span>
                    <span className="font-mono tabular-nums text-[#4DAEAB] font-bold">
                      {attr.relative_impact_pct}% impact
                    </span>
                  </div>

                  <div className="h-1.5 w-full bg-[#10151D] rounded-full overflow-hidden mb-1.5">
                    <div
                      style={{ width: `${attr.relative_impact_pct}%` }}
                      className="h-full bg-[#4DAEAB] rounded-full"
                    />
                  </div>

                  <p className="text-[11px] text-[#9AA9BC] leading-tight font-sans">{attr.explanation}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Analog Support & Governance Note (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            <div className="p-4 rounded-lg bg-[#171F2A] border border-[#2A3544] space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-[#2A3544]">
                <h3 className="text-sm font-semibold text-[#E7EDF5]">Analog Precedents Support</h3>
                <span className="text-xs text-[#4DAEAB] font-mono">
                  Top: {detail.analog_support.top_analog_sku} ({Math.round(detail.analog_support.top_analog_similarity * 100)}%)
                </span>
              </div>

              <div className="space-y-1.5">
                {detail.analog_support.analog_summary.map((a, i) => (
                  <div
                    key={i}
                    className="p-2 rounded bg-[#1D2734] border border-[#2A3544] flex items-center justify-between text-xs font-mono"
                  >
                    <div>
                      <span className="font-bold text-[#E7EDF5]">{a.sku}</span>
                      <span className="text-[#75859A] ml-2 text-[11px]">({a.shape})</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[#9AA9BC]">8W: {a['8wk_units']}u</span>
                      <span className="text-[#4DAEAB] font-bold">{Math.round(a.similarity * 100)}% match</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-[#2A3544] text-xs">
                <div className="p-2 rounded bg-[#10151D] border border-[#2A3544]">
                  <div className="text-[10px] text-[#75859A]">Relative Spread (Spread / P50)</div>
                  <div className="text-sm font-bold font-mono tabular-nums text-[#E5B454]">
                    {(detail.uncertainty_drivers.relative_interval_width * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="p-2 rounded bg-[#10151D] border border-[#2A3544]">
                  <div className="text-[10px] text-[#75859A]">Model Agreement Rate</div>
                  <div className="text-sm font-bold font-mono tabular-nums text-[#4DAEAB]">
                    {Math.round(detail.uncertainty_drivers.model_agreement_pct * 100)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Governance & Causality Statement */}
            <div className="p-3.5 rounded-lg bg-[#171F2A] border border-[#2A3544] text-xs space-y-1.5">
              <div className="text-[#E7EDF5] font-semibold flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#4DAEAB]" />
                <span>Associative Analog Matching vs Causal Effects</span>
              </div>
              <p className="text-[#9AA9BC] text-[11px] leading-relaxed">
                {detail.governance_note ||
                  'Explanations reflect empirical attribute similarity and model sensitivities. Feature impact weights are statistical attributions, not causal claims. Price elasticity reflects observational category trends rather than randomized A/B price test causality.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
