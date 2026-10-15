from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class LiveProductRecord(BaseModel):
    product_id: str = Field(description="Unique product identifier (e.g. DUMMYJSON-1 or SKU)")
    provider: str = Field(default="DummyJSON Products API", description="Data provider name")
    title: str = Field(description="Merchandise product title")
    category: str = Field(description="Retail merchandise category")
    price: float = Field(ge=0.0, description="Current live retail price in USD")
    discount_percentage: Optional[float] = Field(default=0.0, description="Active promotional discount percent")
    rating: Optional[float] = Field(default=None, description="Customer review rating score (1-5)")
    stock: Optional[int] = Field(default=0, ge=0, description="Current warehouse / door stock level")
    brand: Optional[str] = Field(default=None, description="Manufacturer or brand tier")
    sku: Optional[str] = Field(default=None, description="Catalog SKU code")
    availability_status: Optional[str] = Field(default="In Stock", description="Stock availability status")
    retrieved_at_utc: str = Field(description="ISO-8601 UTC timestamp of data retrieval")
    validation_status: str = Field(default="VALIDATED", description="Data validation status: VALIDATED, WARNING, INVALID")
    source_url: str = Field(description="Source API URL where record was fetched")
    raw_attributes: Dict[str, Any] = Field(default_factory=dict, description="Original unmapped attributes returned by provider")

class LiveProviderStatus(BaseModel):
    provider_id: str = "dummyjson-products"
    provider_name: str = "DummyJSON Products Public API"
    source_url: str = "https://dummyjson.com/products?limit=100"
    documentation_url: str = "https://dummyjson.com/docs/products"
    status: str = "disconnected"  # connected | error | disconnected | refreshing
    is_connected: bool = False
    last_successful_refresh_utc: Optional[str] = None
    record_count: int = 0
    latency_ms: Optional[float] = None
    requires_auth: bool = False
    auth_configured: bool = False
    rate_limit_policy: str = "Public Tier (No API key required; standard request pacing)"
    last_error_message: Optional[str] = None
    notes: str = (
        "Official public catalog API delivering real merchandise pricing, brand metadata, and inventory availability. "
        "Provides live market price benchmarks without overwriting historical UCI sales curves."
    )

class LiveRefreshResponse(BaseModel):
    status: str
    message: str
    provider: str
    retrieved_count: int
    timestamp_utc: str
    latency_ms: float
    records_sample: List[LiveProductRecord] = Field(default_factory=list)

class LiveProviderResponse(BaseModel):
    provider_status: LiveProviderStatus
    records: List[LiveProductRecord]
    total_count: int
    data_freshness: str
    forecasting_integrity_notice: str = (
        "PROTECTED BASELINE: Live market attributes provide real-time price-band and catalog benchmarks. "
        "They do NOT represent historical sales transactions and are strictly prevented from contaminating "
        "the 8-week holdout evaluation or leaking into past trajectory baselines."
    )

class ConnectExternalDatasetRequest(BaseModel):
    url: str = Field(description="Direct URL to external CSV or JSON dataset or API endpoint")
    dataset_name: Optional[str] = Field(default="External Real Dataset", description="User-friendly dataset name")

class ConnectExternalDatasetResponse(BaseModel):
    status: str
    message: str
    url: str
    dataset_name: str
    format_detected: str  # 'csv' | 'json'
    record_count: int
    columns_or_keys: List[str]
    sample_preview: List[Dict[str, Any]]
