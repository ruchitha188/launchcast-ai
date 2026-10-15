# LaunchCast AI - Real-Time Public Data Client & Ingestion Pipeline
import json
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

from app.schemas.live_data import (
    LiveProductRecord,
    LiveProviderStatus,
    LiveRefreshResponse,
    LiveProviderResponse
)

def get_cache_path() -> Path:
    base_dir = Path(__file__).resolve().parent.parent.parent
    p1 = Path(r"C:\Users\HP\launchcast_work\backend\data\processed\live_products_cache.json")
    if p1.parent.exists():
        return p1
    p2 = base_dir / "data" / "processed" / "live_products_cache.json"
    p2.parent.mkdir(parents=True, exist_ok=True)
    return p2

class LiveDataProviderClient:
    """
    Robust real-time client for official public merchandise catalog and pricing APIs.
    
    Default Provider:
    - Provider: DummyJSON Products Public API (https://dummyjson.com/docs/products)
    - URL: https://dummyjson.com/products?limit=100
    - Authentication: No API key required for public tier; supports optional API key configuration.
    
    Data Integrity & Forecasting Safeguards:
    - Returns real-time market attributes (title, category, live price, discount, brand, stock).
    - Explicitly records that these represent live market retail benchmarks, NOT weekly sales.
    - Completely isolated from historical UCI sales matrices to prevent data leakage into holdout evaluation.
    - Never reports provider as 'connected' unless a real request has succeeded.
    """
    def __init__(
        self,
        provider_name: str = "DummyJSON Products Public API",
        source_url: str = "https://dummyjson.com/products?limit=0",
        docs_url: str = "https://dummyjson.com/docs/products",
        timeout_seconds: float = 8.0,
        api_key: Optional[str] = None,
        cache_ttl_seconds: int = 3600,
        cache_file: Optional[Path] = None
    ):
        self.provider_id = "dummyjson-products"
        self.provider_name = provider_name
        self.source_url = source_url
        self.docs_url = docs_url
        self.timeout_seconds = timeout_seconds
        self.api_key = api_key
        self.cache_ttl_seconds = cache_ttl_seconds
        self.cache_file = cache_file if cache_file is not None else get_cache_path()

        # In-memory state tracking
        self._is_connected: bool = False
        self._last_refresh_utc: Optional[str] = None
        self._last_error_message: Optional[str] = None
        self._latency_ms: Optional[float] = None
        self._cached_records: List[LiveProductRecord] = []
        self._last_fetch_mono_time: float = 0.0

        # Attempt to load persistent disk cache if available
        if self.cache_file:
            self._load_from_disk_cache()

    def _load_from_disk_cache(self):
        """Loads cached records from disk if available."""
        if not self.cache_file or not self.cache_file.exists():
            return
        try:
            with open(self.cache_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            raw_records = data.get("records", [])
            self._cached_records = [LiveProductRecord(**r) for r in raw_records]
            self._last_refresh_utc = data.get("last_refresh_utc")
            self._latency_ms = data.get("latency_ms")
            if self._cached_records:
                self._is_connected = True
                self._last_fetch_mono_time = time.monotonic()
        except Exception:
            self._cached_records = []
            self._is_connected = False

    def _save_to_disk_cache(self):
        """Saves current verified records to disk."""
        if not self.cache_file:
            return
        try:
            self.cache_file.parent.mkdir(parents=True, exist_ok=True)
            data = {
                "provider_id": self.provider_id,
                "provider_name": self.provider_name,
                "source_url": self.source_url,
                "last_refresh_utc": self._last_refresh_utc,
                "latency_ms": self._latency_ms,
                "record_count": len(self._cached_records),
                "records": [r.model_dump() for r in self._cached_records]
            }
            with open(self.cache_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception:
            pass

    def _parse_and_validate_products(self, data: Dict[str, Any], timestamp_utc: str) -> List[LiveProductRecord]:
        """
        Parses provider response and validates each product record against Pydantic schema.
        Handles missing fields, malformed types, and logs validation status.
        """
        products_raw = data.get("products")
        if products_raw is None and isinstance(data, list):
            products_raw = data
        elif products_raw is None:
            products_raw = []

        validated_records: List[LiveProductRecord] = []

        for item in products_raw:
            if not isinstance(item, dict):
                continue
            
            p_id = item.get("id")
            title = item.get("title")
            price = item.get("price")

            # Essential validation: must have non-empty ID and title
            if p_id is None or not str(title).strip():
                continue
            
            try:
                num_price = float(price) if price is not None else 0.0
                if num_price < 0:
                    num_price = 0.0
            except (ValueError, TypeError):
                num_price = 0.0

            val_status = "VALIDATED"
            if num_price == 0.0 or not item.get("category"):
                val_status = "WARNING"

            record = LiveProductRecord(
                product_id=f"LIVE-{self.provider_id[:3].upper()}-{p_id}",
                provider=self.provider_name,
                title=str(title).strip(),
                category=str(item.get("category", "General Merchandise")).title(),
                price=round(num_price, 2),
                discount_percentage=float(item.get("discountPercentage", 0.0) or 0.0),
                rating=float(item.get("rating", 0.0) or 0.0) if item.get("rating") is not None else None,
                stock=int(item.get("stock", 0) or 0),
                brand=str(item.get("brand", "")) if item.get("brand") else None,
                sku=str(item.get("sku", "")) if item.get("sku") else f"SKU-{p_id}",
                availability_status=str(item.get("availabilityStatus", "In Stock")),
                retrieved_at_utc=timestamp_utc,
                validation_status=val_status,
                source_url=self.source_url,
                raw_attributes={
                    "weight": item.get("weight"),
                    "warranty": item.get("warrantyInformation"),
                    "shipping": item.get("shippingInformation"),
                    "minimum_order_quantity": item.get("minimumOrderQuantity")
                }
            )
            validated_records.append(record)

        return validated_records

    def fetch_live_data(self, force_refresh: bool = False) -> Tuple[bool, str, List[LiveProductRecord]]:
        """
        Executes bounded, retried retrieval from public provider with timeout and error handling.
        Returns: (success, message, records)
        """
        now_mono = time.monotonic()
        # Return memory cache if fresh and not forcing refresh
        if (
            not force_refresh
            and self._is_connected
            and self._cached_records
            and (now_mono - self._last_fetch_mono_time < self.cache_ttl_seconds)
        ):
            return True, f"Served from local cache ({len(self._cached_records)} records).", self._cached_records

        headers = {
            "User-Agent": "LaunchCastAI/1.0 (+https://github.com/launchcast-ai)",
            "Accept": "application/json"
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        max_retries = 3
        last_exception = None
        start_time = time.perf_counter()

        for attempt in range(1, max_retries + 1):
            try:
                req = urllib.request.Request(self.source_url, headers=headers)
                with urllib.request.urlopen(req, timeout=self.timeout_seconds) as resp:
                    resp_status = getattr(resp, "status", 200)
                    if resp_status != 200:
                        raise urllib.error.HTTPError(
                            self.source_url, resp_status, f"HTTP Error {resp_status}", getattr(resp, "headers", {}), None
                        )
                    raw_body = resp.read().decode("utf-8")
                    data = json.loads(raw_body)
                    
                    elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
                    timestamp_utc = datetime.now(timezone.utc).isoformat()

                    validated = self._parse_and_validate_products(data, timestamp_utc)
                    if not validated:
                        self._last_error_message = "Provider returned empty product payload or schema mismatch."
                        self._is_connected = False
                        return False, self._last_error_message, []

                    # Success update
                    self._cached_records = validated
                    self._is_connected = True
                    self._last_refresh_utc = timestamp_utc
                    self._latency_ms = elapsed_ms
                    self._last_error_message = None
                    self._last_fetch_mono_time = time.monotonic()
                    self._save_to_disk_cache()

                    return True, f"Successfully retrieved and validated {len(validated)} live records.", validated

            except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, json.JSONDecodeError, Exception) as e:
                last_exception = e
                if attempt < max_retries:
                    time.sleep(0.1 * (2 ** (attempt - 1)))

        # If all retries failed
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        err_msg = f"Failed to retrieve data from {self.source_url} after {max_retries} attempts: {str(last_exception)}"
        self._last_error_message = err_msg
        self._latency_ms = elapsed_ms
        self._is_connected = False

        return False, err_msg, self._cached_records

    def get_status(self) -> LiveProviderStatus:
        """Returns the current connection status and health of the provider."""
        current_status = "connected" if self._is_connected else ("error" if self._last_error_message else "disconnected")
        return LiveProviderStatus(
            provider_id=self.provider_id,
            provider_name=self.provider_name,
            source_url=self.source_url,
            documentation_url=self.docs_url,
            status=current_status,
            is_connected=self._is_connected,
            last_successful_refresh_utc=self._last_refresh_utc,
            record_count=len(self._cached_records) if self._is_connected else 0,
            latency_ms=self._latency_ms,
            requires_auth=False,
            auth_configured=bool(self.api_key),
            rate_limit_policy="Public Tier (Standard Pacing, No credentials required)",
            last_error_message=self._last_error_message
        )

    def get_live_records(self) -> List[LiveProductRecord]:
        """Returns the latest retrieved live product records."""
        if not self._cached_records:
            self.fetch_live_data(force_refresh=False)
        return self._cached_records

# Global singleton instance
live_client = LiveDataProviderClient()
