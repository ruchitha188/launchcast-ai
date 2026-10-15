# LaunchCast AI

> **Cold-Start New-Product Demand Forecasting and Initial Purchase Inventory Optimization**

LaunchCast AI is an end-to-end retail intelligence web application built for retailers, brand merchandisers, and inventory planners. When launching new products with **zero prior sales history**, traditional time-series methods (ARIMA, Prophet) fail. LaunchCast AI solves this cold-start challenge by predicting the **first 8 weeks of demand** using product attribute similarity, hierarchical category Bayesian priors, and price elasticity, and then directly translating the demand curves into **cost-optimal initial purchase orders and store-level allocations**.

---

## Architecture Overview

```
launchcast-ai/
├── frontend/                     # React + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/           # Card, Badge, Button, EmptyState
│   │   │   └── layout/           # Sidebar, Header, DashboardLayout
│   │   ├── pages/                # 9 Dashboard modules
│   │   │   ├── OverviewPage.tsx
│   │   │   ├── DemandForecastsPage.tsx
│   │   │   ├── NewProductSimulatorPage.tsx
│   │   │   ├── ProductExplorerPage.tsx
│   │   │   ├── InventoryPlannerPage.tsx
│   │   │   ├── StoreAllocationPage.tsx
│   │   │   ├── ModelEvaluationPage.tsx
│   │   │   ├── ExplainabilityPage.tsx
│   │   │   └── DataSourcesPage.tsx
│   │   ├── services/             # FastAPI client wrapper
│   │   ├── types/                # TypeScript interfaces
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── tailwind.config.js        # Professional dark navy theme with cyan/violet accents
│   └── vite.config.ts            # Local dev server on port 3000
│
├── backend/                      # Python FastAPI REST API
│   ├── app/
│   │   ├── core/                 # Config, settings, CORS policies
│   │   ├── schemas/              # Pydantic schemas (Candidate, Forecast, Inventory)
│   │   ├── api/routes/           # Health, forecasts, simulator, inventory, data
│   │   ├── data_processing/      # Feature extraction, attribute embeddings (Stubs)
│   │   ├── ml/                   # Cold-start k-NN, Bayesian priors, LightGBM (Stubs)
│   │   ├── evaluation/           # WAPE, RMSE, pinball loss evaluation (Stubs)
│   │   ├── inventory/            # Newsvendor optimization & safety stock (Stubs)
│   │   └── main.py               # FastAPI entry point
│   ├── requirements.txt
│   └── run.py                    # Uvicorn launcher
├── .gitignore
└── README.md
```

---

## Dashboard Navigation Modules

1. **Overview**: Executive dashboard showing active launch candidates, 8-week horizon targets, configured doors, and end-to-end pipeline architecture.
2. **Demand Forecasts**: Multi-quantile sales trajectories (Weeks 1 to 8; P10/P50/P90) with calendar seasonality adjustments.
3. **New Product Simulator**: Interactive attribute configuration tool (Department, Category, MSRP, Launch Quarter, Brand Tier, Target Doors).
4. **Product Explorer**: Searchable SKU candidate catalog and top-5 nearest-neighbor historical reference products.
5. **Inventory Planner**: Newsvendor critical-fractile purchase order calculations, holding vs. stockout risk balancing, and safety stock sizing.
6. **Store Allocation**: Distribution matrix allocating purchase quantities across flagship, Tier 1, and regional store doors.
7. **Model Evaluation**: Out-of-sample backtesting metrics including Weighted Absolute Percentage Error (WAPE) and prediction interval coverage.
8. **Explainability**: Feature attribution waterwalls (SHAP drivers), category price elasticity curves, and attribute distance weighting.
9. **Data Sources**: Catalog metadata, historical POS transactions, store door hierarchy, and marketing calendar feeds.

---

## Quickstart Guide

### 1. Prerequisites
- **Node.js**: v18+ or v24+
- **Python**: 3.10+ (tested with Python 3.14)

---

### 2. Running the Frontend

Navigate to the `frontend/` directory, install packages, and start Vite:

```powershell
cd frontend
npm install
npm run dev
```

Open your browser at:
`http://localhost:3000`

To test production TypeScript compilation and bundle:
```powershell
npm run build
```

---

### 3. Running the Backend

Navigate to the `backend/` directory, activate the virtual environment, and start FastAPI:

```powershell
cd backend

# Option A: Run directly using the virtual environment
& .venv\Scripts\python.exe run.py

# Option B: Run via Uvicorn
& .venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000 --reload
```

FastAPI will start on `http://localhost:8000`.
- Interactive Swagger documentation: `http://localhost:8000/docs`
- ReDoc documentation: `http://localhost:8000/redoc`
- API Health Status endpoint: `http://localhost:8000/api/v1/health`

---

## Project Phases & Status

- [x] **Phase 1 (Current)**: Foundation Setup
  - Scaffolding of React + TypeScript + Vite frontend with Tailwind CSS.
  - Professional dark navy theme with restrained cyan and violet accents.
  - Complete 9-module responsive dashboard with meaningful empty states.
  - Modular FastAPI backend with routers, schemas, and clean architectural stubs.
  - Live frontend-to-backend health connection ping.
- [ ] **Phase 2 (Upcoming)**: Cold-Start ML Model & Catalog Ingestion
  - Attribute embeddings and category Bayesian prior modeling.
  - Multi-quantile 8-week horizon forecasting (P10/P50/P90).
- [ ] **Phase 3**: Optimization Engine & Allocation
  - Newsvendor critical fractile purchase quantity optimizer.
  - Store-door cluster allocation matrix.
