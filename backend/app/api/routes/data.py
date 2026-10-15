import json
import csv
import io
import urllib.request
import urllib.error
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, HTTPException
from app.data_processing.inspect_dataset import inspect_dataset
from app.data_processing.live_client import live_client
from app.schemas.live_data import (
    LiveProviderResponse,
    LiveRefreshResponse,
    LiveProviderStatus,
    ConnectExternalDatasetRequest,
    ConnectExternalDatasetResponse
)

router = APIRouter(prefix="/data", tags=["Data Sources"])

# In-memory registry for user-connected external datasets
CONNECTED_EXTERNAL_DATASETS: List[Dict[str, Any]] = []

@router.get("/summary")
def get_dataset_summary() -> Dict[str, Any]:
    """
    Returns the ground truth audit of the UCI Sales Transactions Weekly dataset.
    """
    return inspect_dataset()

@router.get("/sources", response_model=List[Dict[str, Any]])
def get_data_sources():
    """
    Returns live ingestion status for LaunchCast AI retail data streams,
    real-time provider, and any connected external user datasets.
    """
    live_status = live_client.get_status()
    
    live_source_status = "live_connected" if live_status.is_connected else ("error" if live_status.last_error_message else "disconnected")
    live_notes = (
        f"Official public merchandise catalog & pricing stream. "
        f"Status: {live_status.status.upper()}. "
        f"Records: {live_status.record_count}. "
        f"Last refresh: {live_status.last_successful_refresh_utc or 'Never'}. "
        f"Provides live MSRP and retail attributes; completely isolated from historical UCI sales matrices."
    )

    sources = [
        {
            "source_id": "dummyjson-live-catalog",
            "name": f"Live Market Catalog & Pricing ({live_status.provider_name})",
            "data_type": "Real-Time Public Merchandise Stream (MSRP, Discounts, Stock, Brands)",
            "record_count": live_status.record_count,
            "status": live_source_status,
            "is_live_provider": True,
            "last_successful_refresh_utc": live_status.last_successful_refresh_utc,
            "latency_ms": live_status.latency_ms,
            "required_fields": ["id", "title", "category", "price", "discountPercentage", "brand", "sku", "stock"],
            "notes": live_notes,
            "source_url": live_status.source_url,
            "documentation_url": live_status.documentation_url
        },
        {
            "source_id": "uci-weekly-transactions",
            "name": "UCI Weekly Sales Transactions (Real Historical Data)",
            "data_type": "52-Week Store POS Trajectories (W0 to W51)",
            "record_count": 42172,
            "status": "ingested_active",
            "is_live_provider": False,
            "last_successful_refresh_utc": "Static Dataset Baseline",
            "required_fields": ["Product_Code", "W0..W51", "MIN", "MAX", "Normalized 0..51"],
            "notes": "811 unique products monitored over 52 calendar weeks. 68.4% active at W0; serves as an 8-week early observation window proxy rather than verified launch curves."
        },
        {
            "source_id": "catalog-meta",
            "name": "Product Catalog & Attribute Metadata (150 Cold-Start SKUs)",
            "data_type": "150 Candidate New SKU Specifications",
            "record_count": 150,
            "status": "active_candidates",
            "is_live_provider": False,
            "last_successful_refresh_utc": "Synthetic Demonstration Specification",
            "required_fields": ["sku_id", "department", "category", "target_msrp", "brand_tier", "launch_quarter"],
            "notes": "Synthetic demonstration specifications for the cold-start challenge. Explicitly distinct from hackathon organizers' hidden test set."
        },
        {
            "source_id": "store-doors",
            "name": "Store Master & Door Cluster Hierarchy",
            "data_type": "Retail Store Locations & Volume Tiers",
            "record_count": 120,
            "status": "active_clusters",
            "is_live_provider": False,
            "last_successful_refresh_utc": "Static Hierarchy",
            "required_fields": ["cluster_id", "cluster_name", "store_count", "weight"],
            "notes": "Tier 1 Flagship (40%), Tier 2 Metro Core (38%), and Tier 3 Regional (22%) cluster doors."
        },
        {
            "source_id": "marketing-calendar",
            "name": "Launch Promotional Calendar",
            "data_type": "Seasonal Quarters (Q1..Q4) & Promotional Flags",
            "record_count": 4,
            "status": "integrated",
            "is_live_provider": False,
            "last_successful_refresh_utc": "Static Calendar Priors",
            "required_fields": ["quarter", "promotional_launch_flag", "channel"],
            "notes": "Seasonal quarter priors (Q1-Q4) integrated into cold-start simulation."
        }
    ]

    # Add any user-connected external datasets
    for ext in CONNECTED_EXTERNAL_DATASETS:
        sources.insert(1, {
            "source_id": f"external-{len(sources)}",
            "name": f"User Connected: {ext['dataset_name']}",
            "data_type": f"External {ext['format_detected'].upper()} Stream ({ext['record_count']} items)",
            "record_count": ext["record_count"],
            "status": "live_connected",
            "is_live_provider": True,
            "last_successful_refresh_utc": ext.get("connected_at_utc", "Active"),
            "required_fields": ext["columns_or_keys"][:6],
            "notes": f"Connected via URL: {ext['url']}. Extracted {len(ext['columns_or_keys'])} fields.",
            "source_url": ext["url"]
        })

    return sources

@router.get("/live", response_model=LiveProviderResponse)
def get_live_data():
    """
    Returns latest retrieved live records, provider connection status, and freshness metadata.
    """
    status = live_client.get_status()
    records = live_client.get_live_records()
    
    freshness = "Never refreshed"
    if status.last_successful_refresh_utc:
        freshness = f"Updated {status.last_successful_refresh_utc} ({status.latency_ms}ms latency)"

    return LiveProviderResponse(
        provider_status=status,
        records=records,
        total_count=len(records),
        data_freshness=freshness
    )

@router.post("/refresh", response_model=LiveRefreshResponse)
def refresh_live_data():
    """
    Executes a controlled live data refresh from the configured public API provider.
    Updates cache and returns refresh summary with validation metrics.
    """
    success, message, records = live_client.fetch_live_data(force_refresh=True)
    status = live_client.get_status()
    
    if not success and not records:
        raise HTTPException(status_code=502, detail=message)

    return LiveRefreshResponse(
        status="success" if success else "warning",
        message=message,
        provider=status.provider_name,
        retrieved_count=len(records),
        timestamp_utc=status.last_successful_refresh_utc or datetime.now(timezone.utc).isoformat(),
        latency_ms=status.latency_ms or 0.0,
        records_sample=records[:5]
    )

@router.post("/connect-external", response_model=ConnectExternalDatasetResponse)
def connect_external_dataset(req: ConnectExternalDatasetRequest):
    """
    Connects, fetches, and inspects an external real dataset link (CSV or REST API JSON).
    """
    url = req.url.strip()
    if not url.startswith("http://") and not url.startswith("https://"):
        raise HTTPException(status_code=400, detail="URL must begin with http:// or https://")

    try:
        req_obj = urllib.request.Request(
            url,
            headers={"User-Agent": "LaunchCast-AI-Connector/1.0"}
        )
        with urllib.request.urlopen(req_obj, timeout=10.0) as resp:
            content_type = resp.headers.get("Content-Type", "").lower()
            raw_bytes = resp.read(500000)
            text_data = raw_bytes.decode("utf-8", errors="replace")

        # JSON Detection
        if "json" in content_type or text_data.strip().startswith("{") or text_data.strip().startswith("["):
            try:
                parsed_json = json.loads(text_data)
                format_detected = "json"
                if isinstance(parsed_json, dict):
                    array_key = next((k for k, v in parsed_json.items() if isinstance(v, list)), None)
                    items = parsed_json[array_key] if array_key else [parsed_json]
                elif isinstance(parsed_json, list):
                    items = parsed_json
                else:
                    items = []
                
                record_count = len(items)
                cols = list(items[0].keys()) if items and isinstance(items[0], dict) else []
                preview = items[:5]
            except Exception:
                format_detected = "unknown"
                record_count = 0
                cols = []
                preview = []
        else:
            # CSV Detection
            format_detected = "csv"
            reader = csv.DictReader(io.StringIO(text_data))
            rows = list(reader)
            record_count = len(rows)
            cols = reader.fieldnames or []
            preview = rows[:5]

        if not preview and not cols:
            raise HTTPException(status_code=422, detail=f"Could not parse valid records or columns from {url}")

        entry = {
            "status": "connected",
            "message": f"Successfully connected external real dataset. Retrieved {record_count} items with {len(cols)} fields.",
            "url": url,
            "dataset_name": req.dataset_name or "External Real Dataset",
            "format_detected": format_detected,
            "record_count": record_count,
            "columns_or_keys": cols,
            "sample_preview": preview,
            "connected_at_utc": datetime.now(timezone.utc).isoformat()
        }
        CONNECTED_EXTERNAL_DATASETS.append(entry)
        return ConnectExternalDatasetResponse(**entry)

    except urllib.error.URLError as e:
        raise HTTPException(status_code=502, detail=f"Failed to connect to external URL: {str(e.reason)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error connecting external dataset: {str(e)}")
