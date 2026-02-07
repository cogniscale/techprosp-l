import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActivityMetrics, useActivityValues } from "@/hooks/useKPIs";
import { useMonthlyRevenue } from "@/hooks/useInvoices";
import { formatGBP } from "@/lib/formatters";

interface QuarterData {
  target: number;
  actual: number;
  variance: number;
  variancePercent: number;
}

const QUARTERS = [
  { name: "Q1", months: ["01", "02", "03"] },
  { name: "Q2", months: ["04", "05", "06"] },
  { name: "Q3", months: ["07", "08", "09"] },
  { name: "Q4", months: ["10", "11", "12"] },
];

export function QuarterlySummaryPage() {
  const [year, setYear] = useState(2026);
  const { metrics, loading: metricsLoading } = useActivityMetrics();
  const { values, loading: valuesLoading } = useActivityValues(year);
  const { revenueByMonth, loading: revenueLoading } = useMonthlyRevenue(year);

  const loading = metricsLoading || valuesLoading || revenueLoading;

  // Aggregate values by quarter for each metric
  const quarterlyData = useMemo(() => {
    const data: Record<string, Record<string, QuarterData>> = {};

    for (const metric of metrics) {
      data[metric.id] = {};

      for (const quarter of QUARTERS) {
        let target = 0;
        let actual = 0;

        for (const month of quarter.months) {
          const monthKey = `${year}-${month}`;
          const monthValue = values.find(
            (v) => v.metric_id === metric.id && v.activity_month.startsWith(monthKey)
          );
          if (monthValue) {
            target += monthValue.target_value || 0;
            actual += monthValue.actual_value || 0;
          }
        }

        const variance = actual - target;
        const variancePercent = target > 0 ? (variance / target) * 100 : 0;

        data[metric.id][quarter.name] = { target, actual, variance, variancePercent };
      }
    }

    return data;
  }, [metrics, values, year]);

  // Aggregate revenue by quarter
  const quarterlyRevenue = useMemo(() => {
    const data: Record<string, QuarterData> = {};

    for (const quarter of QUARTERS) {
      let actual = 0;
      for (const month of quarter.months) {
        const monthKey = `${year}-${month}`;
        actual += revenueByMonth[monthKey]?.total || 0;
      }
      // Target could come from scenarios - for now we'll just show actual
      data[quarter.name] = { target: 0, actual, variance: actual, variancePercent: 0 };
    }

    return data;
  }, [revenueByMonth, year]);

  // Calculate annual totals
  const annualTotals = useMemo(() => {
    const totals: Record<string, { target: number; actual: number }> = {};

    for (const metric of metrics) {
      let target = 0;
      let actual = 0;
      for (const quarter of QUARTERS) {
        const qData = quarterlyData[metric.id]?.[quarter.name];
        if (qData) {
          target += qData.target;
          actual += qData.actual;
        }
      }
      totals[metric.id] = { target, actual };
    }

    return totals;
  }, [metrics, quarterlyData]);

  const totalRevenue = useMemo(() => {
    return Object.values(quarterlyRevenue).reduce((sum, q) => sum + q.actual, 0);
  }, [quarterlyRevenue]);

  // Taryn's earnings calculation
  const tarynEarnings = useMemo(() => {
    const baseSalaryPerQuarter = 11400; // From spreadsheet
    const data: Record<string, { baseSalary: number; profitShare: number; total: number }> = {};

    for (const quarter of QUARTERS) {
      // Profit share would need actual P&L calculation
      // For now, showing base salary
      data[quarter.name] = {
        baseSalary: baseSalaryPerQuarter,
        profitShare: 0, // Would calculate from actual P&L
        total: baseSalaryPerQuarter,
      };
    }

    return data;
  }, []);

  const renderVarianceIndicator = (variance: number, isGood: boolean = true) => {
    if (variance === 0) return null;
    const positive = variance > 0;
    const color = (positive && isGood) || (!positive && !isGood) ? "text-green-600" : "text-red-600";
    return (
      <span className={`text-xs ml-1 ${color}`}>
        {positive ? "+" : ""}{variance.toFixed(0)}
      </span>
    );
  };

  return (
    <PageContainer title="Quarterly Summary">
      <div className="space-y-6">
        {/* Year Selector */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setYear(year - 1)}
            className="p-2 rounded hover:bg-tp-light text-tp-dark-grey"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-xl font-bold text-tp-dark">{year}</span>
          <button
            onClick={() => setYear(year + 1)}
            className="p-2 rounded hover:bg-tp-light text-tp-dark-grey"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          {QUARTERS.map((quarter) => (
            <Card key={quarter.name}>
              <CardContent className="pt-4">
                <div className="text-lg font-bold text-tp-dark">{quarter.name} {year}</div>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-tp-dark-grey">Revenue</span>
                    <span className="font-medium">{formatGBP(quarterlyRevenue[quarter.name]?.actual || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-tp-dark-grey">Loading quarterly data...</p>
        ) : (
          <>
            {/* Activity Metrics Table */}
            <Card>
              <CardHeader>
                <CardTitle>Activity Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-tp-dark">
                        <th className="text-left py-2 px-2 font-semibold">Metric</th>
                        {QUARTERS.map((q) => (
                          <th key={q.name} colSpan={2} className="text-center py-2 px-2 font-semibold border-l border-tp-light-grey">
                            {q.name}
                          </th>
                        ))}
                        <th colSpan={2} className="text-center py-2 px-2 font-semibold border-l-2 border-tp-dark bg-tp-light">
                          Annual
                        </th>
                      </tr>
                      <tr className="border-b border-tp-light-grey text-xs text-tp-dark-grey">
                        <th></th>
                        {QUARTERS.map((q) => (
                          <>
                            <th key={`${q.name}-tgt`} className="text-center py-1 px-1 border-l border-tp-light-grey">Tgt</th>
                            <th key={`${q.name}-act`} className="text-center py-1 px-1">Act</th>
                          </>
                        ))}
                        <th className="text-center py-1 px-1 border-l-2 border-tp-dark bg-tp-light">Tgt</th>
                        <th className="text-center py-1 px-1 bg-tp-light">Act</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.map((metric) => (
                        <tr key={metric.id} className="border-b border-tp-light-grey/50 hover:bg-tp-light/30">
                          <td className="py-2 px-2 font-medium">{metric.name}</td>
                          {QUARTERS.map((q) => {
                            const qData = quarterlyData[metric.id]?.[q.name];
                            return (
                              <>
                                <td key={`${q.name}-tgt`} className="py-2 px-1 text-center text-tp-dark-grey border-l border-tp-light-grey">
                                  {qData?.target || 0}
                                </td>
                                <td key={`${q.name}-act`} className="py-2 px-1 text-center font-medium">
                                  {qData?.actual || 0}
                                  {renderVarianceIndicator(qData?.variance || 0)}
                                </td>
                              </>
                            );
                          })}
                          <td className="py-2 px-1 text-center text-tp-dark-grey border-l-2 border-tp-dark bg-tp-light">
                            {annualTotals[metric.id]?.target || 0}
                          </td>
                          <td className="py-2 px-1 text-center font-medium bg-tp-light">
                            {annualTotals[metric.id]?.actual || 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Revenue Table */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-tp-dark">
                        <th className="text-left py-2 px-2 font-semibold">Metric</th>
                        {QUARTERS.map((q) => (
                          <th key={q.name} className="text-right py-2 px-2 font-semibold border-l border-tp-light-grey">
                            {q.name}
                          </th>
                        ))}
                        <th className="text-right py-2 px-2 font-semibold border-l-2 border-tp-dark bg-tp-light">
                          Annual
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-tp-light-grey/50">
                        <td className="py-2 px-2 font-medium">Total Revenue</td>
                        {QUARTERS.map((q) => (
                          <td key={q.name} className="py-2 px-2 text-right border-l border-tp-light-grey">
                            {formatGBP(quarterlyRevenue[q.name]?.actual || 0)}
                          </td>
                        ))}
                        <td className="py-2 px-2 text-right font-bold border-l-2 border-tp-dark bg-tp-light">
                          {formatGBP(totalRevenue)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Taryn's Earnings */}
            <Card>
              <CardHeader>
                <CardTitle>Taryn's Earnings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-tp-dark">
                        <th className="text-left py-2 px-2 font-semibold">Component</th>
                        {QUARTERS.map((q) => (
                          <th key={q.name} className="text-right py-2 px-2 font-semibold border-l border-tp-light-grey">
                            {q.name}
                          </th>
                        ))}
                        <th className="text-right py-2 px-2 font-semibold border-l-2 border-tp-dark bg-tp-light">
                          Annual
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-tp-light-grey/50">
                        <td className="py-2 px-2">Base Salary</td>
                        {QUARTERS.map((q) => (
                          <td key={q.name} className="py-2 px-2 text-right border-l border-tp-light-grey">
                            {formatGBP(tarynEarnings[q.name]?.baseSalary || 0)}
                          </td>
                        ))}
                        <td className="py-2 px-2 text-right border-l-2 border-tp-dark bg-tp-light">
                          {formatGBP(Object.values(tarynEarnings).reduce((sum, q) => sum + q.baseSalary, 0))}
                        </td>
                      </tr>
                      <tr className="border-b border-tp-light-grey/50">
                        <td className="py-2 px-2">Profit Share (12%)</td>
                        {QUARTERS.map((q) => (
                          <td key={q.name} className="py-2 px-2 text-right text-tp-dark-grey border-l border-tp-light-grey">
                            TBD
                          </td>
                        ))}
                        <td className="py-2 px-2 text-right text-tp-dark-grey border-l-2 border-tp-dark bg-tp-light">
                          TBD
                        </td>
                      </tr>
                      <tr className="border-t-2 border-tp-dark bg-tp-blue/10 font-bold">
                        <td className="py-2 px-2">TOTAL EARNINGS</td>
                        {QUARTERS.map((q) => (
                          <td key={q.name} className="py-2 px-2 text-right border-l border-tp-light-grey">
                            {formatGBP(tarynEarnings[q.name]?.total || 0)}
                          </td>
                        ))}
                        <td className="py-2 px-2 text-right border-l-2 border-tp-dark bg-tp-light">
                          {formatGBP(Object.values(tarynEarnings).reduce((sum, q) => sum + q.total, 0))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-tp-dark-grey mt-3">
                  Note: Profit share will be calculated from actual P&L data once quarters are completed.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageContainer>
  );
}
