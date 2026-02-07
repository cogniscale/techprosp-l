import { useState } from "react";
import { Target, TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useScorecard } from "@/hooks/useScorecard";
import { formatGBP } from "@/lib/formatters";

const RAG_COLORS = {
  green: "bg-green-100 text-green-800 border-green-300",
  amber: "bg-yellow-100 text-yellow-800 border-yellow-300",
  red: "bg-red-100 text-red-800 border-red-300",
  none: "bg-gray-100 text-gray-500 border-gray-300",
};

const RAG_BG = {
  green: "bg-green-500",
  amber: "bg-yellow-500",
  red: "bg-red-500",
  none: "bg-gray-300",
};

// Review period options
const PERIODS = [
  { label: "H1 2026 (Jan-Jun)", start: "2026-01-01", end: "2026-06-30" },
  { label: "H2 2026 (Jul-Dec)", start: "2026-07-01", end: "2026-12-31" },
  { label: "Full Year 2026", start: "2026-01-01", end: "2026-12-31" },
];

export function ScorecardPage() {
  const [periodIndex, setPeriodIndex] = useState(0);
  const currentPeriod = PERIODS[periodIndex];

  const {
    categories,
    overallScore,
    overallRAG,
    loading,
    updateActual,
  } = useScorecard(currentPeriod.start, currentPeriod.end);

  const [editingMetric, setEditingMetric] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const startEdit = (metricId: string, currentValue: number | null) => {
    setEditingMetric(metricId);
    setEditValue(currentValue?.toString() || "");
  };

  const saveEdit = async () => {
    if (!editingMetric) return;
    await updateActual(editingMetric, parseFloat(editValue) || 0);
    setEditingMetric(null);
  };

  const formatValue = (value: number | null, type: string): string => {
    if (value === null) return "-";
    if (type === "currency") return formatGBP(value);
    if (type === "percentage") return `${value}%`;
    return value.toString();
  };

  const formatTarget = (value: number | null, type: string): string => {
    if (value === null) return "-";
    if (type === "currency") return formatGBP(value);
    if (type === "percentage") return `${value}%`;
    return value.toString();
  };

  return (
    <PageContainer title="Success Criteria">
      <div className="space-y-6">
        {/* Period Selector and Overall Score */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-tp-dark-grey" />
            <select
              value={periodIndex}
              onChange={(e) => setPeriodIndex(Number(e.target.value))}
              className="h-10 rounded-md border border-tp-light-grey bg-white px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-tp-blue"
            >
              {PERIODS.map((period, idx) => (
                <option key={idx} value={idx}>
                  {period.label}
                </option>
              ))}
            </select>
          </div>
          <div className="text-sm text-tp-dark-grey">
            Review period for MD title consideration: July 2026
          </div>
        </div>

        {/* Overall Score Card */}
        <Card className={`border-2 ${overallRAG === "green" ? "border-green-500" : overallRAG === "amber" ? "border-yellow-500" : overallRAG === "red" ? "border-red-500" : "border-gray-300"}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-tp-dark-grey uppercase tracking-wide">Overall Weighted Score</div>
                <div className="text-4xl font-bold mt-1">
                  {overallScore > 0 ? `${overallScore.toFixed(1)}%` : "No data"}
                </div>
              </div>
              <div className="text-right">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${RAG_COLORS[overallRAG]}`}>
                  {overallRAG === "green" && <TrendingUp className="h-5 w-5" />}
                  {overallRAG === "amber" && <Minus className="h-5 w-5" />}
                  {overallRAG === "red" && <TrendingDown className="h-5 w-5" />}
                  <span className="font-semibold uppercase">
                    {overallRAG === "green" ? "Exceeds" : overallRAG === "amber" ? "Meets" : overallRAG === "red" ? "Below" : "No Data"}
                  </span>
                </div>
                <div className="text-xs text-tp-dark-grey mt-2">
                  Green ≥100% | Amber 85-99% | Red &lt;85%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Achievement Thresholds Reference */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <div>
              <div className="font-semibold text-green-800">Exceeds</div>
              <div className="text-xs text-green-600">≥100% of target</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div>
              <div className="font-semibold text-yellow-800">Meets</div>
              <div className="text-xs text-yellow-600">85-99% of target</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div>
              <div className="font-semibold text-red-800">Below</div>
              <div className="text-xs text-red-600">&lt;85% of target</div>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-tp-dark-grey">Loading scorecard...</p>
        ) : (
          <>
            {/* Category Cards */}
            {categories.map((category) => (
              <Card key={category.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {category.name}
                      <span className="text-sm font-normal text-tp-dark-grey">
                        ({(category.weight * 100).toFixed(0)}% weight)
                      </span>
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs text-tp-dark-grey">Category Score</div>
                      <div className="font-bold">
                        {category.category_score > 0 ? `${category.category_score.toFixed(1)}%` : "-"}
                      </div>
                    </div>
                    <div className={`w-3 h-8 rounded ${category.metrics.some(m => m.actual_value !== null) ? RAG_BG[category.metrics.every(m => m.rag_status === "green" || m.actual_value === null) ? "green" : category.metrics.every(m => m.rag_status !== "red" || m.actual_value === null) ? "amber" : "red"] : RAG_BG.none}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-tp-light-grey">
                        <th className="text-left py-2 px-2 font-semibold">Metric</th>
                        <th className="text-right py-2 px-2 font-semibold">Target</th>
                        <th className="text-right py-2 px-2 font-semibold">Actual</th>
                        <th className="text-right py-2 px-2 font-semibold">% Achieved</th>
                        <th className="text-center py-2 px-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {category.metrics.map((metric) => (
                        <tr key={metric.id} className="border-b border-tp-light-grey/50 hover:bg-tp-light/30">
                          <td className="py-2 px-2">
                            <div className="font-medium">{metric.name}</div>
                            {metric.description && (
                              <div className="text-xs text-tp-dark-grey">{metric.description}</div>
                            )}
                          </td>
                          <td className="py-2 px-2 text-right text-tp-dark-grey">
                            {formatTarget(metric.target_value, metric.target_type)}
                          </td>
                          <td className="py-2 px-2 text-right">
                            {editingMetric === metric.id ? (
                              <Input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="h-7 w-24 text-right"
                                onBlur={saveEdit}
                                onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                                autoFocus
                              />
                            ) : (
                              <button
                                onClick={() => startEdit(metric.id, metric.actual_value)}
                                className="hover:bg-tp-light px-2 py-1 rounded"
                              >
                                {formatValue(metric.actual_value, metric.target_type)}
                              </button>
                            )}
                          </td>
                          <td className="py-2 px-2 text-right font-medium">
                            {metric.actual_value !== null ? `${metric.achievement_percent.toFixed(0)}%` : "-"}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${RAG_COLORS[metric.rag_status]}`}>
                              {metric.rag_status === "green" ? "Exceeds" : metric.rag_status === "amber" ? "Meets" : metric.rag_status === "red" ? "Below" : "-"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ))}

            {/* Weighted Score Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Weighted Score Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-tp-dark">
                      <th className="text-left py-2 px-2 font-semibold">Category</th>
                      <th className="text-right py-2 px-2 font-semibold">Weight</th>
                      <th className="text-right py-2 px-2 font-semibold">Category Score</th>
                      <th className="text-right py-2 px-2 font-semibold">Weighted Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((category) => (
                      <tr key={category.id} className="border-b border-tp-light-grey/50">
                        <td className="py-2 px-2 font-medium">{category.name}</td>
                        <td className="py-2 px-2 text-right">{(category.weight * 100).toFixed(0)}%</td>
                        <td className="py-2 px-2 text-right">
                          {category.category_score > 0 ? `${category.category_score.toFixed(1)}%` : "-"}
                        </td>
                        <td className="py-2 px-2 text-right font-medium">
                          {category.weighted_score > 0 ? `${category.weighted_score.toFixed(1)}%` : "-"}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-tp-dark bg-tp-light font-bold">
                      <td className="py-2 px-2">OVERALL SCORE</td>
                      <td className="py-2 px-2 text-right">100%</td>
                      <td className="py-2 px-2 text-right"></td>
                      <td className={`py-2 px-2 text-right ${overallRAG === "green" ? "text-green-600" : overallRAG === "amber" ? "text-yellow-600" : overallRAG === "red" ? "text-red-600" : ""}`}>
                        {overallScore > 0 ? `${overallScore.toFixed(1)}%` : "-"}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-xs text-tp-dark-grey mt-4">
                  Note: A minimum threshold of 85% overall is required for positive performance review.
                  Click on actual values to edit them.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageContainer>
  );
}
