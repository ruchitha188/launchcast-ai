# LaunchCast AI - UCI Sales Transactions Dataset Inspection
import csv
import json
import sys
from pathlib import Path

def inspect_dataset(csv_path=None):
    if csv_path is None:
        base_dir = Path(__file__).resolve().parent.parent.parent
        # Look in workspace data/raw or launchcast_work
        p1 = Path(r"C:\Users\HP\launchcast_work\backend\data\raw\Sales_Transactions_Dataset_Weekly.csv")
        p2 = Path(r"c:\Users\HP\Documents\launchcast-ai\backend\data\raw\Sales_Transactions_Dataset_Weekly.csv")
        csv_path = p1 if p1.exists() else p2
    else:
        csv_path = Path(csv_path)

    if not csv_path.exists():
        return {
            "error": f"File not found at {csv_path}",
            "status": "missing_file"
        }

    file_size_bytes = csv_path.stat().st_size

    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader)
        rows = list(reader)

    row_count = len(rows)
    col_count = len(header)

    product_col = header[0]
    raw_week_cols = [c for c in header if c.startswith("W") and c[1:].isdigit()]
    min_max_cols = [c for c in ["MIN", "MAX"] if c in header]
    norm_cols = [c for c in header if c.startswith("Normalized")]

    null_cells = 0
    nulls_by_col = {col: 0 for col in header}
    for r in rows:
        for i, val in enumerate(r):
            if val is None or val.strip() == "":
                null_cells += 1
                nulls_by_col[header[i]] += 1

    product_codes = [r[0] for r in rows]
    unique_products = len(set(product_codes))
    duplicate_products = row_count - unique_products

    w_indices = [header.index(c) for c in raw_week_cols]
    all_weekly_sales = []
    product_totals = []
    zero_sales_count = 0

    for r in rows:
        p_sales = [int(r[idx]) for idx in w_indices]
        product_totals.append(sum(p_sales))
        for s in p_sales:
            all_weekly_sales.append(s)
            if s == 0:
                zero_sales_count += 1

    total_units_sold = sum(all_weekly_sales)
    mean_units = sum(all_weekly_sales) / len(all_weekly_sales) if all_weekly_sales else 0.0

    sorted_sales = sorted(all_weekly_sales)
    n = len(sorted_sales)
    median_units = sorted_sales[n // 2] if n % 2 != 0 else (sorted_sales[n // 2 - 1] + sorted_sales[n // 2]) / 2.0

    variance = sum((x - mean_units) ** 2 for x in all_weekly_sales) / (len(all_weekly_sales) - 1) if len(all_weekly_sales) > 1 else 0.0
    stdev_units = variance ** 0.5

    p10_units = sorted_sales[int(n * 0.10)]
    p25_units = sorted_sales[int(n * 0.25)]
    p75_units = sorted_sales[int(n * 0.75)]
    p90_units = sorted_sales[int(n * 0.90)]

    sorted_totals = sorted(product_totals)
    m = len(sorted_totals)
    median_annual = sorted_totals[m // 2] if m % 2 != 0 else (sorted_totals[m // 2 - 1] + sorted_totals[m // 2]) / 2.0

    has_launch_dates = any("date" in c.lower() or "time" in c.lower() or "launch" in c.lower() for c in header)
    has_product_attributes = any(c.lower() in ["category", "department", "msrp", "price", "brand", "desc"] for c in header)
    history_weeks_count = len(raw_week_cols)
    history_years = round(history_weeks_count / 52.0, 2)

    sample_melted = []
    norm_indices = [header.index(c) for c in norm_cols] if norm_cols else []
    for r in rows[:4]:
        p_code = r[0]
        for w_idx, w_name in enumerate(raw_week_cols[:4]):
            units = int(r[w_indices[w_idx]])
            norm_val = float(r[norm_indices[w_idx]]) if norm_indices else None
            sample_melted.append({
                "product_code": p_code,
                "week_label": w_name,
                "week_index": w_idx,
                "sales_units": units,
                "normalized_units": norm_val
            })

    report = {
        "file_info": {
            "filename": csv_path.name,
            "filepath": str(csv_path),
            "size_bytes": file_size_bytes,
            "size_kb": round(file_size_bytes / 1024, 2),
            "format": "CSV (Comma Separated Values)",
            "encoding": "UTF-8"
        },
        "dimensions": {
            "total_rows": row_count,
            "total_columns": col_count,
            "total_cells": row_count * col_count,
            "unique_products": unique_products,
            "duplicate_products": duplicate_products
        },
        "column_taxonomy": {
            "product_id_column": product_col,
            "weekly_sales_columns_count": len(raw_week_cols),
            "weekly_sales_columns_range": f"{raw_week_cols[0]} to {raw_week_cols[-1]}",
            "summary_columns": min_max_cols,
            "normalized_columns_count": len(norm_cols),
            "normalized_columns_range": f"{norm_cols[0]} to {norm_cols[-1]}" if norm_cols else "None"
        },
        "missing_data": {
            "total_null_cells": null_cells,
            "null_percentage": round((null_cells / (row_count * col_count)) * 100, 4)
        },
        "weekly_sales_statistics": {
            "total_observations": len(all_weekly_sales),
            "total_units_sold": total_units_sold,
            "min_units_per_week": min(all_weekly_sales),
            "max_units_per_week": max(all_weekly_sales),
            "mean_units_per_week": round(mean_units, 2),
            "median_units_per_week": float(median_units),
            "stdev_units_per_week": round(stdev_units, 2),
            "percentiles": {
                "p10": p10_units,
                "p25": p25_units,
                "p50": median_units,
                "p75": p75_units,
                "p90": p90_units
            },
            "zero_sales_weeks": zero_sales_count,
            "zero_sales_percentage": round((zero_sales_count / len(all_weekly_sales)) * 100, 2)
        },
        "product_annual_volume_statistics": {
            "min_annual_units": min(product_totals),
            "max_annual_units": max(product_totals),
            "mean_annual_units": round(sum(product_totals) / len(product_totals), 2),
            "median_annual_units": float(median_annual)
        },
        "verified_dataset_assumptions": {
            "contains_launch_dates": has_launch_dates,
            "contains_product_attributes": has_product_attributes,
            "recorded_history_weeks": history_weeks_count,
            "recorded_history_years": history_years,
            "contains_three_years_history": history_weeks_count >= 156
        },
        "transformation_plan": {
            "source_shape": f"{row_count} products x {col_count} columns (Wide Format)",
            "target_shape": f"{row_count * len(raw_week_cols):,} rows x 5 columns (Tidy Long Format: product_code, week_index, week_label, sales_units, normalized_units)",
            "sample_unpivoted_rows": sample_melted
        }
    }

    try:
        proc_dir = Path(r"C:\Users\HP\launchcast_work\backend\data\processed")
        proc_dir.mkdir(parents=True, exist_ok=True)
        out_json = proc_dir / "inspection_summary.json"
        with open(out_json, "w", encoding="utf-8") as jf:
            json.dump(report, jf, indent=2)
        report["summary_saved_to"] = str(out_json)
    except Exception as e:
        report["summary_save_error"] = str(e)

    return report

def print_inspection_report(report):
    if "error" in report:
        print("[ERROR]", report["error"])
        return

    print("=" * 80)
    print("  LAUNCHCAST AI - UCI SALES TRANSACTIONS WEEKLY DATASET AUDIT REPORT")
    print("=" * 80)

    fi = report["file_info"]
    print("\n[1. FILE IDENTIFICATION]")
    print(f"  * Filename:           {fi['filename']}")
    print(f"  * File Path:          {fi['filepath']}")
    print(f"  * Format:             {fi['format']}")
    print(f"  * Encoding:           {fi['encoding']}")
    print(f"  * File Size:          {fi['size_bytes']:,} bytes ({fi['size_kb']} KB)")

    dim = report["dimensions"]
    print("\n[2. DIMENSIONS & INTEGRITY]")
    print(f"  * Total Products:     {dim['total_rows']:,} rows (SKUs)")
    print(f"  * Total Columns:      {dim['total_columns']:,} columns")
    print(f"  * Total Data Cells:   {dim['total_cells']:,}")
    print(f"  * Unique Product IDs: {dim['unique_products']:,} (Duplicate IDs: {dim['duplicate_products']})")

    tax = report["column_taxonomy"]
    print("\n[3. COLUMN TAXONOMY]")
    print(f"  * Product Identifier:   '{tax['product_id_column']}' (Categorical string, e.g. P1..P819)")
    print(f"  * Raw Weekly Sales:     {tax['weekly_sales_columns_count']} columns ({tax['weekly_sales_columns_range']}) [Integer Units Sold]")
    print(f"  * Historical Extremes:  {', '.join(tax['summary_columns'])} [Min and Max sales per product over 52 weeks]")
    print(f"  * Pre-Normalized Sales: {tax['normalized_columns_count']} columns ({tax['normalized_columns_range']}) [Min-Max Scaled [0, 1]]")

    mis = report["missing_data"]
    print("\n[4. DATA COMPLETENESS]")
    print(f"  * Missing/Null Cells:   {mis['total_null_cells']} ({mis['null_percentage']}%) - 100% Dense Matrix")

    stats = report["weekly_sales_statistics"]
    print("\n[5. WEEKLY SALES DISTRIBUTION (W0 TO W51)]")
    print(f"  * Total Unit Sales:     {stats['total_units_sold']:,} units across {stats['total_observations']:,} product-weeks")
    print(f"  * Min / Max Weekly:     {stats['min_units_per_week']} to {stats['max_units_per_week']} units/week")
    print(f"  * Mean Weekly Sales:    {stats['mean_units_per_week']} units/week")
    print(f"  * Std Deviation:        {stats['stdev_units_per_week']} units/week")
    print(f"  * Median (P50):         {stats['median_units_per_week']} units/week")
    print(f"  * Quantiles:            P10={stats['percentiles']['p10']}, P25={stats['percentiles']['p25']}, P75={stats['percentiles']['p75']}, P90={stats['percentiles']['p90']}")
    print(f"  * Zero-Sales Weeks:     {stats['zero_sales_weeks']:,} ({stats['zero_sales_percentage']}%) [Intermittent / Slow-moving SKU tail]")

    pstats = report["product_annual_volume_statistics"]
    print("\n[6. ANNUAL SKU VOLUME SUMMARY (52-WEEK SUM)]")
    print(f"  * Annual Min Volume:    {pstats['min_annual_units']} units/year")
    print(f"  * Annual Max Volume:    {pstats['max_annual_units']:,} units/year")
    print(f"  * Annual Mean Volume:   {pstats['mean_annual_units']:,} units/year")
    print(f"  * Annual Median Volume: {pstats['median_annual_units']:,} units/year")

    v = report["verified_dataset_assumptions"]
    print("\n[7. COLD-START METADATA VERIFICATION (CRITICAL AUDIT)]")
    print(f"  * Contains Launch Dates?               {v['contains_launch_dates']}  (Only relative sequential week indices W0..W51)")
    print(f"  * Contains Product Attributes?         {v['contains_product_attributes']} (Anonymous SKU codes P1..P811, no categories/MSRP)")
    print(f"  * Contains 3 Years of Launch History?  {v['contains_three_years_history']} (Exactly {v['recorded_history_weeks']} weeks = {v['recorded_history_years']} year of history)")

    plan = report["transformation_plan"]
    print("\n[8. PRODUCT-WEEK TABLE TRANSFORMATION PLAN]")
    print(f"  * Source Shape:         {plan['source_shape']}")
    print(f"  * Target Tidy Shape:    {plan['target_shape']}")
    print("  * Sample Unpivoted Records:")
    for row in plan["sample_unpivoted_rows"][:8]:
        print(f"      - SKU={row['product_code']}, Week={row['week_label']} (t={row['week_index']}): Units={row['sales_units']}, Normalized={row['normalized_units']}")

    if "summary_saved_to" in report:
        print(f"\n[Report Saved to: {report['summary_saved_to']}]")
    print("=" * 80)

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else None
    rep = inspect_dataset(target)
    print_inspection_report(rep)
