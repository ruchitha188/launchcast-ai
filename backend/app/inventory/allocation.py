# LaunchCast AI - Store Cluster Inventory Allocation Engine
# Reconciles National Buy Quantity Across Store Clusters
import math
from typing import List, Dict, Any

class StoreAllocationEngine:
    DEFAULT_CLUSTERS = [
        {
            "cluster_id": "CLUSTER-A",
            "cluster_name": "Tier 1 Flagship Doors",
            "store_count": 25,
            "weight": 0.40,
            "description": "High-velocity flagship and urban marquee doors with highest brand engagement."
        },
        {
            "cluster_id": "CLUSTER-B",
            "cluster_name": "Tier 2 Metro Core",
            "store_count": 55,
            "weight": 0.38,
            "description": "High-traffic suburban and regional shopping mall locations."
        },
        {
            "cluster_id": "CLUSTER-C",
            "cluster_name": "Tier 3 Regional Expansion",
            "store_count": 40,
            "weight": 0.22,
            "description": "Secondary regional doors with conservative inventory depth."
        }
    ]

    def __init__(self):
        pass

    def allocate_order(
        self,
        sku_id: str,
        total_order_quantity: int,
        custom_weights: Dict[str, float] = None
    ) -> Dict[str, Any]:
        """
        Allocates the total order quantity across retail store clusters.
        Guarantees non-negative integer allocations and EXACT reconciliation to total_order_quantity.
        """
        total_order = max(1, int(total_order_quantity))
        clusters = [dict(c) for c in self.DEFAULT_CLUSTERS]

        # Apply custom weights if supplied
        if custom_weights:
            sum_w = sum(custom_weights.get(c["cluster_id"], c["weight"]) for c in clusters)
            if sum_w > 0:
                for c in clusters:
                    c["weight"] = round(custom_weights.get(c["cluster_id"], c["weight"]) / sum_w, 4)

        # Largest Remainder Method (Hare-Niemeyer) for exact integer reconciliation
        proportions = []
        allocated_sum = 0
        allocated_items = []

        for c in clusters:
            exact_units = total_order * c["weight"]
            base_units = int(math.floor(exact_units))
            remainder = exact_units - base_units
            proportions.append({
                "cluster_id": c["cluster_id"],
                "cluster_name": c["cluster_name"],
                "store_count": c["store_count"],
                "weight": c["weight"],
                "base_units": base_units,
                "remainder": remainder,
                "allocated_units": base_units
            })
            allocated_sum += base_units

        # Distribute remaining units to clusters with largest fractional remainders
        shortfall = total_order - allocated_sum
        proportions.sort(key=lambda x: x["remainder"], reverse=True)
        for i in range(shortfall):
            proportions[i]["allocated_units"] += 1

        # Re-sort to original cluster order
        cluster_order = {"CLUSTER-A": 0, "CLUSTER-B": 1, "CLUSTER-C": 2}
        proportions.sort(key=lambda x: cluster_order.get(x["cluster_id"], 99))

        allocations = []
        for p in proportions:
            units = p["allocated_units"]
            per_store = round(units / float(p["store_count"]), 1)
            allocations.append({
                "cluster_id": p["cluster_id"],
                "cluster_name": p["cluster_name"],
                "store_count": p["store_count"],
                "weight_pct": round(p["weight"] * 100.0, 1),
                "allocated_units": units,
                "units_per_store": per_store,
                "allocation_share_pct": round((units / float(total_order)) * 100.0, 1)
            })

        # Exact reconciliation assertion
        reconciled_sum = sum(a["allocated_units"] for a in allocations)
        assert reconciled_sum == total_order, f"Reconciliation error: {reconciled_sum} != {total_order}"

        return {
            "sku_id": sku_id,
            "total_order_quantity": total_order,
            "reconciled_total_quantity": reconciled_sum,
            "reconciliation_status": "Balanced (Zero discrepancy)",
            "clusters_count": len(allocations),
            "cluster_allocations": allocations
        }

allocation_engine = StoreAllocationEngine()
