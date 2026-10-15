from fastapi import APIRouter, Query
from fastapi.responses import Response
import csv
import io
from typing import Optional
from app.ml.models import forecaster
from app.inventory.optimizer import inventory_optimizer

router = APIRouter(prefix="/export", tags=["Export"])

@router.get("/forecasts.csv")
def export_forecasts_csv():
    """Generates and downloads a CSV export of 8-week demand forecasts for all 150 candidate SKUs."""
    all_fcs = forecaster.forecast_all_150_candidates()
    output = io.StringIO()
    writer = csv.writer(output)

    header = [
        "sku_id", "department", "category", "target_msrp", "brand_tier", "target_store_count",
        "p10_total", "p50_total", "p90_total", "uncertainty_spread", "overall_confidence",
        "w1_p50", "w2_p50", "w3_p50", "w4_p50", "w5_p50", "w6_p50", "w7_p50", "w8_p50",
        "top_analog_sku"
    ]
    writer.writerow(header)

    for fc in all_fcs:
        w_fcs = fc["weekly_forecasts"]
        row = [
            fc["sku_id"], fc["department"], fc["category"], fc["target_msrp"], fc["brand_tier"], fc["target_store_count"],
            fc["cumulative_demand"]["p10_lower_bound"],
            fc["cumulative_demand"]["p50_point_forecast"],
            fc["cumulative_demand"]["p90_upper_bound"],
            fc["cumulative_demand"]["total_uncertainty_spread"],
            fc["confidence_metrics"]["overall_confidence"],
            w_fcs[0]["p50_units"] if len(w_fcs) > 0 else 0,
            w_fcs[1]["p50_units"] if len(w_fcs) > 1 else 0,
            w_fcs[2]["p50_units"] if len(w_fcs) > 2 else 0,
            w_fcs[3]["p50_units"] if len(w_fcs) > 3 else 0,
            w_fcs[4]["p50_units"] if len(w_fcs) > 4 else 0,
            w_fcs[5]["p50_units"] if len(w_fcs) > 5 else 0,
            w_fcs[6]["p50_units"] if len(w_fcs) > 6 else 0,
            w_fcs[7]["p50_units"] if len(w_fcs) > 7 else 0,
            fc["analog_precedents"][0]["analog_sku"] if fc["analog_precedents"] else ""
        ]
        writer.writerow(row)

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=launchcast_8week_demand_forecasts.csv"}
    )

@router.get("/purchase_orders.csv")
def export_purchase_orders_csv(
    service_level: Optional[float] = Query(None),
    understock_cost: Optional[float] = Query(None),
    overstock_cost: Optional[float] = Query(None)
):
    """Generates and downloads a CSV export of Newsvendor inventory purchase recommendations."""
    all_recs = inventory_optimizer.optimize_all_candidates(
        service_level_constraint=service_level,
        understock_cost=understock_cost,
        overstock_cost=overstock_cost
    )
    output = io.StringIO()
    writer = csv.writer(output)

    header = [
        "sku_id", "department", "category", "brand_tier", "unit_msrp", "unit_cost", "salvage_value",
        "cu", "co", "critical_ratio", "recommended_order_quantity", "safety_stock_units", "p50_median_demand",
        "service_level_achieved_pct", "expected_unmet_demand_units", "expected_leftover_units",
        "stockout_probability_pct", "total_procurement_cost", "expected_net_profit", "expected_margin_pct"
    ]
    writer.writerow(header)

    for r in all_recs:
        p = r["cost_parameters"]
        rec = r["recommendation"]
        risk = r["risk_analysis"]
        fin = r["financial_projection"]
        row = [
            r["sku_id"], r["department"], r["category"], r["brand_tier"],
            p["unit_msrp"], p["unit_cost"], p["salvage_value"],
            p["understocking_cost_cu"], p["overstocking_cost_co"], p["critical_ratio"],
            rec["recommended_order_quantity"], rec["safety_stock_units"], rec["p50_median_demand"],
            rec["service_level_achieved_pct"], risk["expected_unmet_demand_units"], risk["expected_leftover_units"],
            risk["stockout_probability_pct"], fin["total_order_cost"], fin["expected_net_profit"], fin["expected_profit_margin_pct"]
        ]
        writer.writerow(row)

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=launchcast_inventory_purchase_orders.csv"}
    )

@router.get("/top10_uncertain_skus.csv")
def export_top10_uncertain_csv():
    """Generates and downloads a CSV export of the top 10 least-confident SKUs."""
    from app.ml.explainability import explainability_engine
    top10 = explainability_engine.get_top_10_least_confident_skus()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "rank", "sku_id", "product_name", "department", "category",
        "target_msrp", "target_doors", "p50_forecast", "p10_p90_spread",
        "uncertainty_score", "overall_confidence", "reason_for_uncertainty", "recommended_mitigation"
    ])
    for item in top10:
        writer.writerow([
            item["rank"], item["sku_id"], item["product_name"], item["department"], item["category"],
            item["target_msrp"], item["target_doors"], item["p50_forecast"],
            item["p10_p90_spread"], item["uncertainty_score"],
            item["overall_confidence"], item["reason_for_uncertainty"], item["recommended_mitigation"]
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=launchcast_top10_uncertain_skus.csv"}
    )
