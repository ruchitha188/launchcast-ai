from fastapi import APIRouter
from typing import List, Dict, Any
from app.ml.explainability import explainability_engine

router = APIRouter(prefix="/explainability", tags=["Explainability"])

@router.get("/uncertain/top10")
def get_top_10_uncertain_skus():
    """
    Ranks the 10 least-confident new product candidates using defensible uncertainty criteria.
    """
    top10 = explainability_engine.get_top_10_least_confident_skus()
    return {
        "status": "success",
        "ranked_count": len(top10),
        "ranking_criteria": [
            "Normalized Prediction Interval Width (P90-P10)/P50",
            "Model Disagreement (Analog Engine vs Hierarchical Category Prior)",
            "Analog Distance (Extrapolation risk from historical cluster density)",
            "MSRP positioning friction"
        ],
        "top_uncertain_skus": top10
    }

@router.get("/{sku_id}")
def get_sku_explanation(sku_id: str) -> Dict[str, Any]:
    """
    Returns feature attributions, analog precedents, and uncertainty breakdown for a specific SKU.
    """
    return explainability_engine.explain_sku(sku_id)
