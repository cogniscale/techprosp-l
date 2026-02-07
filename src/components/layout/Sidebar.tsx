import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Activity,
  PoundSterling,
  BarChart3,
  Upload,
  Settings,
  TrendingUp,
  Users,
  Monitor,
  Plane,
  Target,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Calendar,
  Award,
  Calculator,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/constants/routes";

interface NavItem {
  name: string;
  href?: string;
  icon: React.ElementType;
  children?: { name: string; href: string; icon: React.ElementType }[];
}

const navigation: NavItem[] = [
  { name: "Dashboard", href: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { name: "Sales Revenue", href: ROUTES.INVOICES, icon: TrendingUp },
  { name: "Activities", href: ROUTES.ACTIVITIES, icon: Activity },
  {
    name: "Costs",
    icon: PoundSterling,
    children: [
      { name: "Team / HR", href: ROUTES.TEAM_HR, icon: Users },
      { name: "Software", href: ROUTES.SOFTWARE, icon: Monitor },
      { name: "Travel", href: ROUTES.TRAVEL, icon: Plane },
    ],
  },
  { name: "P&L", href: ROUTES.PL, icon: TrendingUp },
  { name: "Forecasts", href: ROUTES.FORECASTS, icon: Target },
  { name: "Scenarios", href: ROUTES.SCENARIOS, icon: GitBranch },
  { name: "KPIs", href: ROUTES.KPIS, icon: BarChart3 },
  { name: "Quarterly", href: ROUTES.QUARTERLY, icon: Calendar },
  { name: "Scorecard", href: ROUTES.SCORECARD, icon: Award },
  { name: "CogniScale Fees", href: ROUTES.COGNISCALE_FEES, icon: Calculator },
  { name: "Documents", href: ROUTES.DOCUMENTS, icon: Upload },
];

const secondaryNavigation = [
  { name: "Settings", href: ROUTES.SETTINGS, icon: Settings },
];

export function Sidebar() {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>(["Costs"]);

  const toggleExpanded = (name: string) => {
    setExpandedItems((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const isChildActive = (children: { href: string }[]) =>
    children.some((child) => location.pathname === child.href);

  return (
    <aside className="flex h-full w-56 flex-col bg-tp-dark">
      {/* Logo */}
      <div className="flex h-16 items-center px-6">
        <span className="text-lg font-semibold text-white font-heading">
          TechPros<span className="text-tp-green">.io</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col px-3 py-4">
        <ul className="flex flex-1 flex-col gap-1">
          {navigation.map((item) => (
            <li key={item.name}>
              {item.children ? (
                // Expandable menu item
                <div>
                  <button
                    onClick={() => toggleExpanded(item.name)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isChildActive(item.children)
                        ? "bg-tp-blue/20 text-white"
                        : "text-tp-light-grey hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                    {expandedItems.includes(item.name) ? (
                      <ChevronDown className="ml-auto h-4 w-4" />
                    ) : (
                      <ChevronRight className="ml-auto h-4 w-4" />
                    )}
                  </button>
                  {expandedItems.includes(item.name) && (
                    <ul className="ml-4 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <li key={child.name}>
                          <NavLink
                            to={child.href}
                            className={({ isActive }) =>
                              cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                isActive
                                  ? "bg-tp-blue text-white"
                                  : "text-tp-light-grey hover:bg-white/10 hover:text-white"
                              )
                            }
                          >
                            <child.icon className="h-4 w-4" />
                            {child.name}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                // Regular nav item
                <NavLink
                  to={item.href!}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-tp-blue text-white"
                        : "text-tp-light-grey hover:bg-white/10 hover:text-white"
                    )
                  }
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </NavLink>
              )}
            </li>
          ))}
        </ul>

        {/* Secondary navigation */}
        <div className="mt-auto pt-4 border-t border-white/10">
          <ul className="space-y-1">
            {secondaryNavigation.map((item) => (
              <li key={item.name}>
                <NavLink
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-tp-blue text-white"
                        : "text-tp-light-grey hover:bg-white/10 hover:text-white"
                    )
                  }
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </aside>
  );
}
