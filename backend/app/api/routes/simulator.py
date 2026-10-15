from fastapi import APIRouter
import uuid
from app.schemas.common import SimulationRequest, SimulationResponse
from app.ml.models import forecaster
from app.ml.elasticity import elasticity_engine
from app.inventory.optimizer import inventory_optimizer

router = APIRouter(prefix="/simulator", tags=["Simulator"])

@router.post("/simulate", response_model=SimulationResponse)
def simulate_new_product(request: SimulationRequest):
    sim_id = f"SIM-{str(uuid.uuid4())[:8].upper()}"
    
    sku_spec = {
        "sku_id": sim_id,
        "department": request.department,
        "category": request.category,
        "target_msrp": request.target_msrp,
        "brand_tier": request.brand_tier,
        "launch_quarter": request.launch_quarter,
        "target_store_count": request.store_door_count,
        "expected_profile": "High Volume" if request.brand_tier == "Premium" and request.store_door_count >= 140 else "Core Active"
    }

    # 1. Generate real cold-start baseline forecast (pure analog & category prior)
    baseline_fc = forecaster.forecast_sku(sku_spec)
    
    # 2. Analyze live market price elasticity & benchmark against real-time catalog
    enable_elasticity = request.enable_live_elasticity if request.enable_live_elasticity is not None else True
    elasticity_analysis = elasticity_engine.analyze_price_elasticity(
        target_msrp=request.target_msrp,
        department=request.department,
        category=request.category,
        brand_tier=request.brand_tier,
        baseline_p50=baseline_fc["cumulative_demand"]["p50_point_forecast"],
        enabled=enable_elasticity
    )

    # 3. Apply elasticity multiplier if enabled
    multiplier = elasticity_analysis["demand_multiplier"]
    if elasticity_analysis["enabled"] and multiplier != 1.0:
        adjusted_weekly = []
        for w in baseline_fc["weekly_forecasts"]:
            w_copy = dict(w)
            w_copy["p10_units"] = round(w["p10_units"] * multiplier, 1)
            w_copy["p50_units"] = round(w["p50_units"] * multiplier, 1)
            w_copy["p90_units"] = round(w["p90_units"] * multiplier, 1)
            w_copy["uncertainty_spread"] = round(w_copy["p90_units"] - w_copy["p10_units"], 1)
            adjusted_weekly.append(w_copy)
            
        p10_adj = round(baseline_fc["cumulative_demand"]["p10_lower_bound"] * multiplier, 1)
        p50_adj = round(baseline_fc["cumulative_demand"]["p50_point_forecast"] * multiplier, 1)
        p90_adj = round(baseline_fc["cumulative_demand"]["p90_upper_bound"] * multiplier, 1)
        spread_adj = round(p90_adj - p10_adj, 1)
        
        active_fc = dict(baseline_fc)
        active_fc["weekly_forecasts"] = adjusted_weekly
        active_fc["cumulative_demand"] = {
            "p10_lower_bound": p10_adj,
            "p50_point_forecast": p50_adj,
            "p90_upper_bound": p90_adj,
            "total_uncertainty_spread": spread_adj
        }
        active_fc["market_benchmark"] = elasticity_analysis
    else:
        active_fc = dict(baseline_fc)
        active_fc["market_benchmark"] = elasticity_analysis

    # 4. Generate real Newsvendor inventory purchase recommendation on the active forecast
    inv = inventory_optimizer.calculate_newsvendor_purchase(
        msrp=request.target_msrp,
        p10_demand=active_fc["cumulative_demand"]["p10_lower_bound"],
        p50_demand=active_fc["cumulative_demand"]["p50_point_forecast"],
        p90_demand=active_fc["cumulative_demand"]["p90_upper_bound"],
        sku_id=sim_id
    )

    return SimulationResponse(
        simulation_id=sim_id,
        status="completed",
        message="Cold-start launch simulation completed with live market elasticity calibration and Newsvendor inventory optimization.",
        input_received=request,
        forecast=active_fc,
        baseline_forecast=baseline_fc,
        market_benchmark=elasticity_analysis,
        inventory_recommendation=inv
    )
