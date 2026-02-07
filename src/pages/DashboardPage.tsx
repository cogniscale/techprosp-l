import { PoundSterling, TrendingUp, Users, FileText } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { KPICard } from "@/components/dashboard/KPICard";
import { ProfitPoolCard } from "@/components/dashboard/ProfitPoolCard";
import { formatGBPRounded, formatMonthYear } from "@/lib/formatters";
import { calculateProfitPool } from "@/lib/calculations";

// TODO: Replace with real data from Supabase
const MOCK_DATA = {
  month: "2026-01-01",
  revenue: {
    total: 28500,
    byClient: {
      "6sense": 8000,
      Enate: 6000,
      Gilroy: 4500,
      HubbubHR: 3000,
      Amphora: 2000,
      "CogniScale Fixed": 4236,
      "CogniScale Variable": 764,
    },
  },
  costs: {
    total: 18200,
    hr: 15000,
    software: 2200,
    travel: 1000,
  },
  activities: {
    interviews: 8,
    roundtables: 2,
    meetings: 3,
    surveys: 5,
  },
  invoices: {
    pending: 3,
    total: 12,
  },
};

export function DashboardPage() {
  const { grossProfit, profitPool, tarynShare } = calculateProfitPool(
    MOCK_DATA.revenue.total,
    MOCK_DATA.costs.total
  );

  const maxRevenue = Math.max(...Object.values(MOCK_DATA.revenue.byClient));

  return (
    <PageContainer title="Dashboard">
      <div className="space-y-6">
        {/* Period header */}
        <div>
          <h2 className="text-xl font-semibold text-tp-dark font-heading">
            {formatMonthYear(MOCK_DATA.month)}
          </h2>
          <p className="text-sm text-tp-dark-grey">Financial Overview</p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KPICard
            title="Total Revenue"
            value={formatGBPRounded(MOCK_DATA.revenue.total)}
            subtitle="This month"
            icon={PoundSterling}
          />
          <KPICard
            title="Gross Profit"
            value={formatGBPRounded(grossProfit)}
            subtitle={`${Math.round((grossProfit / MOCK_DATA.revenue.total) * 100)}% margin`}
            icon={TrendingUp}
          />
          <KPICard
            title="CogniScale Activities"
            value={String(
              MOCK_DATA.activities.interviews +
                MOCK_DATA.activities.roundtables +
                MOCK_DATA.activities.meetings
            )}
            subtitle={`${MOCK_DATA.activities.surveys} surveys completed`}
            icon={Users}
          />
          <KPICard
            title="Pending Invoices"
            value={String(MOCK_DATA.invoices.pending)}
            subtitle={`of ${MOCK_DATA.invoices.total} total`}
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
                {Object.entries(MOCK_DATA.revenue.byClient).map(
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
                <p className="text-xs text-tp-dark-grey/70 mt-0.5">(incl. 10% bonus)</p>
                <p className="mt-2 text-xl font-semibold text-tp-dark">
                  {formatGBPRounded(MOCK_DATA.costs.hr)}
                </p>
              </div>
              <div className="rounded-lg bg-tp-light p-4">
                <p className="text-sm text-tp-dark-grey">Software etc</p>
                <p className="text-xs text-tp-dark-grey/70 mt-0.5">Tools & subscriptions</p>
                <p className="mt-2 text-xl font-semibold text-tp-dark">
                  {formatGBPRounded(MOCK_DATA.costs.software)}
                </p>
              </div>
              <div className="rounded-lg bg-tp-light p-4">
                <p className="text-sm text-tp-dark-grey">Travel & Expenses</p>
                <p className="text-xs text-tp-dark-grey/70 mt-0.5">Client visits & events</p>
                <p className="mt-2 text-xl font-semibold text-tp-dark">
                  {formatGBPRounded(MOCK_DATA.costs.travel)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
