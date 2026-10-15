# LaunchCast AI - Analog Launch Matching Engine
# K-Nearest Neighbor Analog Matching across Historical Products
import math
from typing import List, Dict, Any, Tuple
from app.data_processing.loader import loader

class AnalogMatchingEngine:
    def __init__(self):
        if not loader.loaded:
            loader.load()

    def find_analogs(
        self,
        target_profile: str = "Core Active",
        target_doors: int = 120,
        target_msrp: float = 75.0,
        k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Finds the top-K historical product analogs for a candidate SKU.
        Scores similarity based on volume alignment and launch curve shape.
        """
        candidates = []
        
        # Target volume anchor (proxy weekly sales scale)
        # Approximate retail velocity: doors * velocity index / factor
        target_weekly_scale = max(2.0, (target_doors / 100.0) * (target_msrp / 15.0))

        for p in loader.products:
            sku_id = p["sku_id"]
            hist_launch = p["weekly_sales_launch"]
            hist_annual = p["total_annual_volume"]
            hist_launch_total = p["total_launch_volume"]

            # Volume tier similarity score
            tier_match = 1.0 if p["volume_tier"] == target_profile else 0.5
            
            # Volume distance on 8-week scale
            expected_8wk = target_weekly_scale * 8.0
            vol_diff = abs(hist_launch_total - expected_8wk)
            vol_score = 1.0 / (1.0 + (vol_diff / max(10.0, expected_8wk)))

            # Combined distance
            composite_similarity = round(0.4 * tier_match + 0.6 * vol_score, 4)

            candidates.append({
                "analog_sku": sku_id,
                "similarity_score": composite_similarity,
                "volume_tier": p["volume_tier"],
                "shape_profile": p["shape_profile"],
                "total_launch_units": hist_launch_total,
                "total_annual_units": hist_annual,
                "peak_launch_week": p["peak_launch_week"],
                "launch_curve": hist_launch,
                "normalized_trajectory": p["normalized_trajectory"]
            })

        # Sort descending by similarity
        candidates.sort(key=lambda x: x["similarity_score"], reverse=True)
        return candidates[:k]

    def generate_analog_forecast(
        self,
        analogs: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Aggregates analog historical launch curves into calibrated quantile weekly forecasts.
        Computes Week 1-8 forecasts for P10, P50, P90.
        """
        if not analogs:
            return {}

        weekly_forecasts = []
        cumulative_p10 = 0.0
        cumulative_p50 = 0.0
        cumulative_p90 = 0.0

        weights = [a["similarity_score"] for a in analogs]
        sum_weights = sum(weights) if sum(weights) > 0 else 1.0
        norm_weights = [w / sum_weights for w in weights]

        for w_idx in range(8):
            week_num = w_idx + 1
            week_vals = [a["launch_curve"][w_idx] for a in analogs]
            
            # Weighted average & empirical quantiles
            sorted_vals = sorted(week_vals)
            m = len(sorted_vals)
            
            weighted_mean = sum(val * norm_weights[i] for i, val in enumerate(week_vals))
            p50_val = sorted_vals[m // 2] if m % 2 != 0 else (sorted_vals[m // 2 - 1] + sorted_vals[m // 2]) / 2.0
            # Blend weighted mean and median for stable point forecast
            p50 = round(0.5 * weighted_mean + 0.5 * p50_val, 1)

            # Quantile spreads based on analog variance
            variance = sum((x - weighted_mean) ** 2 for x in week_vals) / m if m > 0 else 1.0
            stdev = variance ** 0.5
            
            p10 = max(0.0, round(p50 - 1.28 * stdev, 1))
            p90 = round(p50 + 1.28 * stdev, 1)
            
            # Ensure monotonicity: P10 <= P50 <= P90
            p10 = min(p10, p50)
            p90 = max(p90, p50)

            weekly_forecasts.append({
                "week_number": week_num,
                "week_label": f"W{week_num}",
                "p10_units": p10,
                "p50_units": p50,
                "p90_units": p90,
                "uncertainty_spread": round(p90 - p10, 1),
                "confidence_score": round(max(0.40, min(0.95, 1.0 - (stdev / (p50 + 1.0)))), 2)
            })

            cumulative_p10 += p10
            cumulative_p50 += p50
            cumulative_p90 += p90

        # Total 8-week uncertainty estimate (accounting for week-to-week correlation)
        # S_total std dev is approximately 1.5 * sum of weekly stdevs
        total_spread = round(cumulative_p90 - cumulative_p10, 1)
        mean_confidence = round(sum(w["confidence_score"] for w in weekly_forecasts) / 8.0, 2)

        return {
            "horizon_weeks": 8,
            "weekly_forecasts": weekly_forecasts,
            "cumulative_p10": round(cumulative_p10, 1),
            "cumulative_p50": round(cumulative_p50, 1),
            "cumulative_p90": round(cumulative_p90, 1),
            "total_uncertainty_spread": total_spread,
            "overall_confidence": mean_confidence,
            "analogs_used_count": len(analogs)
        }

analog_engine = AnalogMatchingEngine()
