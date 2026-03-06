import { useState } from "react";
import { PoundSterling, TrendingUp, Users, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { KPICard } from "@/components/dashboard/KPICard";
import { ProfitPoolCard } from "@/components/dashboard/ProfitPoolCard";
import { formatGBPRounded, formatMonthYear } from "@/lib/formatters";
import { calculateProfitPool } from "@/lib/calculations";
import { useMonthlyRevenue } from "@/hooks/useInvoices";
import { useMonthlyHRCosts } from "@/hooks/useTeamMembers";
import { useMonthlySoftwareCosts } from "@/hooks/useSoftwareCosts";
import { useMonthlyTravelCost } from "@/hooks/useTravelCosts";

export function DashboardPage() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(now.getMonth());

  const monthKey = `${selectedYear}-${String(selectedMonthIndex + 1).padStart(2, "0")}`;
  const monthDate = `${monthKey}-01`;

  const { revenueByMonth, loading: revLoading } = useMonthlyRevenue(selectedYear);
  const { monthlyTotals: hrTotals, loading: hrLoading } = useMonthlyHRCosts(selectedYear);
  const { monthlyTotals: softwareTotals, loading: swLoading } = useMonthlySoftwareCosts(selectedYear);
  const { monthlyTotals: travelTotals, loading: trLoading } = useMonthlyTravelCost(selectedYear);

  const loading = revLoading || hrLoading || swLoading || trLoading;

  const revenue = revenueByMonth[monthKey]?.total || 0;
  const revenueByClient = revenueByMonth[monthKey]?.byClient || {};

  // Actuals only for operating costs
  const hrActual = hrTotals[monthKey]?.total || 0;
  const softwareActual = softwareTotals[monthKey]?.isReconciled ? softwareTotals[monthKey].actual : 0;
  const travelActual = travelTotals[monthKey]?.isReconciled ? travelTotals[monthKey].actual : 0;
  const totalCosts = hrActual + softwareActual + travelActual;

  const { grossProfit, profitPool, tarynShare } = calculateProfitPool(revenue, totalCosts);

  const maxRevenue = Math.max(...Object.values(revenueByClient), 1);

  const navigateMonth = (direction: number) => {
    let newMonth = selectedMonthIndex + direction;
    let newYear = selectedYear;
    if (newMonth < 0) { newMonth = 11; newYear--; }
    else if (newMonth > 11) { newMonth = 0; newYear++; }
    setSelectedMonthIndex(newMonth);
    setSelectedYear(newYear);
  };

  return (
    <PageContainer title="Dashboard">
      <div className="space-y-6">
        {/* Period header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigateMonth(-1)} className="p-1 rounded hover:bg-tp-light-grey">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-xl font-semibold text-tp-dark font-heading">
              {formatMonthYear(monthDate)}
            </h2>
            <p className="text-sm text-tp-dark-grey">Financial Overview</p>
          </div>
          <button onClick={() => navigateMonth(1)} className="p-1 rounded hover:bg-tp-light-grey">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {loading && <p className="text-sm text-tp-dark-grey">Loading...</p>}

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KPICard
            title="Total Revenue"
            value={formatGBPRounded(revenue)}
            subtitle="This month"
            icon={PoundSterling}
          />
          <KPICard
            title="Gross Profit"
            value={formatGBPRounded(grossProfit)}
            subtitle={revenue > 0 ? `${Math.round((grossProfit / revenue) * 100)}% margin` : "No revenue"}
            icon={TrendingUp}
          />
          <KPICard
            title="Operating Costs"
            value={formatGBPRounded(totalCosts)}
            subtitle="Actuals only"
            icon={Users}
          />
          <KPICard
            title="Profit Pool"
            value={formatGBPRounded(profitPool)}
            subtitle={`Taryn: ${formatGBPRounded(tarynShare)}`}
            icon={FileText}
          />
        </div>

        {/* Main content grid */}
        <div className="grid gap-6 xl:grid-cols-3">
          {/* Revenue breakdown */}
          <div className="xl:col-span-2 rounded-lg border border-tp-light-grey bg-white">
            <div className="p-6 border-b border-tp-light-grey">
              <h3 className="text-base font-semibold text-tp-dark font-heading">
                Revenue by Client
              </h3>
              <p className="text-sm text-tp-dark-grey mt-1">Monthly breakdown</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {Object.entries(revenueByClient).sort(([,a], [,b]) => b - a).map(
                  ([client, amount]) => (
                    <div key={client} className="flex items-center gap-4">
                      <span className="w-32 text-sm text-tp-dark-grey truncate">
                        {client}
                      </span>
                      <div className="flex-1 h-2 overflow-hidden rounded-full bg-tp-light-grey">
                        <div
                          className="h-full rounded-full bg-tp-blue"
                          style={{
                            width: `${(amount / maxRevenue) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="w-20 text-right text-sm font-medium tabular-nums text-tp-dark">
                        {formatGBPRounded(amount)}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Profit Pool */}
          <ProfitPoolCard
            grossProfit={grossProfit}
            profitPool={profitPool}
            tarynShare={tarynShare}
          />
        </div>

        {/* Costs breakdown */}
        <div className="rounded-lg border border-tp-light-grey bg-white">
          <div className="p-6 border-b border-tp-light-grey">
            <h3 className="text-base font-semibold text-tp-dark font-heading">
              Operating Costs
            </h3>
            <p className="text-sm text-tp-dark-grey mt-1">Monthly expenses breakdown</p>
          </div>
          <div className="p-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-tp-light p-4">
                <p className="text-sm text-tp-dark-grey">HR Costs</p>
                <p className="text-xs text-tp-dark-grey/70 mt-0.5">Actual contractor costs</p>
                <p className="mt-2 text-xl font-semibold text-tp-dark">
                  {formatGBPRounded(hrActual)}
                </p>
              </div>
              <div className="rounded-lg bg-tp-light p-4">
                <p className="text-sm text-tp-dark-grey">Software etc</p>
                <p className="text-xs text-tp-dark-grey/70 mt-0.5">
                  {softwareTotals[monthKey]?.isReconciled ? "Reconciled actuals" : "Not yet reconciled"}
                </p>
                <p className="mt-2 text-xl font-semibold text-tp-dark">
                  {formatGBPRounded(softwareActual)}
                </p>
              </div>
              <div className="rounded-lg bg-tp-light p-4">
                <p className="text-sm text-tp-dark-grey">Travel & Expenses</p>
                <p className="text-xs text-tp-dark-grey/70 mt-0.5">
                  {travelTotals[monthKey]?.isReconciled ? "Actual recorded" : "Not yet recorded"}
                </p>
                <p className="mt-2 text-xl font-semibold text-tp-dark">
                  {formatGBPRounded(travelActual)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
