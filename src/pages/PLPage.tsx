import React, { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus, Settings2, Table2, Calendar } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMonthlyRevenue } from "@/hooks/useInvoices";
import { useMonthlyHRCosts } from "@/hooks/useTeamMembers";
import { useMonthlySoftwareCosts } from "@/hooks/useSoftwareCosts";
import { useMonthlyTravelCost } from "@/hooks/useTravelCosts";
import { useOverheadConfig } from "@/hooks/useOverheadConfig";
import { useMonthlyForecasts } from "@/hooks/useForecasts";
import { useDataRefresh } from "@/context/ChatContext";
import { formatGBP, formatGBPRounded } from "@/lib/formatters";
import { TARYN_SHARE_PERCENT } from "@/lib/calculations";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

type ViewMode = "monthly" | "annual";

export function PLPage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [showOverheadDialog, setShowOverheadDialog] = useState(false);
  const [newOverheadValue, setNewOverheadValue] = useState("");
  const [savingOverhead, setSavingOverhead] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");

  // Data hooks
  const { revenueByMonth, loading: revenueLoading, refetch: refetchRevenue } = useMonthlyRevenue(selectedYear);
  const { monthlyTotals: hrCostsByMonth, loading: hrLoading, refetch: refetchHRCosts } = useMonthlyHRCosts(selectedYear);
  const { monthlyTotals: softwareCostsByMonth, loading: softwareLoading, refetch: refetchSoftwareCosts } = useMonthlySoftwareCosts(selectedYear);
  const { monthlyTotals: travelCostsByMonth, loading: travelLoading, refetch: refetchTravelCosts } = useMonthlyTravelCost(selectedYear);
  const { getOverheadForMonth, updateOverhead, refetch: refetchOverhead } = useOverheadConfig();
  const { monthlyTotals: forecastsByMonth, loading: forecastLoading, refetch: refetchForecasts } = useMonthlyForecasts(selectedYear);

  // Refresh data when chat makes changes
  const handleDataRefresh = useCallback(() => {
    refetchRevenue();
    refetchHRCosts();
    refetchSoftwareCosts();
    refetchTravelCosts();
    refetchOverhead();
    refetchForecasts();
  }, [refetchRevenue, refetchHRCosts, refetchSoftwareCosts, refetchTravelCosts, refetchOverhead, refetchForecasts]);

  useDataRefresh(handleDataRefresh);

  const loading = revenueLoading || hrLoading || softwareLoading || travelLoading || forecastLoading;

  // Current month data
  const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
  const actualRevenue = revenueByMonth[monthKey] || { total: 0, byClient: {} };
  const forecastRevenue = forecastsByMonth[monthKey] || { total: 0, byClient: {} };
  const hrData = hrCostsByMonth[monthKey] || { baseCost: 0, bonus: 0, total: 0, byMember: {} };
  const softwareData = softwareCostsByMonth[monthKey] || { total: 0, byItem: {} };
  const travelCost = travelCostsByMonth[monthKey] || 375;
  const centralOverhead = getOverheadForMonth(monthKey);

  // Calculate costs
  const costs = {
    hr: hrData.total,
    software: softwareData.total,
    travel: travelCost,
  };
  const totalCosts = costs.hr + costs.software + costs.travel;

  // Calculate P&L
  const grossProfit = actualRevenue.total - totalCosts;
  const profitPool = grossProfit - centralOverhead;
  const tarynShare = profitPool > 0 ? profitPool * (TARYN_SHARE_PERCENT / 100) : 0;

  // Forecast P&L (using same costs assumption)
  const forecastGrossProfit = forecastRevenue.total - totalCosts;
  const forecastProfitPool = forecastGrossProfit - centralOverhead;

  // Variance
  const revenueVariance = actualRevenue.total - forecastRevenue.total;
  const profitVariance = profitPool - forecastProfitPool;

  const prevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const grossMargin = actualRevenue.total > 0
    ? Math.round((grossProfit / actualRevenue.total) * 100)
    : 0;

  const handleSaveOverhead = async () => {
    const value = parseFloat(newOverheadValue);
    if (isNaN(value)) return;

    setSavingOverhead(true);
    await updateOverhead(value);
    setSavingOverhead(false);
    setShowOverheadDialog(false);
    setNewOverheadValue("");
  };

  const hasForecast = forecastRevenue.total > 0;

  return (
    <PageContainer title="P&L">
      <div className="space-y-6">
        {/* Header with view toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {viewMode === "monthly" ? (
              <>
                <Button variant="outline" size="icon" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-xl font-semibold text-tp-dark font-heading min-w-[200px] text-center">
                  {MONTHS[selectedMonth]} {selectedYear}
                </h2>
                <Button variant="outline" size="icon" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="icon" onClick={() => setSelectedYear(y => y - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-xl font-semibold text-tp-dark font-heading min-w-[100px] text-center">
                  {selectedYear}
                </h2>
                <Button variant="outline" size="icon" onClick={() => setSelectedYear(y => y + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            <p className="text-sm text-tp-dark-grey">
              {loading ? "Loading..." : viewMode === "monthly" ? (hasForecast ? "Forecast vs Actual" : "No forecast") : "Annual View"}
            </p>
            <div className="flex border border-tp-light-grey rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("monthly")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
                  viewMode === "monthly" ? "bg-tp-blue text-white" : "bg-white text-tp-dark-grey hover:bg-tp-light"
                }`}
              >
                <Calendar className="h-4 w-4" />
                Monthly
              </button>
              <button
                onClick={() => setViewMode("annual")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
                  viewMode === "annual" ? "bg-tp-blue text-white" : "bg-white text-tp-dark-grey hover:bg-tp-light"
                }`}
              >
                <Table2 className="h-4 w-4" />
                Annual
              </button>
            </div>
          </div>
        </div>

        {viewMode === "monthly" ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* P&L Statement */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Profit & Loss Statement</CardTitle>
                  {hasForecast && (
                    <div className="flex gap-4 text-xs">
                      <span className="text-tp-dark-grey">Forecast</span>
                      <span className="text-tp-dark font-medium">Actual</span>
                      <span className="text-tp-blue">Variance</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Revenue Section */}
                <div>
                  <h4 className="text-sm font-semibold text-tp-dark-grey uppercase tracking-wide mb-3">
                    Revenue
                  </h4>
                  <div className="space-y-2">
                    {/* Revenue by client with Forecast | Actual | Variance */}
                    {Object.entries(actualRevenue.byClient).length > 0 || Object.entries(forecastRevenue.byClient).length > 0 ? (
                      // Get all unique clients from both forecast and actual
                      [...new Set([
                        ...Object.keys(actualRevenue.byClient),
                        ...Object.keys(forecastRevenue.byClient)
                      ])].sort().map((client) => {
                        const actual = actualRevenue.byClient[client] || 0;
                        const forecast = forecastRevenue.byClient[client] || 0;
                        const variance = actual - forecast;

                        return (
                          <div key={client} className="flex justify-between items-center py-2 border-b border-tp-light-grey/50 last:border-0">
                            <span className="text-sm text-tp-dark">{client}</span>
                            <div className="flex gap-4 tabular-nums">
                              {hasForecast && (
                                <span className="text-sm text-tp-dark-grey w-20 text-right">
                                  {formatGBP(forecast)}
                                </span>
                              )}
                              <span className="text-sm font-medium text-tp-dark w-20 text-right">
                                {formatGBP(actual)}
                              </span>
                              {hasForecast && (
                                <span className={`text-sm w-20 text-right ${variance >= 0 ? "text-tp-green" : "text-error"}`}>
                                  {variance >= 0 ? "+" : ""}{formatGBP(variance)}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-tp-dark-grey py-2">
                        No revenue recognized this month
                      </p>
                    )}
                    <div className="flex justify-between items-center py-2 bg-tp-light rounded-lg px-3 mt-2">
                      <span className="text-sm font-semibold text-tp-dark">Total Revenue</span>
                      <div className="flex gap-4 tabular-nums">
                        {hasForecast && (
                          <span className="text-sm font-medium text-tp-dark-grey w-20 text-right">
                            {formatGBP(forecastRevenue.total)}
                          </span>
                        )}
                        <span className="text-base font-bold text-tp-dark w-20 text-right">
                          {formatGBP(actualRevenue.total)}
                        </span>
                        {hasForecast && (
                          <span className={`text-sm font-medium w-20 text-right ${revenueVariance >= 0 ? "text-tp-green" : "text-error"}`}>
                            {revenueVariance >= 0 ? "+" : ""}{formatGBP(revenueVariance)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Costs Section */}
                <div>
                  <h4 className="text-sm font-semibold text-tp-dark-grey uppercase tracking-wide mb-3">
                    Operating Costs
                  </h4>
                  <div className="space-y-2">
                    {/* HR Costs breakdown by team member */}
                    {Object.entries(hrData.byMember).length > 0 ? (
                      Object.entries(hrData.byMember)
                        .sort(([, a], [, b]) => (b.base + b.bonus) - (a.base + a.bonus))
                        .map(([memberName, data]) => (
                          <div key={memberName} className="flex justify-between items-center py-2 border-b border-tp-light-grey/50">
                            <span className="text-sm text-tp-dark">
                              {memberName}
                              {data.bonus > 0 && <span className="text-tp-green text-xs ml-1">(+{formatGBP(data.bonus)} bonus)</span>}
                            </span>
                            <span className="text-sm font-medium text-tp-dark tabular-nums">
                              ({formatGBP(data.base + data.bonus)})
                            </span>
                          </div>
                        ))
                    ) : (
                      <div className="flex justify-between items-center py-2 border-b border-tp-light-grey/50">
                        <span className="text-sm text-tp-dark">HR Costs</span>
                        <span className="text-sm font-medium text-tp-dark tabular-nums">
                          ({formatGBP(costs.hr)})
                        </span>
                      </div>
                    )}
                    {/* Software costs by category */}
                    {softwareData.byCategory && Object.keys(softwareData.byCategory).length > 0 ? (
                      Object.entries(softwareData.byCategory)
                        .sort(([a], [b]) => a === "Software etc" ? 1 : b === "Software etc" ? -1 : a.localeCompare(b))
                        .map(([category, amount]) => (
                          <div key={category} className="flex justify-between items-center py-2 border-b border-tp-light-grey/50">
                            <span className="text-sm text-tp-dark">{category}</span>
                            <span className="text-sm font-medium text-tp-dark tabular-nums">
                              ({formatGBP(amount)})
                            </span>
                          </div>
                        ))
                    ) : (
                      <div className="flex justify-between items-center py-2 border-b border-tp-light-grey/50">
                        <span className="text-sm text-tp-dark">Software etc</span>
                        <span className="text-sm font-medium text-tp-dark tabular-nums">
                          ({formatGBP(costs.software)})
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-2 border-b border-tp-light-grey/50">
                      <span className="text-sm text-tp-dark">Travel & Expenses</span>
                      <span className="text-sm font-medium text-tp-dark tabular-nums">
                        ({formatGBP(costs.travel)})
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 bg-tp-light rounded-lg px-3 mt-2">
                      <span className="text-sm font-semibold text-tp-dark">Total Costs</span>
                      <span className="text-base font-bold text-tp-dark tabular-nums">
                        ({formatGBP(totalCosts)})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Profit Calculations */}
                <div className="border-t-2 border-tp-dark pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-tp-dark">Gross Profit</span>
                    <div className="flex gap-4 tabular-nums">
                      {hasForecast && (
                        <span className="text-sm text-tp-dark-grey w-20 text-right">
                          {formatGBP(forecastGrossProfit)}
                        </span>
                      )}
                      <span className={`text-lg font-bold w-20 text-right ${grossProfit >= 0 ? "text-tp-green" : "text-error"}`}>
                        {formatGBP(grossProfit)}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-2 bg-tp-light rounded-lg px-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-tp-dark-grey">Less: Central Overhead</span>
                      <button
                        onClick={() => {
                          setNewOverheadValue(centralOverhead.toString());
                          setShowOverheadDialog(true);
                        }}
                        className="p-1 hover:bg-white rounded"
                      >
                        <Settings2 className="h-3 w-3 text-tp-dark-grey" />
                      </button>
                    </div>
                    <span className="text-sm font-medium text-tp-dark-grey tabular-nums">
                      ({formatGBP(centralOverhead)})
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-base font-bold text-tp-dark">Profit Pool</span>
                    <div className="flex gap-4 tabular-nums">
                      {hasForecast && (
                        <span className="text-sm text-tp-dark-grey w-20 text-right">
                          {formatGBP(forecastProfitPool)}
                        </span>
                      )}
                      <span className={`text-xl font-bold w-20 text-right ${profitPool >= 0 ? "text-tp-dark" : "text-error"}`}>
                        {formatGBP(profitPool)}
                      </span>
                      {hasForecast && (
                        <span className={`text-sm font-medium w-20 text-right ${profitVariance >= 0 ? "text-tp-green" : "text-error"}`}>
                          {profitVariance >= 0 ? "+" : ""}{formatGBP(profitVariance)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-3 bg-tp-green/10 rounded-lg px-3">
                    <span className="text-sm font-medium text-tp-dark">
                      Taryn's Share ({TARYN_SHARE_PERCENT}%)
                    </span>
                    <span className="text-lg font-bold text-tp-green tabular-nums">
                      {formatGBP(tarynShare)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Cards */}
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-tp-dark-grey mb-1">Gross Margin</p>
                  <p className="text-3xl font-bold text-tp-dark">{grossMargin}%</p>
                  <div className="flex items-center justify-center gap-1 mt-2">
                    {grossMargin > 30 ? (
                      <TrendingUp className="h-4 w-4 text-tp-green" />
                    ) : grossMargin < 20 ? (
                      <TrendingDown className="h-4 w-4 text-error" />
                    ) : (
                      <Minus className="h-4 w-4 text-tp-dark-grey" />
                    )}
                    <span className={`text-xs ${grossMargin > 30 ? "text-tp-green" : grossMargin < 20 ? "text-error" : "text-tp-dark-grey"}`}>
                      {grossMargin > 30 ? "Healthy" : grossMargin < 20 ? "Below target" : "On track"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <p className="text-sm text-tp-dark-grey">Revenue</p>
                  <p className="text-xl font-bold text-tp-dark">{formatGBPRounded(actualRevenue.total)}</p>
                  {hasForecast && (
                    <p className={`text-xs ${revenueVariance >= 0 ? "text-tp-green" : "text-error"}`}>
                      {revenueVariance >= 0 ? "+" : ""}{formatGBP(revenueVariance)} vs forecast
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-tp-dark-grey">Costs</p>
                  <p className="text-xl font-bold text-tp-dark">{formatGBPRounded(totalCosts)}</p>
                </div>
                <div className="pt-4 border-t border-tp-light-grey">
                  <p className="text-sm text-tp-dark-grey">Net to Tim</p>
                  <p className="text-xl font-bold text-tp-dark">
                    {formatGBPRounded(profitPool - tarynShare)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Revenue Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(actualRevenue.byClient)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([client, amount]) => (
                      <div key={client} className="flex items-center gap-2">
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-tp-dark-grey truncate">{client}</span>
                            <span className="text-tp-dark font-medium">
                              {actualRevenue.total > 0 ? Math.round((amount / actualRevenue.total) * 100) : 0}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-tp-light-grey rounded-full overflow-hidden">
                            <div
                              className="h-full bg-tp-blue rounded-full"
                              style={{ width: `${actualRevenue.total > 0 ? (amount / actualRevenue.total) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        ) : (
        /* Annual Spreadsheet View */
        <AnnualPLSpreadsheet
          selectedYear={selectedYear}
          revenueByMonth={revenueByMonth}
          forecastsByMonth={forecastsByMonth}
          hrCostsByMonth={hrCostsByMonth}
          softwareCostsByMonth={softwareCostsByMonth}
          travelCostsByMonth={travelCostsByMonth}
          getOverheadForMonth={getOverheadForMonth}
        />
        )}
      </div>

      {/* Overhead Config Dialog */}
      <Dialog open={showOverheadDialog} onOpenChange={setShowOverheadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Central Overhead</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-tp-dark-grey mb-4">
              Central overhead includes loans, director salaries, professional services, and bank fees.
            </p>
            <div>
              <label className="text-sm font-medium text-tp-dark">Monthly Amount (£)</label>
              <Input
                type="number"
                step="0.01"
                value={newOverheadValue}
                onChange={(e) => setNewOverheadValue(e.target.value)}
                placeholder="4200.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOverheadDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveOverhead} disabled={savingOverhead}>
              {savingOverhead ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

// Annual P&L Spreadsheet Component with Tgt/Act columns
interface AnnualPLSpreadsheetProps {
  selectedYear: number;
  revenueByMonth: Record<string, { total: number; byClient: Record<string, number> }>;
  forecastsByMonth: Record<string, { total: number; byClient: Record<string, number> }>;
  hrCostsByMonth: Record<string, { baseCost: number; bonus: number; total: number; byMember: Record<string, { base: number; bonus: number }> }>;
  softwareCostsByMonth: Record<string, { total: number; budget: number; actual: number; isReconciled: boolean; byItem: Record<string, number>; byCategory: Record<string, number> }>;
  travelCostsByMonth: Record<string, { total: number; budget: number; actual: number; isReconciled: boolean }>;
  getOverheadForMonth: (monthKey: string) => number;
}

function AnnualPLSpreadsheet({
  selectedYear,
  revenueByMonth,
  forecastsByMonth,
  hrCostsByMonth,
  softwareCostsByMonth,
  travelCostsByMonth,
  getOverheadForMonth,
}: AnnualPLSpreadsheetProps) {
  // Get all unique clients from all months
  const allClients = new Set<string>();
  MONTHS_SHORT.forEach((_, i) => {
    const monthKey = `${selectedYear}-${String(i + 1).padStart(2, "0")}`;
    const revenue = revenueByMonth[monthKey];
    const forecast = forecastsByMonth[monthKey];
    if (revenue?.byClient) Object.keys(revenue.byClient).forEach(c => allClients.add(c));
    if (forecast?.byClient) Object.keys(forecast.byClient).forEach(c => allClients.add(c));
  });
  const clients = Array.from(allClients).sort();

  // Get all unique team members from all months
  const allMembers = new Set<string>();
  MONTHS_SHORT.forEach((_, i) => {
    const monthKey = `${selectedYear}-${String(i + 1).padStart(2, "0")}`;
    const hr = hrCostsByMonth[monthKey];
    if (hr?.byMember) Object.keys(hr.byMember).forEach(m => allMembers.add(m));
  });
  const teamMembers = Array.from(allMembers).sort();

  // Helper to get values for a month
  const getMonthData = (monthIndex: number) => {
    const monthKey = `${selectedYear}-${String(monthIndex + 1).padStart(2, "0")}`;
    const revenue = revenueByMonth[monthKey] || { total: 0, byClient: {} };
    const forecast = forecastsByMonth[monthKey] || { total: 0, byClient: {} };
    const hr = hrCostsByMonth[monthKey] || { total: 0, byMember: {} };
    const software = softwareCostsByMonth[monthKey] || { total: 0 };
    const travel = travelCostsByMonth[monthKey] || 375;
    const overhead = getOverheadForMonth(monthKey);

    const totalCosts = hr.total + software.total + travel;
    const grossProfit = revenue.total - totalCosts;
    const forecastGrossProfit = forecast.total - totalCosts;
    const profitPool = grossProfit - overhead;
    const forecastProfitPool = forecastGrossProfit - overhead;
    const tarynShare = profitPool > 0 ? profitPool * (TARYN_SHARE_PERCENT / 100) : 0;
    const forecastTarynShare = forecastProfitPool > 0 ? forecastProfitPool * (TARYN_SHARE_PERCENT / 100) : 0;

    return {
      revenue, forecast, hr, software: software.total, travel, overhead,
      totalCosts, grossProfit, forecastGrossProfit, profitPool, forecastProfitPool, tarynShare, forecastTarynShare
    };
  };

  // Calculate YTD totals
  const ytdData = MONTHS_SHORT.reduce((acc, _, i) => {
    const data = getMonthData(i);
    const monthKey = `${selectedYear}-${String(i + 1).padStart(2, "0")}`;
    const softwareData = softwareCostsByMonth[monthKey] || { budget: 0, actual: 0, isReconciled: false };
    const travelData = travelCostsByMonth[monthKey] || { budget: 375, actual: 0, isReconciled: false };

    // Check if month is fully reconciled (all cost types have actuals)
    const isMonthReconciled = softwareData.isReconciled && travelData.isReconciled;

    // Calculate actual costs only for reconciled months
    const actualCostsForMonth = isMonthReconciled
      ? data.hr.total + softwareData.actual + travelData.actual
      : 0;
    const actualGrossProfitForMonth = isMonthReconciled
      ? data.revenue.total - actualCostsForMonth
      : 0;
    const actualProfitPoolForMonth = isMonthReconciled
      ? actualGrossProfitForMonth - data.overhead
      : 0;
    const actualTarynShareForMonth = isMonthReconciled && actualProfitPoolForMonth > 0
      ? actualProfitPoolForMonth * (TARYN_SHARE_PERCENT / 100)
      : 0;

    return {
      revenue: acc.revenue + data.revenue.total,
      forecast: acc.forecast + data.forecast.total,
      hrCost: acc.hrCost + data.hr.total,
      software: acc.software + data.software,
      softwareBudget: acc.softwareBudget + softwareData.budget,
      softwareActual: acc.softwareActual + (softwareData.isReconciled ? softwareData.actual : 0),
      travel: acc.travel + data.travel,
      travelBudget: acc.travelBudget + travelData.budget,
      travelActual: acc.travelActual + (travelData.isReconciled ? travelData.actual : 0),
      overhead: acc.overhead + data.overhead,
      totalCosts: acc.totalCosts + data.totalCosts,
      totalCostsBudget: acc.totalCostsBudget + data.hr.total + softwareData.budget + travelData.budget,
      totalCostsActual: acc.totalCostsActual + (isMonthReconciled ? actualCostsForMonth : 0),
      grossProfit: acc.grossProfit + data.grossProfit,
      forecastGrossProfit: acc.forecastGrossProfit + data.forecastGrossProfit,
      grossProfitActual: acc.grossProfitActual + actualGrossProfitForMonth,
      profitPool: acc.profitPool + data.profitPool,
      forecastProfitPool: acc.forecastProfitPool + data.forecastProfitPool,
      profitPoolActual: acc.profitPoolActual + actualProfitPoolForMonth,
      tarynShare: acc.tarynShare + data.tarynShare,
      forecastTarynShare: acc.forecastTarynShare + data.forecastTarynShare,
      tarynShareActual: acc.tarynShareActual + actualTarynShareForMonth,
      reconciledMonths: acc.reconciledMonths + (isMonthReconciled ? 1 : 0),
    };
  }, { revenue: 0, forecast: 0, hrCost: 0, software: 0, softwareBudget: 0, softwareActual: 0, travel: 0, travelBudget: 0, travelActual: 0, overhead: 0, totalCosts: 0, totalCostsBudget: 0, totalCostsActual: 0, grossProfit: 0, forecastGrossProfit: 0, grossProfitActual: 0, profitPool: 0, forecastProfitPool: 0, profitPoolActual: 0, tarynShare: 0, forecastTarynShare: 0, tarynShareActual: 0, reconciledMonths: 0 });

  const renderCell = (value: number, isNegative = false, highlight = false, muted = false) => {
    if (value === 0 && !highlight) return <span className="text-tp-light-grey">-</span>;
    const formatted = formatGBP(Math.abs(value)).replace("£", "");
    return (
      <span className={`text-xs tabular-nums ${highlight ? "font-semibold" : ""} ${muted ? "text-tp-dark-grey" : ""} ${!muted && !isNegative && value < 0 ? "text-error" : ""}`}>
        {isNegative ? `(${formatted})` : formatted}
      </span>
    );
  };

  // Number of data columns: 12 months * 2 (Tgt/Act) + 2 (YTD Tgt/Act)
  const totalCols = 12 * 2 + 2 + 1; // +1 for row label

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Annual P&L - {selectedYear}</CardTitle>
          <div className="flex gap-4 text-xs">
            <span className="text-tp-dark-grey">Tgt = Target (Forecast)</span>
            <span className="text-tp-blue font-medium">Act = Actual</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              {/* Month headers */}
              <tr className="border-b border-tp-light-grey">
                <th rowSpan={2} className="text-left py-2 pr-4 font-semibold text-tp-dark min-w-[160px] sticky left-0 bg-white align-bottom"></th>
                {MONTHS_SHORT.map((month) => (
                  <th key={month} colSpan={2} className="text-center py-1 px-1 font-semibold text-tp-dark min-w-[90px] border-b border-tp-light-grey/50">
                    {month}
                  </th>
                ))}
                <th colSpan={2} className="text-center py-1 px-1 font-semibold text-tp-dark bg-tp-light min-w-[90px] border-b border-tp-light-grey/50">YTD</th>
              </tr>
              {/* Tgt/Act sub-headers */}
              <tr className="border-b-2 border-tp-dark">
                {MONTHS_SHORT.map((month) => (
                  <React.Fragment key={`${month}-sub`}>
                    <th className="text-center py-1 px-1 text-[10px] font-normal text-tp-dark-grey min-w-[45px]">Tgt</th>
                    <th className="text-center py-1 px-1 text-[10px] font-normal text-tp-blue min-w-[45px]">Act</th>
                  </React.Fragment>
                ))}
                <th className="text-center py-1 px-1 text-[10px] font-normal text-tp-dark-grey bg-tp-light min-w-[45px]">Tgt</th>
                <th className="text-center py-1 px-1 text-[10px] font-normal text-tp-blue bg-tp-light min-w-[45px]">Act</th>
              </tr>
            </thead>
            <tbody>
              {/* Revenue Section */}
              <tr>
                <td colSpan={totalCols} className="pt-4 pb-1 text-xs font-semibold text-tp-dark-grey uppercase tracking-wide">
                  Revenue
                </td>
              </tr>
              {clients.map((client) => (
                <tr key={client} className="border-b border-tp-light-grey/30 hover:bg-tp-light/30">
                  <td className="py-1.5 pr-4 text-tp-dark sticky left-0 bg-white text-xs">{client}</td>
                  {MONTHS_SHORT.map((_, i) => {
                    const data = getMonthData(i);
                    const tgt = data.forecast.byClient[client] || 0;
                    const act = data.revenue.byClient[client] || 0;
                    return (
                      <React.Fragment key={i}>
                        <td className="py-1 px-1 text-center">{renderCell(tgt, false, false, true)}</td>
                        <td className="py-1 px-1 text-center">{renderCell(act)}</td>
                      </React.Fragment>
                    );
                  })}
                  <td className="py-1 px-1 text-center bg-tp-light/50">
                    {renderCell(MONTHS_SHORT.reduce((sum, _, i) => sum + (getMonthData(i).forecast.byClient[client] || 0), 0), false, false, true)}
                  </td>
                  <td className="py-1 px-1 text-center bg-tp-light/50">
                    {renderCell(MONTHS_SHORT.reduce((sum, _, i) => sum + (getMonthData(i).revenue.byClient[client] || 0), 0))}
                  </td>
                </tr>
              ))}
              <tr className="border-b-2 border-tp-dark bg-tp-light/50 font-semibold">
                <td className="py-2 pr-4 text-tp-dark sticky left-0 bg-tp-light/50 text-xs">Total Revenue</td>
                {MONTHS_SHORT.map((_, i) => {
                  const data = getMonthData(i);
                  return (
                    <React.Fragment key={i}>
                      <td className="py-1.5 px-1 text-center">{renderCell(data.forecast.total, false, true, true)}</td>
                      <td className="py-1.5 px-1 text-center">{renderCell(data.revenue.total, false, true)}</td>
                    </React.Fragment>
                  );
                })}
                <td className="py-1.5 px-1 text-center bg-tp-light">{renderCell(ytdData.forecast, false, true, true)}</td>
                <td className="py-1.5 px-1 text-center bg-tp-light">{renderCell(ytdData.revenue, false, true)}</td>
              </tr>

              {/* Costs Section */}
              <tr>
                <td colSpan={totalCols} className="pt-4 pb-1 text-xs font-semibold text-tp-dark-grey uppercase tracking-wide">
                  Operating Costs
                </td>
              </tr>
              {/* HR Costs by team member */}
              {teamMembers.map((member) => (
                <tr key={member} className="border-b border-tp-light-grey/30 hover:bg-tp-light/30">
                  <td className="py-1.5 pr-4 text-tp-dark sticky left-0 bg-white text-xs">{member}</td>
                  {MONTHS_SHORT.map((_, i) => {
                    const data = getMonthData(i);
                    const memberData = data.hr.byMember[member];
                    const value = memberData ? memberData.base + memberData.bonus : 0;
                    // For costs, Tgt = same as Act (no separate cost forecast)
                    return (
                      <React.Fragment key={i}>
                        <td className="py-1 px-1 text-center">{renderCell(value, true, false, true)}</td>
                        <td className="py-1 px-1 text-center">{renderCell(value, true)}</td>
                      </React.Fragment>
                    );
                  })}
                  <td className="py-1 px-1 text-center bg-tp-light/50">
                    {renderCell(MONTHS_SHORT.reduce((sum, _, i) => {
                      const memberData = getMonthData(i).hr.byMember[member];
                      return sum + (memberData ? memberData.base + memberData.bonus : 0);
                    }, 0), true, false, true)}
                  </td>
                  <td className="py-1 px-1 text-center bg-tp-light/50">
                    {renderCell(MONTHS_SHORT.reduce((sum, _, i) => {
                      const memberData = getMonthData(i).hr.byMember[member];
                      return sum + (memberData ? memberData.base + memberData.bonus : 0);
                    }, 0), true)}
                  </td>
                </tr>
              ))}
              <tr className="border-b border-tp-light-grey/50 bg-tp-light/30">
                <td className="py-1.5 pr-4 text-tp-dark font-medium sticky left-0 bg-tp-light/30 text-xs">Subtotal HR</td>
                {MONTHS_SHORT.map((_, i) => (
                  <React.Fragment key={i}>
                    <td className="py-1 px-1 text-center">{renderCell(getMonthData(i).hr.total, true, false, true)}</td>
                    <td className="py-1 px-1 text-center">{renderCell(getMonthData(i).hr.total, true)}</td>
                  </React.Fragment>
                ))}
                <td className="py-1 px-1 text-center bg-tp-light">{renderCell(ytdData.hrCost, true, false, true)}</td>
                <td className="py-1 px-1 text-center bg-tp-light">{renderCell(ytdData.hrCost, true)}</td>
              </tr>
              {/* Software costs by category */}
              {(() => {
                // Collect all unique categories across all months
                const allCategories = new Set<string>();
                MONTHS_SHORT.forEach((_, i) => {
                  const monthKey = `${selectedYear}-${String(i + 1).padStart(2, "0")}`;
                  const softwareData = softwareCostsByMonth[monthKey];
                  if (softwareData?.byCategory) {
                    Object.keys(softwareData.byCategory).forEach(cat => allCategories.add(cat));
                  }
                });
                // Sort categories: specific ones first, "Software etc" last
                const categories = Array.from(allCategories).sort((a, b) =>
                  a === "Software etc" ? 1 : b === "Software etc" ? -1 : a.localeCompare(b)
                );
                // If no categories, show single "Software etc" row
                if (categories.length === 0) categories.push("Software etc");

                return categories.map((category) => (
                  <tr key={category} className="border-b border-tp-light-grey/30 hover:bg-tp-light/30">
                    <td className="py-1.5 pr-4 text-tp-dark sticky left-0 bg-white text-xs">{category}</td>
                    {MONTHS_SHORT.map((_, i) => {
                      const monthKey = `${selectedYear}-${String(i + 1).padStart(2, "0")}`;
                      const softwareData = softwareCostsByMonth[monthKey] || { budget: 0, actual: 0, isReconciled: false, byCategory: {} };
                      const categoryAmount = softwareData.byCategory?.[category] || 0;
                      // For budget, use same amount (no separate category budgets)
                      return (
                        <React.Fragment key={i}>
                          <td className="py-1 px-1 text-center">{renderCell(categoryAmount, true, false, true)}</td>
                          <td className="py-1 px-1 text-center">{softwareData.isReconciled ? renderCell(categoryAmount, true) : <span className="text-tp-light-grey">-</span>}</td>
                        </React.Fragment>
                      );
                    })}
                    <td className="py-1 px-1 text-center bg-tp-light/50">
                      {renderCell(MONTHS_SHORT.reduce((sum, _, i) => {
                        const monthKey = `${selectedYear}-${String(i + 1).padStart(2, "0")}`;
                        const softwareData = softwareCostsByMonth[monthKey];
                        return sum + (softwareData?.byCategory?.[category] || 0);
                      }, 0), true, false, true)}
                    </td>
                    <td className="py-1 px-1 text-center bg-tp-light/50">
                      {renderCell(MONTHS_SHORT.reduce((sum, _, i) => {
                        const monthKey = `${selectedYear}-${String(i + 1).padStart(2, "0")}`;
                        const softwareData = softwareCostsByMonth[monthKey];
                        return sum + (softwareData?.isReconciled && softwareData?.byCategory?.[category] ? softwareData.byCategory[category] : 0);
                      }, 0), true)}
                    </td>
                  </tr>
                ));
              })()}
              <tr className="border-b border-tp-light-grey/30 hover:bg-tp-light/30">
                <td className="py-1.5 pr-4 text-tp-dark sticky left-0 bg-white text-xs">Travel & Expenses</td>
                {MONTHS_SHORT.map((_, i) => {
                  const monthKey = `${selectedYear}-${String(i + 1).padStart(2, "0")}`;
                  const travelData = travelCostsByMonth[monthKey] || { budget: 375, actual: 0, isReconciled: false };
                  return (
                    <React.Fragment key={i}>
                      <td className="py-1 px-1 text-center">{renderCell(travelData.budget, true, false, true)}</td>
                      <td className="py-1 px-1 text-center">{travelData.isReconciled ? renderCell(travelData.actual, true) : <span className="text-tp-light-grey">-</span>}</td>
                    </React.Fragment>
                  );
                })}
                <td className="py-1 px-1 text-center bg-tp-light/50">{renderCell(ytdData.travelBudget, true, false, true)}</td>
                <td className="py-1 px-1 text-center bg-tp-light/50">{renderCell(ytdData.travelActual, true)}</td>
              </tr>
              <tr className="border-b-2 border-tp-dark bg-tp-light/50 font-semibold">
                <td className="py-2 pr-4 text-tp-dark sticky left-0 bg-tp-light/50 text-xs">Total Costs</td>
                {MONTHS_SHORT.map((_, i) => {
                  const monthKey = `${selectedYear}-${String(i + 1).padStart(2, "0")}`;
                  const softwareData = softwareCostsByMonth[monthKey] || { budget: 0, actual: 0, isReconciled: false };
                  const travelData = travelCostsByMonth[monthKey] || { budget: 375, actual: 0, isReconciled: false };
                  const hrData = getMonthData(i).hr;
                  const budgetTotal = hrData.total + softwareData.budget + travelData.budget;
                  const isReconciled = softwareData.isReconciled && travelData.isReconciled;
                  const actualTotal = isReconciled ? hrData.total + softwareData.actual + travelData.actual : 0;
                  return (
                    <React.Fragment key={i}>
                      <td className="py-1.5 px-1 text-center">{renderCell(budgetTotal, true, true, true)}</td>
                      <td className="py-1.5 px-1 text-center">{isReconciled ? renderCell(actualTotal, true, true) : <span className="text-tp-light-grey">-</span>}</td>
                    </React.Fragment>
                  );
                })}
                <td className="py-1.5 px-1 text-center bg-tp-light">{renderCell(ytdData.totalCostsBudget, true, true, true)}</td>
                <td className="py-1.5 px-1 text-center bg-tp-light">{ytdData.reconciledMonths > 0 ? renderCell(ytdData.totalCostsActual, true, true) : <span className="text-tp-light-grey">-</span>}</td>
              </tr>

              {/* Profit Section */}
              <tr>
                <td colSpan={totalCols} className="pt-4 pb-1 text-xs font-semibold text-tp-dark-grey uppercase tracking-wide">
                  Profit
                </td>
              </tr>
              <tr className="border-b border-tp-light-grey/30 bg-tp-green/5">
                <td className="py-2 pr-4 text-tp-dark font-medium sticky left-0 bg-tp-green/5 text-xs">Gross Profit</td>
                {MONTHS_SHORT.map((_, i) => {
                  const data = getMonthData(i);
                  const monthKey = `${selectedYear}-${String(i + 1).padStart(2, "0")}`;
                  const softwareData = softwareCostsByMonth[monthKey] || { budget: 0, actual: 0, isReconciled: false };
                  const travelData = travelCostsByMonth[monthKey] || { budget: 375, actual: 0, isReconciled: false };
                  const isReconciled = softwareData.isReconciled && travelData.isReconciled;
                  const actualCosts = isReconciled ? data.hr.total + softwareData.actual + travelData.actual : 0;
                  const actualGrossProfit = isReconciled ? data.revenue.total - actualCosts : 0;
                  const budgetCosts = data.hr.total + softwareData.budget + travelData.budget;
                  const budgetGrossProfit = data.forecast.total - budgetCosts;
                  return (
                    <React.Fragment key={i}>
                      <td className="py-1.5 px-1 text-center text-tp-dark-grey">{renderCell(budgetGrossProfit, false, false, true)}</td>
                      <td className={`py-1.5 px-1 text-center font-medium ${!isReconciled ? "" : actualGrossProfit >= 0 ? "text-tp-green" : "text-error"}`}>
                        {isReconciled ? renderCell(actualGrossProfit) : <span className="text-tp-light-grey">-</span>}
                      </td>
                    </React.Fragment>
                  );
                })}
                <td className="py-1.5 px-1 text-center bg-tp-light text-tp-dark-grey">{renderCell(ytdData.forecastGrossProfit, false, false, true)}</td>
                <td className={`py-1.5 px-1 text-center font-semibold bg-tp-light ${ytdData.reconciledMonths === 0 ? "" : ytdData.grossProfitActual >= 0 ? "text-tp-green" : "text-error"}`}>
                  {ytdData.reconciledMonths > 0 ? renderCell(ytdData.grossProfitActual) : <span className="text-tp-light-grey">-</span>}
                </td>
              </tr>
              <tr className="border-b border-tp-light-grey/30 hover:bg-tp-light/30">
                <td className="py-1.5 pr-4 text-tp-dark-grey sticky left-0 bg-white text-xs">Less: Central Overhead</td>
                {MONTHS_SHORT.map((_, i) => (
                  <React.Fragment key={i}>
                    <td className="py-1 px-1 text-center">{renderCell(getMonthData(i).overhead, true, false, true)}</td>
                    <td className="py-1 px-1 text-center">{renderCell(getMonthData(i).overhead, true)}</td>
                  </React.Fragment>
                ))}
                <td className="py-1 px-1 text-center bg-tp-light/50">{renderCell(ytdData.overhead, true, false, true)}</td>
                <td className="py-1 px-1 text-center bg-tp-light/50">{renderCell(ytdData.overhead, true)}</td>
              </tr>
              <tr className="border-b-2 border-tp-dark bg-tp-blue/5 font-semibold">
                <td className="py-2 pr-4 text-tp-dark sticky left-0 bg-tp-blue/5 text-xs">Profit Pool</td>
                {MONTHS_SHORT.map((_, i) => {
                  const data = getMonthData(i);
                  const monthKey = `${selectedYear}-${String(i + 1).padStart(2, "0")}`;
                  const softwareData = softwareCostsByMonth[monthKey] || { budget: 0, actual: 0, isReconciled: false };
                  const travelData = travelCostsByMonth[monthKey] || { budget: 375, actual: 0, isReconciled: false };
                  const isReconciled = softwareData.isReconciled && travelData.isReconciled;
                  const actualCosts = isReconciled ? data.hr.total + softwareData.actual + travelData.actual : 0;
                  const actualGrossProfit = isReconciled ? data.revenue.total - actualCosts : 0;
                  const actualProfitPool = isReconciled ? actualGrossProfit - data.overhead : 0;
                  const budgetCosts = data.hr.total + softwareData.budget + travelData.budget;
                  const budgetProfitPool = data.forecast.total - budgetCosts - data.overhead;
                  return (
                    <React.Fragment key={i}>
                      <td className="py-1.5 px-1 text-center text-tp-dark-grey">{renderCell(budgetProfitPool, false, true, true)}</td>
                      <td className={`py-1.5 px-1 text-center ${!isReconciled ? "" : actualProfitPool >= 0 ? "text-tp-dark" : "text-error"}`}>
                        {isReconciled ? renderCell(actualProfitPool, false, true) : <span className="text-tp-light-grey">-</span>}
                      </td>
                    </React.Fragment>
                  );
                })}
                <td className="py-1.5 px-1 text-center bg-tp-light text-tp-dark-grey">{renderCell(ytdData.forecastProfitPool, false, true, true)}</td>
                <td className={`py-1.5 px-1 text-center bg-tp-light ${ytdData.reconciledMonths === 0 ? "" : ytdData.profitPoolActual >= 0 ? "text-tp-dark" : "text-error"}`}>
                  {ytdData.reconciledMonths > 0 ? renderCell(ytdData.profitPoolActual, false, true) : <span className="text-tp-light-grey">-</span>}
                </td>
              </tr>
              <tr className="bg-tp-green/10">
                <td className="py-2 pr-4 text-tp-dark font-medium sticky left-0 bg-tp-green/10 text-xs">Taryn's Share (12%)</td>
                {MONTHS_SHORT.map((_, i) => {
                  const data = getMonthData(i);
                  const monthKey = `${selectedYear}-${String(i + 1).padStart(2, "0")}`;
                  const softwareData = softwareCostsByMonth[monthKey] || { budget: 0, actual: 0, isReconciled: false };
                  const travelData = travelCostsByMonth[monthKey] || { budget: 375, actual: 0, isReconciled: false };
                  const isReconciled = softwareData.isReconciled && travelData.isReconciled;
                  const actualCosts = isReconciled ? data.hr.total + softwareData.actual + travelData.actual : 0;
                  const actualGrossProfit = isReconciled ? data.revenue.total - actualCosts : 0;
                  const actualProfitPool = isReconciled ? actualGrossProfit - data.overhead : 0;
                  const actualTarynShare = isReconciled && actualProfitPool > 0 ? actualProfitPool * (TARYN_SHARE_PERCENT / 100) : 0;
                  const budgetCosts = data.hr.total + softwareData.budget + travelData.budget;
                  const budgetProfitPool = data.forecast.total - budgetCosts - data.overhead;
                  const budgetTarynShare = budgetProfitPool > 0 ? budgetProfitPool * (TARYN_SHARE_PERCENT / 100) : 0;
                  return (
                    <React.Fragment key={i}>
                      <td className="py-1.5 px-1 text-center text-tp-dark-grey">{renderCell(budgetTarynShare, false, false, true)}</td>
                      <td className="py-1.5 px-1 text-center text-tp-green font-medium">
                        {isReconciled ? renderCell(actualTarynShare) : <span className="text-tp-light-grey">-</span>}
                      </td>
                    </React.Fragment>
                  );
                })}
                <td className="py-1.5 px-1 text-center bg-tp-green/10 text-tp-dark-grey">{renderCell(ytdData.forecastTarynShare, false, false, true)}</td>
                <td className="py-1.5 px-1 text-center bg-tp-green/20 text-tp-green font-semibold">
                  {ytdData.reconciledMonths > 0 ? renderCell(ytdData.tarynShareActual) : <span className="text-tp-light-grey">-</span>}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
