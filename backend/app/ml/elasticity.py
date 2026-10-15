# LaunchCast AI - Real-Time Market Price Elasticity & Benchmarking Engine
import math
from typing import Dict, Any, List, Optional, Tuple
from app.data_processing.live_client import live_client

# Mapping from LaunchCast Simulator Department/Category to Live Catalog Categories
CATEGORY_MAPPING = {
    # Consumer Electronics
    "audio & accessories": ["mobile-accessories", "smartphones"],
    "smart home tech": ["laptops", "mobile-accessories", "smartphones"],
    "consumer electronics": ["laptops", "mobile-accessories", "smartphones"],
    
    # Apparel & Fashion
    "outerwear": ["mens-shirts", "tops", "womens-dresses"],
    "denim & trousers": ["mens-shirts", "tops"],
    "knitwear & sweaters": ["mens-shirts", "tops"],
    "apparel & fashion": ["mens-shirts", "tops", "womens-dresses"],
    
    # Footwear & Athletic
    "running footwear": ["mens-shoes", "womens-shoes", "sports-accessories"],
    "lifestyle footwear": ["mens-shoes", "womens-shoes"],
    "active performance": ["mens-shoes", "sports-accessories"],
    "footwear & athletic": ["mens-shoes", "womens-shoes"],
    
    # Home & Living
    "bedding & textiles": ["home-decoration", "furniture"],
    "kitchen & dining": ["kitchen-accessories", "groceries"],
    "home & living": ["home-decoration", "furniture", "kitchen-accessories"],
    
    # Beauty & Personal Care
    "skincare essentials": ["beauty", "skin-care"],
    "fragrance & body": ["fragrances", "beauty"],
    "beauty & personal care": ["beauty", "fragrances", "skin-care"]
}

# Empirical price elasticity priors by brand positioning
ELASTICITY_PRIORS = {
    "luxury": -0.60,      # Inelastic: strong brand moat, low sensitivity
    "designer": -0.60,
    "premium": -0.80,     # Moderately inelastic: brand value offsets premium
    "contemporary": -0.80,
    "mass": -1.10,        # Slightly elastic: standard retail competition
    "core": -1.10,
    "value": -1.35,       # Highly elastic: price shoppers, high sensitivity
    "fast turn": -1.35
}

def get_elasticity_coefficient(brand_tier: str) -> float:
    """Resolves elasticity prior based on brand tier positioning."""
    tier_lower = brand_tier.lower()
    for key, val in ELASTICITY_PRIORS.items():
        if key in tier_lower:
            return val
    return -0.90  # Default general retail elasticity

class MarketPriceElasticityEngine:
    """
    Computes live market price benchmarks and elasticity multipliers using real-time
    catalog streams from the public provider (DummyJSON Products).
    
    Guarantees:
    - Never mutates historical UCI transaction matrices.
    - Preserves baseline forecast while computing market-adjusted elasticity.
    - Clamps adjustments within safety bounds [0.60, 1.50] to avoid runaway extrapolation.
    """
    def __init__(self):
        pass

    def get_market_benchmark(
        self,
        department: str,
        category: str
    ) -> Tuple[str, List[float], List[Dict[str, Any]]]:
        """
        Retrieves matching live catalog prices and sample products for a given category.
        """
        records = live_client.get_live_records()
        cat_key = category.strip().lower()
        dept_key = department.strip().lower()

        # 1. Try category-specific mapping
        target_live_cats = CATEGORY_MAPPING.get(cat_key)
        if not target_live_cats:
            # 2. Try department-level mapping
            target_live_cats = CATEGORY_MAPPING.get(dept_key, [])

        matching_recs = []
        if target_live_cats:
            matching_recs = [
                r for r in records
                if r.category.lower() in [c.lower() for c in target_live_cats]
            ]

        # 3. Fallback: if no specific category match, use all live records
        if not matching_recs:
            matching_recs = records

        matched_label = target_live_cats[0].title() if target_live_cats else "General Catalog"
        prices = [r.price for r in matching_recs if r.price > 0]
        sample_prods = [
            {"title": r.title, "price": r.price, "brand": r.brand or "Generic", "sku": r.sku}
            for r in matching_recs[:3]
        ]

        return matched_label, prices, sample_prods

    def analyze_price_elasticity(
        self,
        target_msrp: float,
        department: str,
        category: str,
        brand_tier: str,
        baseline_p50: float,
        enabled: bool = True
    ) -> Dict[str, Any]:
        """
        Evaluates price competitiveness vs live market benchmark and computes elasticity impact.
        """
        matched_cat, prices, sample_prods = self.get_market_benchmark(department, category)
        
        if not prices:
            median_price = target_msrp
            mean_price = target_msrp
            min_price = target_msrp
            max_price = target_msrp
            sample_size = 0
        else:
            sorted_prices = sorted(prices)
            n = len(sorted_prices)
            median_price = (
                (sorted_prices[n // 2 - 1] + sorted_prices[n // 2]) / 2.0
                if n % 2 == 0
                else sorted_prices[n // 2]
            )
            mean_price = round(sum(prices) / n, 2)
            min_price = min(prices)
            max_price = max(prices)
            sample_size = n

        price_ratio = round(target_msrp / median_price, 3) if median_price > 0 else 1.0
        elasticity_coeff = get_elasticity_coefficient(brand_tier)

        if not enabled or sample_size == 0:
            clamped_multiplier = 1.0
            shift_pct = 0.0
            adjusted_p50 = baseline_p50
            delta_units = 0.0
            positioning = "Market Elasticity Inactive (Using Unadjusted Baseline)"
            rationale = "Live market price elasticity toggle is disabled. Baseline analog forecast preserved."
        else:
            # Multiplier M = (P_target / P_benchmark) ^ epsilon
            raw_multiplier = math.pow(price_ratio, elasticity_coeff)
            # Safe clamping within [0.60, 1.50]
            clamped_multiplier = round(max(0.60, min(1.50, raw_multiplier)), 3)
            shift_pct = round((clamped_multiplier - 1.0) * 100, 1)
            adjusted_p50 = round(baseline_p50 * clamped_multiplier, 1)
            delta_units = round(adjusted_p50 - baseline_p50, 1)

            diff_pct = round((price_ratio - 1.0) * 100, 1)
            if diff_pct > 5.0:
                positioning = f"Premium Pricing (+{diff_pct}% vs. Live Market Benchmark)"
                rationale = (
                    f"Candidate target MSRP of ${target_msrp:.2f} is priced {diff_pct}% above the live market median "
                    f"(${median_price:.2f}) across {sample_size} live catalog items ({matched_cat}). "
                    f"Under {brand_tier} brand positioning (elasticity prior e = {elasticity_coeff}), "
                    f"demand is projected to compress by {abs(shift_pct)}% ({delta_units:+.1f} units) vs. category baseline."
                )
            elif diff_pct < -5.0:
                positioning = f"Discount / Value Pricing ({diff_pct}% vs. Live Market Benchmark)"
                rationale = (
                    f"Candidate target MSRP of ${target_msrp:.2f} is priced {abs(diff_pct)}% below the live market median "
                    f"(${median_price:.2f}) across {sample_size} live catalog items ({matched_cat}). "
                    f"Under {brand_tier} brand positioning (elasticity prior e = {elasticity_coeff}), "
                    f"the price competitiveness advantage yields a projected +{shift_pct}% demand uplift ({delta_units:+.1f} units)."
                )
            else:
                positioning = "Market Parity (+/-5% of Live Benchmark)"
                rationale = (
                    f"Candidate target MSRP of ${target_msrp:.2f} closely aligns with the live market median "
                    f"(${median_price:.2f}). Forecast volume operates at near parity with the historical analog prior."
                )

        return {
            "enabled": enabled,
            "provider_name": "DummyJSON Products Public API",
            "benchmark_category": matched_cat,
            "sample_size": sample_size,
            "market_median_price": round(median_price, 2),
            "market_mean_price": round(mean_price, 2),
            "market_min_price": round(min_price, 2),
            "market_max_price": round(max_price, 2),
            "candidate_msrp": round(target_msrp, 2),
            "price_ratio": price_ratio,
            "price_positioning": positioning,
            "elasticity_coefficient": elasticity_coeff,
            "demand_multiplier": clamped_multiplier,
            "demand_shift_percentage": shift_pct,
            "baseline_p50_units": baseline_p50,
            "adjusted_p50_units": adjusted_p50,
            "delta_units": delta_units,
            "sample_benchmark_products": sample_prods,
            "economic_rationale": rationale,
            "causality_disclaimer": (
                "Live market price benchmarking applies microeconomic elasticity priors against external catalog MSRPs. "
                "It serves as a planning benchmark and does not represent causal elasticity from the historical UCI dataset."
            )
        }

# Global singleton
elasticity_engine = MarketPriceElasticityEngine()
