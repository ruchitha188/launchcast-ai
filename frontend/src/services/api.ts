import {
  SystemHealth,
  ForecastSummaryItem,
  SkuForecastDetails,
  InventoryRecommendationItem,
  TopUncertainSkuItem,
  EvaluationMetricsData,
  StoreAllocationData,
  ExplainabilityDetails,
  DatasetSummaryData,
  LiveProviderResponse,
  LiveRefreshResponse
} from '../types';

const API_BASE = ((import.meta as any).env?.VITE_API_URL as string) || 'http://127.0.0.1:8000/api/v1';

export const api = {
  async getHealth(): Promise<SystemHealth> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
    return await res.json();
  },

  async getForecastsSummary(): Promise<{ total_skus: number; total_p50_demand: number; items: ForecastSummaryItem[] }> {
    const res = await fetch(`${API_BASE}/forecasts/summary`);
    if (!res.ok) throw new Error(`Failed to fetch forecasts summary: ${res.status}`);
    const data = await res.json();
    return {
      total_skus: data.total_skus ?? data.total_count ?? 150,
      total_p50_demand: data.total_p50_demand ?? 8820,
      items: data.items || data.forecasts || []
    };
  },

  async getForecasts(limit = 150, category?: string): Promise<{ total_count: number; items: ForecastSummaryItem[] }> {
    const params = new URLSearchParams();
    if (limit) params.set('limit', limit.toString());
    if (category && category !== 'ALL') params.set('category', category);
    const res = await fetch(`${API_BASE}/forecasts/?${params.toString()}`);
    if (!res.ok) throw new Error(`Failed to fetch forecasts: ${res.status}`);
    const data = await res.json();
    return {
      total_count: data.total_count ?? 150,
      items: data.items || data.forecasts || []
    };
  },

  async getForecast(skuId: string): Promise<SkuForecastDetails> {
    const res = await fetch(`${API_BASE}/forecasts/${encodeURIComponent(skuId)}`);
    if (!res.ok) throw new Error(`Failed to fetch forecast for ${skuId}: ${res.status}`);
    return await res.json();
  },

  async simulateNewProduct(candidate: {
    department: string;
    category: string;
    target_msrp: number;
    brand_tier: string;
    launch_quarter: string;
    target_store_count: number;
    enable_live_elasticity?: boolean;
  }): Promise<SkuForecastDetails> {
    const res = await fetch(`${API_BASE}/simulator/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...candidate,
        enable_live_elasticity: candidate.enable_live_elasticity !== undefined ? candidate.enable_live_elasticity : true
      })
    });
    if (!res.ok) throw new Error(`Simulation failed: ${res.status}`);
    const data = await res.json();
    const forecast = data.forecast || data;
    if (data.market_benchmark) {
      forecast.market_benchmark = data.market_benchmark;
    }
    if (data.baseline_forecast) {
      forecast.baseline_forecast = data.baseline_forecast;
    }
    if (data.inventory_recommendation) {
      forecast.inventory_recommendation = data.inventory_recommendation;
    }
    return forecast;
  },

  async getInventoryRecommendations(
    serviceLevelConstraint?: number,
    understockCost = 25.0,
    overstockCost = 15.0
  ): Promise<{ total_skus: number; recommendations: InventoryRecommendationItem[] }> {
    const params = new URLSearchParams({
      understock_cost: understockCost.toString(),
      overstock_cost: overstockCost.toString()
    });
    if (serviceLevelConstraint !== undefined && serviceLevelConstraint !== null) {
      params.append('service_level_constraint', serviceLevelConstraint.toString());
    }
    const res = await fetch(`${API_BASE}/inventory/recommendations?${params.toString()}`);
    if (!res.ok) throw new Error(`Failed to fetch inventory recommendations: ${res.status}`);
    return await res.json();
  },

  async getInventoryForSku(
    skuId: string,
    serviceLevelConstraint?: number,
    understockCost = 25.0,
    overstockCost = 15.0
  ): Promise<InventoryRecommendationItem> {
    const params = new URLSearchParams({
      understock_cost: understockCost.toString(),
      overstock_cost: overstockCost.toString()
    });
    if (serviceLevelConstraint !== undefined && serviceLevelConstraint !== null) {
      params.append('service_level_constraint', serviceLevelConstraint.toString());
    }
    const res = await fetch(`${API_BASE}/inventory/recommendations/${encodeURIComponent(skuId)}?${params.toString()}`);
    if (!res.ok) throw new Error(`Failed to fetch recommendation for ${skuId}: ${res.status}`);
    return await res.json();
  },

  async getEvaluationMetrics(): Promise<EvaluationMetricsData> {
    const res = await fetch(`${API_BASE}/evaluation/metrics`);
    if (!res.ok) throw new Error(`Failed to fetch evaluation metrics: ${res.status}`);
    return await res.json();
  },

  async getCalibration(): Promise<any> {
    const res = await fetch(`${API_BASE}/evaluation/calibration`);
    if (!res.ok) throw new Error(`Failed to fetch calibration: ${res.status}`);
    return await res.json();
  },

  async getTop10UncertainSkus(): Promise<{
    count: number;
    criteria: string;
    top_10_uncertain_skus: TopUncertainSkuItem[];
  }> {
    const res = await fetch(`${API_BASE}/explainability/uncertain/top10`);
    if (!res.ok) throw new Error(`Failed to fetch uncertain SKUs: ${res.status}`);
    const data = await res.json();
    return {
      count: data.count ?? (data.top_10_uncertain_skus || data.top_uncertain_skus || []).length,
      criteria: data.criteria ?? 'composite_uncertainty',
      top_10_uncertain_skus: data.top_10_uncertain_skus || data.top_uncertain_skus || []
    };
  },

  async getExplainabilityForSku(skuId: string): Promise<ExplainabilityDetails> {
    const res = await fetch(`${API_BASE}/explainability/${encodeURIComponent(skuId)}`);
    if (!res.ok) throw new Error(`Failed to fetch explainability for ${skuId}: ${res.status}`);
    return await res.json();
  },

  async getAllocationForSku(skuId: string, totalUnits = 350): Promise<StoreAllocationData> {
    const params = new URLSearchParams({ total_units: totalUnits.toString() });
    const res = await fetch(`${API_BASE}/allocation/${encodeURIComponent(skuId)}?${params.toString()}`);
    if (!res.ok) throw new Error(`Failed to fetch allocation for ${skuId}: ${res.status}`);
    return await res.json();
  },

  async getAllocationAll(totalUnits = 350): Promise<any> {
    const params = new URLSearchParams({ total_units: totalUnits.toString() });
    const res = await fetch(`${API_BASE}/allocation/all?${params.toString()}`);
    if (!res.ok) throw new Error(`Failed to fetch all allocations: ${res.status}`);
    return await res.json();
  },

  async getDataSummary(): Promise<DatasetSummaryData> {
    const res = await fetch(`${API_BASE}/data/summary`);
    if (!res.ok) throw new Error(`Failed to fetch data summary: ${res.status}`);
    return await res.json();
  },


  async getLiveData(): Promise<LiveProviderResponse> {
    const res = await fetch(`${API_BASE}/data/live`);
    if (!res.ok) throw new Error(`Failed to fetch live data: ${res.status}`);
    return await res.json();
  },

  async refreshLiveData(): Promise<LiveRefreshResponse> {
    const res = await fetch(`${API_BASE}/data/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Refresh failed with status ${res.status}`);
    }
    return await res.json();
  },

  async getDataSources(): Promise<{ sources: any[] }> {
    const res = await fetch(`${API_BASE}/data/sources`);
    if (!res.ok) throw new Error(`Failed to fetch data sources: ${res.status}`);
    const data = await res.json();
    return { sources: Array.isArray(data) ? data : data.sources || [] };
  },

  getForecastsExportUrl(): string {
    return `${API_BASE}/export/forecasts.csv`;
  },

  getInventoryExportUrl(serviceLevelConstraint?: number, understockCost = 25.0, overstockCost = 15.0): string {
    const params = new URLSearchParams({
      understock_cost: understockCost.toString(),
      overstock_cost: overstockCost.toString()
    });
    if (serviceLevelConstraint !== undefined && serviceLevelConstraint !== null) {
      params.append('service_level', serviceLevelConstraint.toString());
    }
    return `${API_BASE}/export/purchase_orders.csv?${params.toString()}`;
  },

  getUncertainExportUrl(): string {
    return `${API_BASE}/export/top10_uncertain_skus.csv`;
  },

  async connectExternalDataset(url: string, datasetName?: string): Promise<{
    status: string;
    message: string;
    url: string;
    dataset_name: string;
    format_detected: string;
    record_count: number;
    columns_or_keys: string[];
    sample_preview: any[];
  }> {
    const res = await fetch(`${API_BASE}/data/connect-external`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, dataset_name: datasetName })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to connect external dataset: ${res.status}`);
    }
    return await res.json();
  },
};

export const fetchHealth = api.getHealth;
