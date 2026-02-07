import { useState, useCallback, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTravelCosts } from "@/hooks/useTravelCosts";
import { useDataRefresh } from "@/context/ChatContext";
import { formatGBP } from "@/lib/formatters";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

interface EditingCell {
  monthIndex: number;
  field: "budgeted" | "actual";
  value: string;
}

export function TravelCostsPage() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    travelCosts,
    monthlyTotals,
    loading,
    upsertTravelCost,
    refetch,
  } = useTravelCosts(selectedYear);

  // Refresh data when chat makes changes
  const handleDataRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  useDataRefresh(handleDataRefresh);

  // Focus input when editing
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const handleCellClick = (monthIndex: number, field: "budgeted" | "actual") => {
    const monthKey = `${selectedYear}-${String(monthIndex + 1).padStart(2, "0")}`;
    const value = field === "budgeted"
      ? monthlyTotals[monthKey]?.budgeted || 375
      : monthlyTotals[monthKey]?.actual || monthlyTotals[monthKey]?.budgeted || 375;

    setEditingCell({
      monthIndex,
      field,
      value: value.toFixed(2),
    });
  };

  const handleCellSave = async () => {
    if (!editingCell) return;

    const monthKey = `${selectedYear}-${String(editingCell.monthIndex + 1).padStart(2, "0")}-01`;
    const newValue = parseFloat(editingCell.value);
    const currentData = monthlyTotals[monthKey.slice(0, 7)];

    setSaving(true);

    if (editingCell.field === "budgeted") {
      await upsertTravelCost({
        cost_month: monthKey,
        budgeted_amount: newValue,
        actual_amount: currentData?.actual !== currentData?.budgeted ? currentData?.actual : null,
      });
    } else {
      // If actual equals budgeted, store as null (use default)
      const budgeted = currentData?.budgeted || 375;
      await upsertTravelCost({
        cost_month: monthKey,
        budgeted_amount: budgeted,
        actual_amount: Math.abs(newValue - budgeted) < 0.01 ? null : newValue,
      });
    }

    setSaving(false);
    setEditingCell(null);
  };

  const handleCellCancel = () => {
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCellSave();
    } else if (e.key === "Escape") {
      handleCellCancel();
    }
  };

  // Calculate totals
  const budgetedTotal = Object.values(monthlyTotals).reduce((sum, m) => sum + m.budgeted, 0);
  const actualTotal = Object.values(monthlyTotals).reduce((sum, m) => sum + m.actual, 0);

  return (
    <PageContainer title="Travel & Expenses">
      <div className="space-y-6">
        {/* Header with year selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => setSelectedYear((y) => y - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-semibold text-tp-dark font-heading min-w-[80px] text-center">
              {selectedYear}
            </h2>
            <Button variant="outline" size="icon" onClick={() => setSelectedYear((y) => y + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-tp-dark-grey">
            {loading ? "Loading..." : "Click any cell to edit"}
          </p>
        </div>

        {/* Monthly Grid */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Travel Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-tp-light-grey">
                    <th className="text-left px-3 py-2 font-semibold text-tp-dark">Type</th>
                    {MONTHS.map((month) => (
                      <th key={month} className="text-right px-3 py-2 font-semibold text-tp-dark min-w-[80px]">
                        {month}
                      </th>
                    ))}
                    <th className="text-right px-3 py-2 font-semibold text-tp-dark bg-tp-light-grey/50 min-w-[100px]">
                      YTD
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Budgeted Row */}
                  <tr className="border-b border-tp-light-grey/50">
                    <td className="px-3 py-2 font-medium text-tp-dark">Budgeted</td>
                    {MONTHS.map((_, monthIndex) => {
                      const monthKey = `${selectedYear}-${String(monthIndex + 1).padStart(2, "0")}`;
                      const isEditing = editingCell?.monthIndex === monthIndex && editingCell?.field === "budgeted";
                      const value = monthlyTotals[monthKey]?.budgeted || 375;

                      return (
                        <td key={monthIndex} className="px-1 py-1 text-right">
                          {isEditing ? (
                            <Input
                              ref={inputRef}
                              type="number"
                              step="0.01"
                              value={editingCell.value}
                              onChange={(e) =>
                                setEditingCell({ ...editingCell, value: e.target.value })
                              }
                              onKeyDown={handleKeyDown}
                              onBlur={handleCellSave}
                              className="h-7 w-20 text-right text-sm px-1"
                              disabled={saving}
                            />
                          ) : (
                            <button
                              onClick={() => handleCellClick(monthIndex, "budgeted")}
                              className="w-full text-right px-2 py-1 rounded hover:bg-tp-light transition-colors text-tp-dark-grey"
                            >
                              {formatGBP(value)}
                            </button>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right font-medium text-tp-dark bg-tp-light-grey/20">
                      {formatGBP(budgetedTotal)}
                    </td>
                  </tr>

                  {/* Actual Row */}
                  <tr className="border-b border-tp-light-grey/50">
                    <td className="px-3 py-2 font-medium text-tp-dark">Actual</td>
                    {MONTHS.map((_, monthIndex) => {
                      const monthKey = `${selectedYear}-${String(monthIndex + 1).padStart(2, "0")}`;
                      const isEditing = editingCell?.monthIndex === monthIndex && editingCell?.field === "actual";
                      const data = monthlyTotals[monthKey];
                      const value = data?.actual || data?.budgeted || 375;
                      const hasOverride = travelCosts.some(
                        (tc) => tc.cost_month.startsWith(monthKey) && tc.actual_amount !== null
                      );

                      return (
                        <td key={monthIndex} className={`px-1 py-1 text-right ${hasOverride ? "bg-tp-blue/5" : ""}`}>
                          {isEditing ? (
                            <Input
                              ref={inputRef}
                              type="number"
                              step="0.01"
                              value={editingCell.value}
                              onChange={(e) =>
                                setEditingCell({ ...editingCell, value: e.target.value })
                              }
                              onKeyDown={handleKeyDown}
                              onBlur={handleCellSave}
                              className="h-7 w-20 text-right text-sm px-1"
                              disabled={saving}
                            />
                          ) : (
                            <button
                              onClick={() => handleCellClick(monthIndex, "actual")}
                              className={`w-full text-right px-2 py-1 rounded hover:bg-tp-light transition-colors ${
                                hasOverride ? "text-tp-blue font-medium" : "text-tp-dark"
                              }`}
                            >
                              {formatGBP(value)}
                            </button>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right font-medium text-tp-dark bg-tp-light-grey/20">
                      {formatGBP(actualTotal)}
                    </td>
                  </tr>

                  {/* Variance Row */}
                  <tr className="bg-tp-light">
                    <td className="px-3 py-2 font-semibold text-tp-dark">Variance</td>
                    {MONTHS.map((_, monthIndex) => {
                      const monthKey = `${selectedYear}-${String(monthIndex + 1).padStart(2, "0")}`;
                      const data = monthlyTotals[monthKey];
                      const budgeted = data?.budgeted || 375;
                      const actual = data?.actual || budgeted;
                      const variance = actual - budgeted;

                      return (
                        <td
                          key={monthIndex}
                          className={`px-3 py-2 text-right font-medium ${
                            variance > 0 ? "text-error" : variance < 0 ? "text-tp-green" : "text-tp-dark-grey"
                          }`}
                        >
                          {variance !== 0 ? (variance > 0 ? "+" : "") + formatGBP(variance) : "-"}
                        </td>
                      );
                    })}
                    <td
                      className={`px-3 py-2 text-right font-semibold bg-tp-light-grey/20 ${
                        actualTotal > budgetedTotal ? "text-error" : actualTotal < budgetedTotal ? "text-tp-green" : "text-tp-dark"
                      }`}
                    >
                      {actualTotal !== budgetedTotal
                        ? (actualTotal > budgetedTotal ? "+" : "") + formatGBP(actualTotal - budgetedTotal)
                        : "-"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex items-center gap-6 text-xs text-tp-dark-grey">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-white border border-tp-light-grey"></div>
            <span>Using budget (default £375/month)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-tp-blue/10 border border-tp-blue/30"></div>
            <span className="text-tp-blue font-medium">Actual entered</span>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
