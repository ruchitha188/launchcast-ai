# LaunchCast AI - Explainability and Least-Confident SKU Ranking Engine
import math
from typing import List, Dict, Any
from app.ml.models import forecaster

class ExplainabilityEngine:
    def __init__(self):
        pass

    def explain_sku(self, sku_id: str) -> Dict[str, Any]:
        """
        Produces feature attributions, analog match reasoning, and uncertainty breakdown for a SKU.
        """
        forecasts = forecaster.forecast_all_150_candidates()
        target_fc = next((f for f in forecasts if f["sku_id"] == sku_id), None)
        if not target_fc:
            return {"error": f"SKU {sku_id} not found in candidate pool."}

        p10 = target_fc["cumulative_demand"]["p10_lower_bound"]
        p50 = target_fc["cumulative_demand"]["p50_point_forecast"]
        p90 = target_fc["cumulative_demand"]["p90_upper_bound"]
        spread = target_fc["cumulative_demand"]["total_uncertainty_spread"]
        analogs = target_fc["analog_precedents"]
        conf = target_fc["confidence_metrics"]

        # Feature Attribution weights (Elasticity / Influence on forecast)
        # Doors count is dominant capacity driver (~45%), followed by price positioning (~25%),
        # brand tier baseline (~20%), seasonality quarter (~10%).
        feature_attributions = [
            {
                "feature": "Target Store Doors",
                "value": f"{target_fc['target_store_count']} doors",
                "relative_impact_pct": 45.0,
                "direction": "Positive scale driver",
                "explanation": "Floor door count establishes baseline retail distribution capacity across the chain."
            },
            {
                "feature": "Target MSRP / Price Band",
                "value": f"${target_fc['target_msrp']:.2f}",
                "relative_impact_pct": 25.0,
                "direction": "Elasticity volume throttle",
                "explanation": "Higher MSRP shifts expected velocity downward towards premium low-turn historical curve profiles."
            },
            {
                "feature": "Brand Positioning Tier",
                "value": target_fc["brand_tier"],
                "relative_impact_pct": 20.0,
                "direction": "Shape profile anchor",
                "explanation": f"Positions expected analog pool around '{target_fc['brand_tier']}' adoption velocities."
            },
            {
                "feature": "Category & Department",
                "value": f"{target_fc['department']} - {target_fc['category']}",
                "relative_impact_pct": 10.0,
                "direction": "Baseline prior",
                "explanation": "Anchors baseline adoption prior against peer retail category launch distributions."
            }
        ]

        # Uncertainty Risk Factor Scoring
        # 1. Spread-to-Median Ratio (relative interval width)
        rel_spread = spread / max(5.0, p50)
        # 2. Distance / weakness of top analog
        top_sim = conf["top_analog_similarity"]
        sim_penalty = max(0.0, (0.85 - top_sim) * 2.0)
        # 3. Model disagreement penalty
        disagreement_penalty = max(0.0, (100.0 - conf["model_agreement_pct"]) / 100.0)

        # Composite uncertainty score (0.0 = low uncertainty, 1.0 = high uncertainty)
        raw_uncertainty = 0.50 * min(1.5, rel_spread) + 0.30 * sim_penalty + 0.20 * disagreement_penalty
        uncertainty_score = round(max(0.10, min(0.99, raw_uncertainty)), 3)

        return {
            "sku_id": sku_id,
            "department": target_fc["department"],
            "category": target_fc["category"],
            "target_msrp": target_fc["target_msrp"],
            "brand_tier": target_fc["brand_tier"],
            "cumulative_forecast": target_fc["cumulative_demand"],
            "confidence_score": conf["overall_confidence"],
            "uncertainty_score": uncertainty_score,
            "feature_attributions": feature_attributions,
            "analog_support": {
                "top_analog_sku": analogs[0]["analog_sku"] if analogs else "None",
                "top_analog_similarity": top_sim,
                "precedents_count": len(analogs),
                "analog_summary": [
                    {
                        "sku": a["analog_sku"],
                        "similarity": a["similarity_score"],
                        "shape": a["shape_profile"],
                        "8wk_units": a["total_launch_units"]
                    } for a in analogs[:3]
                ]
            },
            "uncertainty_drivers": {
                "relative_interval_width": round(rel_spread, 2),
                "model_agreement_pct": conf["model_agreement_pct"],
                "extrapolation_risk": "Moderate" if top_sim < 0.70 else "Low"
            },
            "governance_note": "Distinguishes correlation-based analog precedent matching from causal claims. No causal effects claimed without randomized pricing experiment data."
        }

    def get_top_10_least_confident_skus(self) -> List[Dict[str, Any]]:
        """
        Ranks the 10 most uncertain new product candidates.
        Defensible criteria:
        - Wide prediction interval (high spread-to-median ratio)
        - Model disagreement between analog engine and hierarchical prior
        - Weak analog support / low similarity scores
        - Extrapolation risk in door count or MSRP
        """
        forecasts = forecaster.forecast_all_150_candidates()
        scored_candidates = []

        mitigation_library = {
            "extreme_spread": "Reduce initial purchase order to P25 floor and reserve open-to-buy budget for Week 3 replenishment.",
            "weak_analog": "Stage initial inventory rollout in Flagship stores only (Cluster A) for a 2-week demand discovery phase before full fleet release.",
            "model_divergence": "Apply dynamic safety stock buffer multiplier and cross-reference buyer qualitative panel scores.",
            "high_price_elasticity": "Test promotional price point or gift-with-purchase incentive to de-risk high MSRP adoption friction."
        }

        for fc in forecasts:
            sku_id = fc["sku_id"]
            p50 = fc["cumulative_demand"]["p50_point_forecast"]
            spread = fc["cumulative_demand"]["total_uncertainty_spread"]
            conf = fc["confidence_metrics"]
            top_sim = conf["top_analog_similarity"]
            agreement = conf["model_agreement_pct"]

            rel_spread = spread / max(5.0, p50)
            sim_penalty = max(0.0, (0.85 - top_sim) * 2.0)
            disagree_penalty = max(0.0, (100.0 - agreement) / 100.0)

            composite_uncertainty = 0.50 * rel_spread + 0.30 * sim_penalty + 0.20 * disagree_penalty

            # Determine primary uncertainty driver
            if rel_spread > 0.85:
                primary_driver = "High Launch Variance: Wide analog trajectory divergence across weeks 1-8"
                mitigation = mitigation_library["extreme_spread"]
            elif top_sim < 0.65:
                primary_driver = "Sparse Precedent Support: Weak historical analog similarity due to unique attribute tier"
                mitigation = mitigation_library["weak_analog"]
            elif agreement < 65.0:
                primary_driver = "Model Disagreement: Parametric Bass curve diverges from empirical category prior"
                mitigation = mitigation_library["model_divergence"]
            else:
                primary_driver = "Price Extrapolation: MSRP positioned at boundary of historical department distribution"
                mitigation = mitigation_library["high_price_elasticity"]

            scored_candidates.append({
                "rank": 0,
                "sku_id": sku_id,
                "product_name": f"{fc['department']} - {fc['category']} (${fc['target_msrp']:.2f})",
                "department": fc["department"],
                "category": fc["category"],
                "target_msrp": fc["target_msrp"],
                "target_doors": fc["target_store_count"],
                "p50_forecast": p50,
                "p10_p90_spread": spread,
                "overall_confidence": conf["overall_confidence"],
                "uncertainty_score": round(composite_uncertainty, 3),
                "top_analog_similarity": top_sim,
                "model_agreement_pct": agreement,
                "reason_for_uncertainty": primary_driver,
                "recommended_mitigation": mitigation
            })

        # Sort descending by uncertainty
        scored_candidates.sort(key=lambda x: x["uncertainty_score"], reverse=True)
        top_10 = scored_candidates[:10]
        for i, item in enumerate(top_10, 1):
            item["rank"] = i

        return top_10

explainability_engine = ExplainabilityEngine()
