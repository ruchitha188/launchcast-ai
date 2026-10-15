from fastapi import APIRouter, Query
from typing import Dict, Any, Optional
from app.inventory.allocation import allocation_engine
from app.inventory.optimizer import inventory_optimizer
from app.ml.models import forecaster
from app.schemas.common import AllocationRequest

router = APIRouter(prefix="/allocation", tags=["Allocation"])

@router.get("/{sku_id}")
def get_sku_allocation(sku_id: str, total_units: Optional[int] = Query(None, description="Optional override of total units to allocate")) -> Dict[str, Any]:
    """
    Returns store cluster allocation for a specific SKU based on its recommended purchase order
    or optional custom unit count. Reconciles exactly to total_order_quantity.
    """
    if total_units is not None and total_units >= 0:
        total_qty = total_units
    else:
        all_recs = inventory_optimizer.optimize_all_candidates()
        rec = next((r for r in all_recs if r["sku_id"].upper() == sku_id.upper()), None)
        total_qty = rec["recommendation"]["recommended_order_quantity"] if rec else 100
        
    return allocation_engine.allocate_order(sku_id, total_qty)

@router.post("/allocate")
def custom_allocation(req: AllocationRequest) -> Dict[str, Any]:
    """
    Allocates custom total order quantity across store clusters with optional custom weights.
    """
    return allocation_engine.allocate_order(
        sku_id=req.sku_id,
        total_order_quantity=req.total_quantity,
        custom_weights=req.custom_weights
    )
