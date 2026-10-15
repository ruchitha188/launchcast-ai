from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class HealthServiceStatus(BaseModel):
    api: str = "online"
    ml_engine: str = "ready"
    inventory_optimizer: str = "ready"
    database: str = "standby"

class HealthResponse(BaseModel):
    status: str = "healthy"
    project: str
    version: str
    timestamp: datetime
    services: HealthServiceStatus

class ProductCandidate(BaseModel):
    sku_id: str
    product_name: str
    department: str
    category: str
    sub_category: Optional[str] = None
    msrp: float = Field(gt=0, description="Manufacturer suggested retail price")
    brand_tier: str = Field(description="e.g. Luxury, Premium, Mass, Value")
    launch_week: int = Field(ge=1, le=52, description="Fiscal calendar launch week")
    target_store_count: int = Field(ge=1, default=100)

class ForecastWeek(BaseModel):
    week_number: int = Field(ge=1, le=8, description="Week 1 through Week 8 horizon")
    p10_units: float
    p50_units: float
    p90_units: float
    confidence_score: float

class ForecastHorizonSummary(BaseModel):
    sku_id: str
    horizon_weeks: int = 8
    weekly_forecasts: List[ForecastWeek]
    cumulative_p50: float
    status: str = "model_pending"

class SimulationRequest(BaseModel):
    department: str
    category: str
    target_msrp: float = Field(gt=0, description="Target retail price")
    launch_quarter: str
    brand_tier: str
    store_door_count: int = Field(default=150, ge=1)
    enable_live_elasticity: Optional[bool] = Field(default=True, description="Enable dynamic price elasticity benchmarking against real-time market catalog")

class SimulationResponse(BaseModel):
    simulation_id: str
    status: str = "completed"
    message: str
    input_received: SimulationRequest
    forecast: Dict[str, Any]
    baseline_forecast: Optional[Dict[str, Any]] = None
    market_benchmark: Optional[Dict[str, Any]] = None
    inventory_recommendation: Dict[str, Any]

class OptimizationRequest(BaseModel):
    sku_id: Optional[str] = "CUSTOM-SKU"
    unit_msrp: float = Field(gt=0, default=80.0)
    unit_cost: Optional[float] = Field(default=None, gt=0)
    salvage_value: Optional[float] = Field(default=None, ge=0)
    service_level_constraint: Optional[float] = Field(default=None, ge=0.01, le=0.99)
    p10_demand: Optional[float] = None
    p50_demand: Optional[float] = None
    p90_demand: Optional[float] = None

class AllocationRequest(BaseModel):
    sku_id: str = "CUSTOM-SKU"
    total_quantity: int = Field(ge=1, default=100)
    custom_weights: Optional[Dict[str, float]] = None

class InventoryRecommendation(BaseModel):
    sku_id: str
    target_service_level: Optional[float] = None
    critical_ratio: Optional[float] = None
    recommended_order_quantity: int
    safety_stock_units: int
    stockout_risk_p50: float
