from fastapi import APIRouter, Query, HTTPException
from typing import List, Dict, Any, Optional
from app.inventory.optimizer import inventory_optimizer
from app.schemas.common import OptimizationRequest
from app.ml.models import forecaster

router = APIRouter(prefix="/inventory", tags=["Inventory"])

@router.get("/recommendations")
def get_inventory_recommendations(
    understock_cost: Optional[float] = Query(None, description="Understocking cost Cu (lost profit margin)"),
    overstock_cost: Optional[float] = Query(None, description="Overstocking cost Co (markdown holding loss)"),
    service_level_constraint: Optional[float] = Query(None, description="Explicit service-level constraint floor (optional)"),
    service_level: Optional[float] = Query(None, description="Backwards-compatible alias for explicit service-level constraint")
):
    """
    Returns Newsvendor purchase order recommendations for all 150 candidate new SKUs.
    Uses Cu / (Cu + Co) as target demand quantile under Newsvendor model.
    """
    constraint = service_level_constraint if service_level_constraint is not None else service_level
    recs = inventory_optimizer.optimize_all_candidates(
        service_level_constraint=constraint,
        understock_cost=understock_cost,
        overstock_cost=overstock_cost
    )
    total_spend = sum(r["financial_projection"]["total_order_cost"] for r in recs)
    total_units = sum(r["recommendation"]["recommended_order_quantity"] for r in recs)
    total_safety_stock = sum(r["recommendation"]["safety_stock_units"] for r in recs)
    mean_critical_ratio = sum(r["cost_parameters"]["critical_ratio"] for r in recs) / len(recs) if recs else 0.625

    return {
        "status": "success",
        "total_skus": len(recs),
        "recommendations_count": len(recs),
        "total_units_recommended": total_units,
        "total_procurement_spend": round(total_spend, 2),
        "total_safety_stock_units": total_safety_stock,
        "average_critical_fractile": round(mean_critical_ratio, 4),
        "policy": "Newsvendor Critical Fractile Model [tau* = Cu / (Cu + Co)]",
        "recommendations": recs
    }

@router.get("/recommendations/{sku_id}")
def get_single_sku_recommendation(
    sku_id: str,
    understock_cost: Optional[float] = Query(None),
    overstock_cost: Optional[float] = Query(None),
    service_level_constraint: Optional[float] = Query(None),
    service_level: Optional[float] = Query(None)
):
    """
    Returns Newsvendor purchase recommendation for a specific candidate SKU.
    """
    candidates = forecaster.forecast_all_150_candidates()
    match = next((c for c in candidates if c["sku_id"] == sku_id), None)
    if not match:
        raise HTTPException(status_code=404, detail=f"Candidate SKU {sku_id} not found")

    constraint = service_level_constraint if service_level_constraint is not None else service_level
    rec = inventory_optimizer.calculate_newsvendor_purchase(
        msrp=match["target_msrp"],
        c_u=understock_cost,
        c_o=overstock_cost,
        service_level_constraint=constraint,
        p10_demand=match["cumulative_demand"]["p10_lower_bound"],
        p50_demand=match["cumulative_demand"]["p50_point_forecast"],
        p90_demand=match["cumulative_demand"]["p90_upper_bound"],
        sku_id=sku_id
    )
    rec["product_name"] = match.get("product_name", f"{match.get('department','')} {match.get('category','')}")
    rec["department"] = match.get("department", "")
    rec["category"] = match.get("category", "")
    rec["brand_tier"] = match.get("brand_tier", "")
    return rec

@router.post("/optimize")
def optimize_custom_sku(req: OptimizationRequest) -> Dict[str, Any]:
    """
    Custom recalculation allowing user to configure cost and salvage assumptions for any SKU.
    """
    p50 = req.p50_demand if req.p50_demand is not None else 60.0
    p10 = req.p10_demand if req.p10_demand is not None else round(p50 * 0.65, 1)
    p90 = req.p90_demand if req.p90_demand is not None else round(p50 * 1.45, 1)

    return inventory_optimizer.calculate_newsvendor_purchase(
        msrp=req.unit_msrp,
        unit_cost=req.unit_cost,
        salvage_value=req.salvage_value,
        service_level_constraint=req.service_level_constraint,
        p10_demand=p10,
        p50_demand=p50,
        p90_demand=p90,
        sku_id=req.sku_id
    )
