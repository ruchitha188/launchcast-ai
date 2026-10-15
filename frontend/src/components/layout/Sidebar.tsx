import React from 'react';
import { PageId } from '../../types';
import {
  Sparkles,
  TrendingUp,
  Boxes,
  Database,
  Target,
  LayoutDashboard,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { clsx } from 'clsx';

interface SidebarProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItem {
  id: PageId;
  label: string;
  icon: React.ReactNode;
  activeRoutes: PageId[];
  sectionBreakAfter?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onSelectPage,
  collapsed,
  onToggleCollapse,
}) => {
  // Exactly 6 clean, consolidated navigation destinations
  const navItems: NavItem[] = [
    {
      id: 'wizard',
      label: 'Guided Launch',
      icon: <Sparkles className="w-4 h-4" />,
      activeRoutes: ['wizard'],
    },
    {
      id: 'demand_planning',
      label: 'Demand Planning',
      icon: <TrendingUp className="w-4 h-4" />,
      activeRoutes: ['demand_planning', 'forecasts', 'simulator'],
    },
    {
      id: 'inventory_fulfillment',
      label: 'Inventory & Fulfillment',
      icon: <Boxes className="w-4 h-4" />,
      activeRoutes: ['inventory_fulfillment', 'inventory', 'allocation'],
      sectionBreakAfter: true,
    },
    {
      id: 'data_products',
      label: 'Data & Products',
      icon: <Database className="w-4 h-4" />,
      activeRoutes: ['data_products', 'explorer', 'datasources'],
    },
    {
      id: 'evaluation',
      label: 'Model Validation',
      icon: <Target className="w-4 h-4" />,
      activeRoutes: ['evaluation', 'explainability'],
    },
    {
      id: 'overview',
      label: 'Overview',
      icon: <LayoutDashboard className="w-4 h-4" />,
      activeRoutes: ['overview'],
    },
  ];

  return (
    <aside
      className={clsx(
        'h-screen flex flex-col bg-[#0C1118] border-r border-[#2A3544] transition-all duration-200 z-30 select-none sticky top-0',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Brand Header */}
      <div className="h-14 flex items-center justify-between px-3.5 border-b border-[#2A3544]">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-7 h-7 rounded bg-[#171F2A] border border-[#2A3544] flex items-center justify-center text-[#4DAEAB] flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-xs tracking-tight text-[#E7EDF5] flex items-center gap-1">
                LaunchCast <span className="text-[#4DAEAB] font-bold">AI</span>
              </span>
              <span className="text-[10px] text-[#75859A] font-mono tracking-wider uppercase">
                Demand Engine
              </span>
            </div>
          )}
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded text-[#75859A] hover:text-[#E7EDF5] hover:bg-[#171F2A] transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1">
        {navItems.map((item) => {
          const isActive = item.activeRoutes.includes(currentPage);

          return (
            <React.Fragment key={item.id}>
              <button
                onClick={() => onSelectPage(item.id)}
                title={collapsed ? item.label : undefined}
                className={clsx(
                  'w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-xs transition-colors group relative',
                  isActive
                    ? 'bg-[#171F2A] text-[#E7EDF5] font-semibold border-l-2 border-[#4DAEAB] pl-2'
                    : 'text-[#9AA9BC] hover:text-[#E7EDF5] hover:bg-[#171F2A]/60 font-medium'
                )}
              >
                <span
                  className={clsx(
                    'flex-shrink-0 transition-colors',
                    isActive ? 'text-[#4DAEAB]' : 'text-[#75859A] group-hover:text-[#9AA9BC]'
                  )}
                >
                  {item.icon}
                </span>
                {!collapsed && (
                  <span className="truncate flex-1 text-left">{item.label}</span>
                )}
              </button>

              {item.sectionBreakAfter && (
                <div className="my-2 border-t border-[#2A3544]" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Minimal System Status Footer */}
      <div className="px-3.5 py-2.5 border-t border-[#2A3544] flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#36B98A] flex-shrink-0" />
        {!collapsed && (
          <span className="text-[10px] font-mono text-[#75859A] truncate">
            Engine Active • Port 8000
          </span>
        )}
      </div>
    </aside>
  );
};
