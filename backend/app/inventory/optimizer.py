# LaunchCast AI - Inventory Optimization and Newsvendor Policy
import math
from typing import List, Dict, Any, Optional
from app.ml.models import forecaster
from app.data_processing.loader import get_candidate_new_skus

class InventoryOptimizer:
    """
    Inventory optimization under demand uncertainty using the classical Newsvendor model.
    
    CRITICAL FRACTILE RULE:
    When the assumptions of the Newsvendor model apply (single ordering decision before the launch
    window, uncertain demand, constant unit cost, and salvaging leftover stock), the profit-maximizing
    order quantity Q* satisfies:
        F(Q*) = Cu / (Cu + Co)
    where:
        Cu = Cost of Understocking (lost profit margin = MSRP - Unit Cost)
        Co = Cost of Overstocking (markdown loss = Unit Cost - Salvage Value)
        
    Unless an explicit external service-level constraint is specified by the planner, the target
    demand quantile is strictly Cu / (Cu + Co). A 95% target is NEVER hardcoded.
    """
    def __init__(self):
        pass

    def calculate_newsvendor_purchase(
        self,
        msrp: float,
        unit_cost: Optional[float] = None,
        salvage_value: Optional[float] = None,
        c_u: Optional[float] = None,
        c_o: Optional[float] = None,
        service_level_constraint: Optional[float] = None,
        p10_demand: float = 0.0,
        p50_demand: float = 0.0,
        p90_demand: float = 0.0,
        sku_id: str = "SKU-001"
    ) -> Dict[str, Any]:
        """
        Calculates optimal initial buy quantity balancing understocking margin vs overstocking markdown.
        """
        # Default cost structure if unspecified: 40% COGS, 18% salvage recovery
        cost = unit_cost if unit_cost is not None else round(msrp * 0.40, 2)
        salvage = salvage_value if salvage_value is not None else round(msrp * 0.18, 2)

        # Economic loss parameters
        calc_cu = max(0.01, c_u if c_u is not None else (msrp - cost))
        calc_co = max(0.01, c_o if c_o is not None else (cost - salvage))
        
        # Economic Critical Fractile
        critical_ratio = round(calc_cu / (calc_cu + calc_co), 4)

        # Target demand quantile: strictly critical_ratio unless explicitly constrained
        if service_level_constraint is not None and service_level_constraint > 0:
            target_quantile = round(max(0.01, min(0.99, service_level_constraint)), 4)
            is_constrained = target_quantile > critical_ratio
        else:
            target_quantile = critical_ratio
            is_constrained = False

        # Calibrate optimal order Q* from empirical quantile envelope (P10, P50, P90)
        p10 = max(0.0, float(p10_demand))
        p50 = max(p10, float(p50_demand))
        p90 = max(p50, float(p90_demand))

        if target_quantile == 0.50:
            q_star = p50
        elif target_quantile > 0.50:
            if target_quantile <= 0.90:
                scale = (target_quantile - 0.50) / 0.40  # 0.50 -> 0.0, 0.90 -> 1.0
                q_star = p50 + scale * (p90 - p50)
            else:
                scale = (target_quantile - 0.90) / 0.40
                q_star = p90 + scale * (p90 - p50)
        else:
            if target_quantile >= 0.10:
                scale = (0.50 - target_quantile) / 0.40  # 0.50 -> 0.0, 0.10 -> 1.0
                q_star = p50 - scale * (p50 - p10)
            else:
                scale = (0.10 - target_quantile) / 0.40
                q_star = p10 - scale * (p50 - p10)

        order_quantity = max(1, int(round(q_star)))
        safety_stock = order_quantity - int(round(p50))

        # Approximate demand distribution variance around P50
        demand_stdev = max(1.0, (p90 - p10) / 2.56)

        # Standardized order position z
        z = (order_quantity - p50) / demand_stdev
        
        # Standard normal PDF & Abramowitz-Stegun CDF approximations
        pdf_z = (1.0 / math.sqrt(2 * math.pi)) * math.exp(-0.5 * min(20.0, z * z))
        b0, b1, b2, b3, b4 = 0.2316419, 0.319381530, -0.356563782, 1.781477937, -1.821255978
        t = 1.0 / (1.0 + b0 * abs(z))
        cdf_tail = pdf_z * (b1*t + b2*(t**2) + b3*(t**3) + b4*(t**4))
        cdf_z = (1.0 - cdf_tail) if z >= 0 else cdf_tail

        # Unit loss function: G(z) = pdf(z) - z * (1 - cdf(z))
        g_z = max(0.0, pdf_z - z * (1.0 - cdf_z))
        expected_unmet_demand = round(demand_stdev * g_z, 1)

        # Expected leftovers: E[Leftover] = Q - mu + E[Unmet]
        expected_leftover = max(0.0, round(order_quantity - p50 + expected_unmet_demand, 1))
        expected_sales = round(order_quantity - expected_leftover, 1)

        # Financial expectations
        expected_revenue = expected_sales * msrp + expected_leftover * salvage
        total_procurement_cost = order_quantity * cost
        expected_profit = round(expected_revenue - total_procurement_cost, 2)
        expected_margin_pct = round((expected_profit / max(1.0, expected_sales * msrp)) * 100.0, 1)

        # Service level achieved
        service_level_achieved = round(cdf_z * 100.0, 1)

        # Detailed policy justification string
        if is_constrained:
            rule_expl = (
                f"Economic critical fractile CR = Cu/(Cu+Co) is {critical_ratio:.4f} (based on Cu=${calc_cu:.2f}, Co=${calc_co:.2f}). "
                f"An explicit separate service-level constraint of {target_quantile * 100:.1f}% was requested, so the target quantile was adjusted to {target_quantile * 100:.1f}%."
            )
        else:
            rule_expl = (
                f"Understocking cost Cu=${calc_cu:.2f} (lost margin) vs Overstocking cost Co=${calc_co:.2f} (markdown loss). "
                f"Target demand quantile is strictly the Newsvendor critical fractile CR = Cu/(Cu+Co) = {critical_ratio:.4f} ({critical_ratio * 100:.1f}th percentile). "
                f"No arbitrary 95% service level is hardcoded."
            )

        return {
            "sku_id": sku_id,
            "cost_parameters": {
                "unit_msrp": msrp,
                "unit_cost": cost,
                "salvage_value": salvage,
                "understocking_cost_cu": round(calc_cu, 2),
                "overstocking_cost_co": round(calc_co, 2),
                "critical_ratio": critical_ratio,
                "target_demand_quantile": target_quantile,
                "is_service_level_constrained": is_constrained
            },
            "recommendation": {
                "recommended_order_quantity": order_quantity,
                "safety_stock_units": safety_stock,
                "p50_median_demand": round(p50, 1),
                "target_quantile_pct": round(target_quantile * 100.0, 1),
                "service_level_achieved_pct": service_level_achieved
            },
            "risk_analysis": {
                "expected_sales_units": expected_sales,
                "expected_unmet_demand_units": expected_unmet_demand,
                "expected_leftover_units": expected_leftover,
                "stockout_probability_pct": round((1.0 - cdf_z) * 100.0, 1),
                "markdown_risk_pct": round((expected_leftover / order_quantity) * 100.0, 1)
            },
            "financial_projection": {
                "total_order_cost": round(total_procurement_cost, 2),
                "expected_net_profit": expected_profit,
                "expected_profit_margin_pct": expected_margin_pct
            },
            "decision_rule_explanation": rule_expl
        }

    def optimize_all_candidates(
        self,
        service_level_constraint: Optional[float] = None,
        understock_cost: Optional[float] = None,
        overstock_cost: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """Calculates recommendations for all 150 candidate SKUs."""
        forecasts = forecaster.forecast_all_150_candidates()
        recommendations = []
        for fc in forecasts:
            sku_id = fc["sku_id"]
            msrp = fc["target_msrp"]
            p10 = fc["cumulative_demand"]["p10_lower_bound"]
            p50 = fc["cumulative_demand"]["p50_point_forecast"]
            p90 = fc["cumulative_demand"]["p90_upper_bound"]

            rec = self.calculate_newsvendor_purchase(
                msrp=msrp,
                c_u=understock_cost,
                c_o=overstock_cost,
                service_level_constraint=service_level_constraint,
                p10_demand=p10,
                p50_demand=p50,
                p90_demand=p90,
                sku_id=sku_id
            )
            rec["product_name"] = fc.get("product_name", f"{fc.get('department', '')} {fc.get('category', '')}")
            rec["department"] = fc["department"]
            rec["category"] = fc["category"]
            rec["brand_tier"] = fc["brand_tier"]
            recommendations.append(rec)

        return recommendations

inventory_optimizer = InventoryOptimizer()
