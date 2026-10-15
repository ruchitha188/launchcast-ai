# LaunchCast AI - Data Ingestion and Launch History Preparation
import csv
import math
from pathlib import Path
from typing import List, Dict, Any, Tuple

def get_raw_dataset_path() -> Path:
    base_dir = Path(__file__).resolve().parent.parent.parent
    p1 = Path(r"C:\Users\HP\launchcast_work\backend\data\raw\Sales_Transactions_Dataset_Weekly.csv")
    p2 = base_dir / "data" / "raw" / "Sales_Transactions_Dataset_Weekly.csv"
    if p1.exists():
        return p1
    return p2

class DataLoader:
    """
    Loads and parses the UCI Sales Transactions Weekly dataset (811 products, 52 weeks W0-W51).
    
    IMPORTANT DATASET LIMITATION:
    The UCI dataset records weekly sales across 52 consecutive calendar weeks, but does NOT
    contain product launch dates or inception timestamps.
    Empirical audit shows 555 out of 811 products (68.4%) already have non-zero sales at Week 0.
    Therefore, W0-W7 is treated as an '8-Week Observation Window Proxy' (early monitoring window),
    NOT a verified post-launch inception curve.
    """
    def __init__(self, csv_path: Path = None):
        self.csv_path = csv_path or get_raw_dataset_path()
        self.products: List[Dict[str, Any]] = []
        self.raw_matrix: List[List[int]] = []
        self.product_codes: List[str] = []
        self.launch_curves: Dict[str, List[int]] = {}  # W0 to W7 observation window proxy
        self.full_curves: Dict[str, List[int]] = {}    # W0 to W51 full calendar period
        self.normalized_curves: Dict[str, List[float]] = {}
        self.loaded = False

    def load(self):
        if not self.csv_path.exists():
            raise FileNotFoundError(f"Dataset not found at {self.csv_path}")

        with open(self.csv_path, "r", encoding="utf-8") as f:
            reader = csv.reader(f)
            header = next(reader)
            rows = list(reader)

        w_indices = [header.index(f"W{i}") for i in range(52)]
        norm_indices = [header.index(f"Normalized {i}") for i in range(52)]

        self.products = []
        self.product_codes = []
        self.launch_curves = {}
        self.full_curves = {}
        self.normalized_curves = {}

        for r in rows:
            code = r[0]
            sales_52 = [int(r[idx]) for idx in w_indices]
            norm_52 = [float(r[n_idx]) for n_idx in norm_indices]

            # W0 to W7 represents the first 8 weeks of the monitoring window (observation proxy)
            launch_8 = sales_52[:8]
            total_launch_volume = sum(launch_8)
            total_annual_volume = sum(sales_52)
            peak_launch_week = launch_8.index(max(launch_8)) if max(launch_8) > 0 else 0
            zero_launch_weeks = sum(1 for w in launch_8 if w == 0)

            # Assign volume tier based on annual volume
            if total_annual_volume >= 800:
                volume_tier = "High Volume"
            elif total_annual_volume >= 300:
                volume_tier = "Core Active"
            elif total_annual_volume >= 80:
                volume_tier = "Moderate"
            else:
                volume_tier = "Long Tail"

            # Trajectory shape classification based on first 8 weeks
            w0_to_w3 = sum(launch_8[:4])
            w4_to_w7 = sum(launch_8[4:])
            if total_launch_volume == 0:
                shape_profile = "Dormant / Intermittent"
            elif w0_to_w3 > 1.8 * (w4_to_w7 + 1):
                shape_profile = "Early Peak & Decay"
            elif w4_to_w7 > 1.5 * (w0_to_w3 + 1):
                shape_profile = "Slow Ramp-Up"
            else:
                shape_profile = "Steady Baseline"

            product_meta = {
                "sku_id": code,
                "is_historical": True,
                "dataset_origin": "UCI Sales Transactions Weekly (Real Historical)",
                "observation_window_type": "8-Week Calendar Observation Proxy (Unrecorded Launch Date)",
                "volume_tier": volume_tier,
                "shape_profile": shape_profile,
                "total_launch_volume": total_launch_volume,
                "total_annual_volume": total_annual_volume,
                "peak_launch_week": peak_launch_week + 1,  # 1-indexed (W1-W8)
                "launch_intermittency_pct": round((zero_launch_weeks / 8.0) * 100, 1),
                "weekly_sales_launch": launch_8,
                "weekly_sales_full": sales_52,
                "normalized_trajectory": norm_52[:8]
            }

            self.products.append(product_meta)
            self.product_codes.append(code)
            self.launch_curves[code] = launch_8
            self.full_curves[code] = sales_52
            self.normalized_curves[code] = norm_52

        self.loaded = True
        return self

    def get_tidy_product_weeks(self, max_products: int = None) -> List[Dict[str, Any]]:
        """Transforms the wide format matrix into a tidy long table."""
        if not self.loaded:
            self.load()

        records = []
        target_prods = self.products[:max_products] if max_products else self.products
        for p in target_prods:
            code = p["sku_id"]
            sales = self.full_curves[code]
            norm = self.normalized_curves[code]
            for w in range(52):
                records.append({
                    "product_code": code,
                    "week_index": w,
                    "week_number": w + 1,
                    "sales_units": sales[w],
                    "normalized_sales": norm[w],
                    "is_launch_window": w < 8
                })
        return records

# Global singleton loader
loader = DataLoader()

def get_candidate_new_skus() -> List[Dict[str, Any]]:
    """
    Generates 150 synthetic demonstration candidate SKUs for zero-history cold-start forecasting.
    
    ORIGIN NOTE:
    These 150 SKUs are synthetic demonstration specifications created to demonstrate the
    cold-start forecasting and inventory optimization pipeline (with realistic merchandise
    attributes: Department, Category, MSRP, Brand Tier, Store Count).
    They are NOT official hidden test set SKUs from the hackathon organizers.
    """
    categories = [
        ("Apparel", "Outerwear", 120.0, 180.0, "Premium"),
        ("Apparel", "Activewear", 65.0, 95.0, "Contemporary"),
        ("Apparel", "Basics & Tees", 28.0, 45.0, "Value"),
        ("Footwear", "Trail Running", 130.0, 160.0, "Premium"),
        ("Footwear", "Lifestyle Sneaker", 85.0, 120.0, "Contemporary"),
        ("Footwear", "Comfort Slides", 35.0, 50.0, "Value"),
        ("Accessories", "Technical Packs", 90.0, 140.0, "Premium"),
        ("Accessories", "Headwear & Beanies", 24.0, 38.0, "Contemporary"),
        ("Accessories", "Hydration Gear", 32.0, 48.0, "Value"),
        ("Home Goods", "Insulated Drinkware", 40.0, 60.0, "Contemporary")
    ]

    quarters = ["Q1", "Q2", "Q3", "Q4"]
    materials = ["Recycled Poly", "Merino Blend", "Ripstop Nylon", "Organic Cotton", "Synthetic Foam"]
    colors = ["Onyx Black", "Glacier Blue", "Sage Green", "Terra Cotta", "Heather Grey", "Summit White"]

    candidates = []
    for i in range(1, 151):
        sku_id = f"NEW-{i:03d}"
        cat_spec = categories[(i - 1) % len(categories)]
        dept, cat, min_msrp, max_msrp, tier = cat_spec
        quarter = quarters[(i - 1) % len(quarters)]
        material = materials[(i * 3) % len(materials)]
        color = colors[(i * 7) % len(colors)]
        
        # Deterministic MSRP interpolation
        msrp_step = ((i * 17) % 100) / 100.0
        msrp = round(min_msrp + (max_msrp - min_msrp) * msrp_step, 2)
        target_doors = 80 + ((i * 13) % 120)  # 80 to 200 doors
        promo_flag = bool((i * 5) % 3 == 0)

        # Expected launch volume tier based on brand positioning and door count
        if tier == "Premium" and target_doors >= 140:
            target_profile = "High Volume"
        elif target_doors >= 120 or promo_flag:
            target_profile = "Core Active"
        else:
            target_profile = "Moderate"

        candidates.append({
            "sku_id": sku_id,
            "product_name": f"{dept} {cat} - {color} ({material})",
            "department": dept,
            "category": cat,
            "target_msrp": msrp,
            "brand_tier": tier,
            "launch_quarter": quarter,
            "primary_color": color,
            "primary_material": material,
            "target_store_count": target_doors,
            "promotional_launch": promo_flag,
            "expected_profile": target_profile,
            "has_sales_history": False,
            "dataset_origin": "Synthetic Demonstration Specification (Cold-Start Challenge Model)",
            "is_organizer_hidden_test": False
        })

    return candidates
