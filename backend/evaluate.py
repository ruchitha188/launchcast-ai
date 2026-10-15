#!/usr/bin/env python
# LaunchCast AI - Runnable Evaluation and Conformal Calibration CLI
import sys
import json
from pathlib import Path

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.evaluation.metrics import run_holdout_validation

def main():
    print("=" * 80)
    print(" LAUNCHCAST AI - MODEL EVALUATION & CONFORMAL CALIBRATION")
    print("=" * 80)
    print("\nRunning leakage-safe product-level 3-way holdout validation (60/20/20)...")
    
    results = run_holdout_validation(random_seed=42)
    s = results["splits"]
    m = results["metrics"]
    c = results["calibration_diagnostics"]
    
    print("\n[DATASET SPLIT & LEAKAGE CONTROLS]")
    print(f"  * Train Pool (Analog Source):     {s['train_pool_size']} products (60%)")
    print(f"  * Calibration Pool:               {s['calibration_pool_size']} products (20%)")
    print(f"  * Untouched Test Holdout:         {s['untouched_test_holdout_size']} products (20%)")
    print(f"  * Total Test Observations:        {s['total_evaluated_points']} product-weeks")
    print("  * Future Data Leakage:            ZERO (No W8-W51 peeking; matched on pre-launch priors)")

    print("\n[FORECAST ACCURACY METRICS ON UNTOUCHED HOLDOUT]")
    print(f"  * WAPE (Weighted Absolute Error): {m['wape_percentage']} (WAPE = {m['wape']})")
    print(f"  * Weighted MAPE (wMAPE):          {m['weighted_mape_percentage']} (wMAPE = {m['weighted_mape']})")
    print(f"  * Naive Category Prior WAPE:      {m['naive_category_wape'] * 100:.2f}%")
    print(f"  * Relative Improvement:           {m['wape_improvement_over_naive']} reduction vs naive")

    print("\n[UNCERTAINTY & CONFORMAL CALIBRATION (80% NOMINAL TARGET)]")
    print(f"  * Uncalibrated P10-P90 Coverage:  {m['uncalibrated_coverage_percentage']} (Mean width: {m['uncalibrated_mean_interval_width']} units)")
    print(f"  * Conformal Expansion q_hat:      {m['conformal_expansion_q_hat']}")
    print(f"  * CALIBRATED P10-P90 Coverage:    {m['calibrated_coverage_percentage']} (Mean width: {m['calibrated_mean_interval_width']} units)")
    print(f"  * Nominal Target Coverage:        {m['nominal_target_coverage']}")

    print("\n[QUANTILE LOSSES (PINBALL LOSS)]")
    print(f"  * Pinball Loss P10 (Uncalibrated): {c['pinball_loss_p10_uncalibrated']}")
    print(f"  * Pinball Loss P10 (Calibrated):   {c['pinball_loss_p10_calibrated']}")
    print(f"  * Pinball Loss P50 (Median):       {c['pinball_loss_p50']}")
    print(f"  * Pinball Loss P90 (Uncalibrated): {c['pinball_loss_p90_uncalibrated']}")
    print(f"  * Pinball Loss P90 (Calibrated):   {c['pinball_loss_p90_calibrated']}")

    print("\n[DIAGNOSTIC EXPLANATION]")
    print(f"  > {c['root_cause_explanation']}")

    print("\n[OFFICIAL EVALUATION DISTINCTION NOTE]")
    print(f"  > {results['distinction_note']}")
    print("=" * 80)

    # Save to processed/evaluation_metrics.json
    try:
        out_dir = backend_dir / "data" / "processed"
        out_dir.mkdir(parents=True, exist_ok=True)
        out_file = out_dir / "evaluation_metrics.json"
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2)
        print(f"\nSaved metrics artifact to: {out_file}\n")
    except Exception as e:
        print(f"Note: Could not save artifact ({e})")

if __name__ == "__main__":
    main()
