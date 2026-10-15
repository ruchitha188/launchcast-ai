import React, { useState } from 'react';
import { PageId } from './types';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { QuickLaunchWizardPage } from './pages/QuickLaunchWizardPage';
import { OverviewPage } from './pages/OverviewPage';
import { DemandPlanningPage } from './pages/DemandPlanningPage';
import { InventoryFulfillmentPage } from './pages/InventoryFulfillmentPage';
import { DataProductsPage } from './pages/DataProductsPage';
import { ModelValidationPage } from './pages/ModelValidationPage';

export const App: React.FC = () => {
  // Default to the 3-step Guided Launch Studio for the product demo
  const [currentPage, setCurrentPage] = useState<PageId>('wizard');

  const renderPage = () => {
    switch (currentPage) {
      // 1. Guided Launch (Default demo)
      case 'wizard':
        return <QuickLaunchWizardPage onNavigate={setCurrentPage} />;

      // 2. Demand Planning (Forecasts & Simulator)
      case 'demand_planning':
        return <DemandPlanningPage onNavigate={setCurrentPage} initialTab="portfolio" />;
      case 'forecasts':
        return <DemandPlanningPage onNavigate={setCurrentPage} initialTab="portfolio" />;
      case 'simulator':
        return <DemandPlanningPage onNavigate={setCurrentPage} initialTab="simulator" />;

      // 3. Inventory & Fulfillment (Buy Quantity, Purchase Orders, Store Allocation)
      case 'inventory_fulfillment':
        return <InventoryFulfillmentPage onNavigate={setCurrentPage} initialTab="buy_quantity" />;
      case 'inventory':
        return <InventoryFulfillmentPage onNavigate={setCurrentPage} initialTab="buy_quantity" />;
      case 'allocation':
        return <InventoryFulfillmentPage onNavigate={setCurrentPage} initialTab="store_allocation" />;

      // 4. Data & Products (Product Catalog, Historical Sales, External Sources)
      case 'data_products':
        return <DataProductsPage onNavigate={setCurrentPage} initialTab="catalog" />;
      case 'explorer':
        return <DataProductsPage onNavigate={setCurrentPage} initialTab="catalog" />;
      case 'datasources':
        return <DataProductsPage onNavigate={setCurrentPage} initialTab="external_sources" />;

      // 5. Model Validation (Model Accuracy & Explainability)
      case 'evaluation':
        return <ModelValidationPage onNavigate={setCurrentPage} initialTab="accuracy" />;
      case 'explainability':
        return <ModelValidationPage onNavigate={setCurrentPage} initialTab="explainability" />;

      // 6. Overview (Executive Summary & Metrics)
      case 'overview':
        return <OverviewPage onNavigate={setCurrentPage} />;

      default:
        return <QuickLaunchWizardPage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <DashboardLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </DashboardLayout>
  );
};

export default App;
