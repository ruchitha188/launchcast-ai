export type PageId = 
  | 'wizard'
  | 'demand_planning'
  | 'inventory_fulfillment'
  | 'data_products'
  | 'evaluation'
  | 'overview'
  // Compatible legacy aliases
  | 'forecasts'
  | 'simulator'
  | 'explorer'
  | 'inventory'
  | 'allocation'
  | 'explainability'
  | 'datasources';

export interface NavItemConfig {
  id: PageId;
  label: string;
  iconName: string;
  group: 'Core' | 'Demand Intelligence' | 'Operational Execution' | 'Governance & Data';
  badge?: string;
  description: string;
}

export interface SystemHealth {
  status: 'online' | 'standby' | 'error';
  version: string;
  timestamp?: string;
  services?: {
    api: string;
    ml_engine: string;
    inventory_optimizer: string;
  };
}

export interface MetricCardData {
  title: string;
  value: string;
  change?: string;
  changePositive?: boolean;
  subtitle: string;
  accent?: 'cyan' | 'violet' | 'slate';
}

export interface ForecastWeekItem {
  week_number: number;
  week_label: string;
  p10_units: number;
  p50_units: number;
  p90_units: number;
  uncertainty_spread: number;
  confidence_score: number;
}

export interface ForecastSummaryItem {
  sku_id: string;
  department: string;
  category: string;
  target_msrp: number;
  brand_tier: string;
  target_store_count: number;
  cumulative_p10: number;
  cumulative_p50: number;
  cumulative_p90: number;
  uncertainty_spread: number;
  overall_confidence: number;
  top_analog_sku: string;
}

export interface AnalogPrecedent {
  analog_sku: string;
  similarity_score: number;
  volume_tier: string;
  shape_profile: string;
  launch_8wk_actuals: number[];
  total_launch_units: number;
  annual_total_units: number;
}

export interface BenchmarkProduct {
  title: string;
  price: number;
  brand: string;
  sku: string;
}

export interface MarketBenchmark {
  enabled: boolean;
  provider_name: string;
  benchmark_category: string;
  sample_size: number;
  market_median_price: number;
  market_mean_price: number;
  market_min_price: number;
  market_max_price: number;
  candidate_msrp: number;
  price_ratio: number;
  price_positioning: string;
  elasticity_coefficient: number;
  demand_multiplier: number;
  demand_shift_percentage: number;
  baseline_p50_units: number;
  adjusted_p50_units: number;
  delta_units: number;
  sample_benchmark_products: BenchmarkProduct[];
  economic_rationale: string;
  causality_disclaimer: string;
}

export interface SkuForecastDetails {
  sku_id: string;
  department: string;
  category: string;
  target_msrp: number;
  brand_tier: string;
  target_store_count: number;
  horizon_weeks: number;
  weekly_forecasts: ForecastWeekItem[];
  cumulative_demand: {
    p10_lower_bound: number;
    p50_point_forecast: number;
    p90_upper_bound: number;
    total_uncertainty_spread: number;
  };
  confidence_metrics: {
    overall_confidence: number;
    model_agreement_pct: number;
    top_analog_similarity: number;
  };
  baseline_comparisons?: {
    analog_knn_p50: number;
    category_prior_p50: number;
    bass_diffusion_p50: number;
    bass_weekly_curve: number[];
  };
  analog_precedents: AnalogPrecedent[];
  market_benchmark?: MarketBenchmark;
  baseline_forecast?: SkuForecastDetails;
  inventory_recommendation?: InventoryRecommendationItem;
  methodology: string;
  limitations: string[];
}

export interface InventoryRecommendationItem {
  sku_id: string;
  product_name?: string;
  department: string;
  category: string;
  brand_tier: string;
  cost_parameters: {
    unit_msrp: number;
    unit_cost: number;
    salvage_value: number;
    understocking_cost_cu: number;
    overstocking_cost_co: number;
    critical_ratio: number;
  };
  recommendation: {
    recommended_order_quantity: number;
    safety_stock_units: number;
    p50_median_demand: number;
    service_level_achieved_pct: number;
  };
  risk_analysis: {
    expected_sales_units: number;
    expected_unmet_demand_units: number;
    expected_leftover_units: number;
    stockout_probability_pct: number;
    markdown_risk_pct: number;
  };
  financial_projection: {
    total_order_cost: number;
    expected_net_profit: number;
    expected_profit_margin_pct: number;
  };
  decision_rule_explanation: string;
}

export interface TopUncertainSkuItem {
  rank: number;
  sku_id: string;
  product_name: string;
  department: string;
  category: string;
  target_msrp: number;
  target_doors: number;
  p50_forecast: number;
  p10_p90_spread: number;
  overall_confidence: number;
  uncertainty_score: number;
  top_analog_similarity: number;
  model_agreement_pct: number;
  reason_for_uncertainty: string;
  recommended_mitigation: string;
}

export interface ClusterAllocationItem {
  cluster_id: string;
  cluster_name: string;
  store_count: number;
  weight_pct: number;
  allocated_units: number;
  units_per_store: number;
  allocation_share_pct: number;
}

export interface StoreAllocationData {
  sku_id: string;
  total_order_quantity: number;
  reconciled_total_quantity: number;
  reconciliation_status: string;
  clusters_count: number;
  cluster_allocations: ClusterAllocationItem[];
}

export interface EvaluationMetricsData {
  evaluation_protocol: string;
  train_pool_size?: number;
  validation_pool_size?: number;
  total_evaluated_points?: number;
  splits?: {
    train_pool_size: number;
    calibration_pool_size: number;
    untouched_test_holdout_size: number;
    total_evaluated_points: number;
  };
  metrics: {
    wape: number;
    wape_percentage: string;
    weighted_mape: number;
    weighted_mape_percentage: string;
    naive_category_wape: number;
    wape_improvement_over_naive: string;
    prediction_interval_coverage_p10_p90?: number;
    coverage_percentage: string;
    nominal_target_coverage: string;
    mean_prediction_interval_width?: number;
    uncalibrated_coverage_p10_p90?: number;
    uncalibrated_coverage_percentage?: string;
    calibrated_coverage_p10_p90?: number;
    calibrated_coverage_percentage?: string;
    conformal_expansion_q_hat?: number;
    uncalibrated_mean_interval_width?: number;
    calibrated_mean_interval_width?: number;
  };
  calibration_diagnostics: {
    pinball_loss_p10?: number;
    pinball_loss_p50: number;
    pinball_loss_p90?: number;
    pinball_loss_p10_uncalibrated?: number;
    pinball_loss_p90_uncalibrated?: number;
    pinball_loss_p10_calibrated?: number;
    pinball_loss_p90_calibrated?: number;
    quantile_calibration_status?: string;
    calibration_status?: string;
    root_cause_explanation?: string;
  };
  distinction_note: string;
}

export interface FeatureAttributionItem {
  feature: string;
  value: string;
  relative_impact_pct: number;
  direction: string;
  explanation: string;
}

export interface ExplainabilityDetails {
  sku_id: string;
  department: string;
  category: string;
  target_msrp: number;
  brand_tier: string;
  cumulative_forecast: {
    p10_lower_bound: number;
    p50_point_forecast: number;
    p90_upper_bound: number;
    total_uncertainty_spread: number;
  };
  confidence_score: number;
  uncertainty_score: number;
  feature_attributions: FeatureAttributionItem[];
  analog_support: {
    top_analog_sku: string;
    top_analog_similarity: number;
    precedents_count: number;
    analog_summary: {
      sku: string;
      similarity: number;
      shape: string;
      '8wk_units': number;
    }[];
  };
  uncertainty_drivers: {
    relative_interval_width: number;
    model_agreement_pct: number;
    extrapolation_risk: string;
  };
  governance_note: string;
}

export interface DatasetSummaryData {
  file_info: {
    filename: string;
    filepath: string;
    size_bytes: number;
    size_kb: number;
    size_mb?: number;
    format: string;
    encoding: string;
  };
  dataset_statistics?: {
    total_products: number;
    total_observations: number;
  };
  dimensions: {
    total_rows: number;
    total_columns: number;
    total_cells: number;
    unique_products: number;
    duplicate_products: number;
  };
  column_taxonomy: {
    product_id_column: string;
    weekly_sales_columns_count: number;
    weekly_sales_columns_range: string;
    summary_columns: string[];
    normalized_columns_count: number;
    normalized_columns_range: string;
  };
  missing_data: {
    total_null_cells: number;
    null_percentage: number;
  };
  weekly_sales_statistics: {
    total_observations: number;
    total_units_sold: number;
    min_units_per_week: number;
    max_units_per_week: number;
    mean_units_per_week: number;
    median_units_per_week: number;
    stdev_units_per_week: number;
    percentiles: {
      p10: number;
      p25: number;
      p50: number;
      p75: number;
      p90: number;
    };
    zero_sales_weeks: number;
    zero_sales_percentage: number;
  };
  product_annual_volume_statistics: {
    min_annual_units: number;
    max_annual_units: number;
    mean_annual_units: number;
    median_annual_units: number;
  };
  verified_dataset_assumptions: {
    contains_launch_dates: boolean;
    contains_product_attributes: boolean;
    recorded_history_weeks: number;
    recorded_history_years: number;
    contains_three_years_history: boolean;
  };
  transformation_plan: {
    source_shape: string;
    target_shape: string;
    sample_unpivoted_rows: any[];
  };
}

export interface DataSourceItem {
  source_id: string;
  name: string;
  data_type: string;
  record_count: number;
  status: string;
  required_fields: string[];
  notes?: string;
}


export interface LiveProductRecord {
  product_id: string;
  provider: string;
  title: string;
  category: string;
  price: number;
  discount_percentage?: number;
  rating?: number;
  stock?: number;
  brand?: string;
  sku?: string;
  availability_status?: string;
  retrieved_at_utc: string;
  validation_status: string;
  source_url: string;
  raw_attributes?: Record<string, any>;
}

export interface LiveProviderStatus {
  provider_id: string;
  provider_name: string;
  source_url: string;
  documentation_url: string;
  status: string;
  is_connected: boolean;
  last_successful_refresh_utc?: string;
  record_count: number;
  latency_ms?: number;
  requires_auth: boolean;
  auth_configured: boolean;
  rate_limit_policy: string;
  last_error_message?: string;
  notes: string;
}

export interface LiveRefreshResponse {
  status: string;
  message: string;
  provider: string;
  retrieved_count: number;
  timestamp_utc: string;
  latency_ms: number;
  records_sample: LiveProductRecord[];
}

export interface LiveProviderResponse {
  provider_status: LiveProviderStatus;
  records: LiveProductRecord[];
  total_count: number;
  data_freshness: string;
  forecasting_integrity_notice: string;
}
