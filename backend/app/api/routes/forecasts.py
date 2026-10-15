from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from app.ml.models import forecaster
from app.data_processing.loader import loader, get_candidate_new_skus

router = APIRouter(prefix="/forecasts", tags=["Forecasts"])

@router.get("/")
def list_forecasts() -> Dict[str, Any]:
    """
    Returns 8-week horizon cold-start forecasts for all 150 candidate new SKUs.
    """
    all_fcs = forecaster.forecast_all_150_candidates()
    summaries = []
    for fc in all_fcs:
        summaries.append({
            "sku_id": fc["sku_id"],
            "department": fc["department"],
            "category": fc["category"],
            "target_msrp": fc["target_msrp"],
            "brand_tier": fc["brand_tier"],
            "target_store_count": fc["target_store_count"],
            "cumulative_p10": fc["cumulative_demand"]["p10_lower_bound"],
            "cumulative_p50": fc["cumulative_demand"]["p50_point_forecast"],
            "cumulative_p90": fc["cumulative_demand"]["p90_upper_bound"],
            "uncertainty_spread": fc["cumulative_demand"]["total_uncertainty_spread"],
            "overall_confidence": fc["confidence_metrics"]["overall_confidence"],
            "top_analog_sku": fc["analog_precedents"][0]["analog_sku"] if fc["analog_precedents"] else "None"
        })

    return {
        "status": "success",
        "active_forecasts_count": len(summaries),
        "horizon_weeks": 8,
        "methodology": "k-Nearest Neighbor Analog Launch Trajectory Calibrated",
        "forecasts": summaries
    }

@router.get("/{sku_id}")
def get_sku_forecast(sku_id: str) -> Dict[str, Any]:
    """
    Retrieves the 8-week quantile trajectory curve and analogs for a specific SKU.
    """
    all_fcs = forecaster.forecast_all_150_candidates()
    fc = next((f for f in all_fcs if f["sku_id"].upper() == sku_id.upper()), None)
    
    if fc:
        return fc

    # If it's a historical SKU code (e.g. P1..P811), return its actual launch curve
    if not loader.loaded:
        loader.load()
    hist_p = next((p for p in loader.products if p["sku_id"].upper() == sku_id.upper()), None)
    if hist_p:
        launch = hist_p["weekly_sales_launch"]
        weekly = []
        for i, u in enumerate(launch):
            weekly.append({
                "week_number": i + 1,
                "week_label": f"W{i+1}",
                "p10_units": u,
                "p50_units": u,
                "p90_units": u,
                "confidence_score": 1.0
            })
        return {
            "sku_id": hist_p["sku_id"],
            "is_historical_ground_truth": True,
            "department": "Historical Precedent",
            "category": hist_p["shape_profile"],
            "target_msrp": 0.0,
            "brand_tier": hist_p["volume_tier"],
            "target_store_count": 100,
            "horizon_weeks": 8,
            "weekly_forecasts": weekly,
            "cumulative_demand": {
                "p10_lower_bound": sum(launch),
                "p50_point_forecast": sum(launch),
                "p90_upper_bound": sum(launch),
                "total_uncertainty_spread": 0.0
            },
            "confidence_metrics": {
                "overall_confidence": 1.0,
                "model_agreement_pct": 100.0,
                "top_analog_similarity": 1.0
            },
            "analog_precedents": [],
            "limitations": ["Historical baseline ground truth actuals."]
        }

    # Otherwise generate dynamic forecast on custom SKU ID
    custom_spec = {
        "sku_id": sku_id,
        "department": "Apparel",
        "category": "General",
        "target_msrp": 80.0,
        "brand_tier": "Contemporary",
        "target_store_count": 120,
        "expected_profile": "Core Active"
    }
    return forecaster.forecast_sku(custom_spec)
