import React, { useState, useCallback, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Target, Activity } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useKPIMetrics,
  useKPIValues,
  useActivityMetrics,
  useActivityValues,
} from "@/hooks/useKPIs";
import type { KPIMetric, ActivityMetric } from "@/hooks/useKPIs";
import { useDataRefresh } from "@/context/ChatContext";
import { formatGBP } from "@/lib/formatters";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

type ViewMode = "kpi" | "activity";

interface EditingCell {
  metricId: string;
  monthIndex: number;
  field: "target" | "actual";
  value: string;
}

export function KPIsPage() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [viewMode, setViewMode] = useState<ViewMode>("kpi");
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // KPI data
  const { metrics: kpiMetrics, loading: kpiMetricsLoading, refetch: refetchKPIMetrics } = useKPIMetrics();
  const { values: kpiValues, loading: kpiValuesLoading, upsertValue: upsertKPIValue, refetch: refetchKPIValues } = useKPIValues(selectedYear);

  // Activity data
  const { metrics: activityMetrics, loading: activityMetricsLoading, refetch: refetchActivityMetrics } = useActivityMetrics();
  const { values: activityValues, loading: activityValuesLoading, upsertValue: upsertActivityValue, refetch: refetchActivityValues } = useActivityValues(selectedYear);

  // Refresh data when chat makes changes
  const handleDataRefresh = useCallback(() => {
    refetchKPIMetrics();
    refetchKPIValues();
    refetchActivityMetrics();
    refetchActivityValues();
  }, [refetchKPIMetrics, refetchKPIValues, refetchActivityMetrics, refetchActivityValues]);

  useDataRefresh(handleDataRefresh);

  // Focus input when editing
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const loading = viewMode === "kpi"
    ? kpiMetricsLoading || kpiValuesLoading
    : activityMetricsLoading || activityValuesLoading;

  // Build lookup for values
  const buildValueLookup = (values: { metric_id: string; kpi_month?: string; activity_month?: string; target_value: number | null; actual_value: number | null }[]) => {
    const lookup: Record<string, Record<string, { target: number | null; actual: number | null }>> = {};
    values.forEach((v) => {
      const month = (v.kpi_month || v.activity_month || "").slice(0, 7);
      if (!lookup[v.metric_id]) lookup[v.metric_id] = {};
      lookup[v.metric_id][month] = {
        target: v.target_value,
        actual: v.actual_value,
      };
    });
    return lookup;
  };

  const kpiLookup = buildValueLookup(kpiValues);
  const activityLookup = buildValueLookup(activityValues);

  const handleCellClick = (metricId: string, monthIndex: number, field: "target" | "actual", currentValue: number | null) => {
    setEditingCell({
      metricId,
      monthIndex,
      field,
      value: currentValue !== null ? String(currentValue) : "",
    });
  };

  const handleCellSave = async () => {
    if (!editingCell) return;

    const monthKey = `${selectedYear}-${String(editingCell.monthIndex + 1).padStart(2, "0")}-01`;
    const newValue = editingCell.value ? parseFloat(editingCell.value) : null;

    setSaving(true);

    if (viewMode === "kpi") {
      const existing = kpiLookup[editingCell.metricId]?.[monthKey.slice(0, 7)] || { target: null, actual: null };
      await upsertKPIValue({
        metric_id: editingCell.metricId,
        kpi_month: monthKey,
        target_value: editingCell.field === "target" ? newValue : existing.target,
        actual_value: editingCell.field === "actual" ? newValue : existing.actual,
      });
    } else {
      const existing = activityLookup[editingCell.metricId]?.[monthKey.slice(0, 7)] || { target: null, actual: null };
      await upsertActivityValue({
        metric_id: editingCell.metricId,
        activity_month: monthKey,
        target_value: editingCell.field === "target" ? newValue : existing.target,
        actual_value: editingCell.field === "actual" ? newValue : existing.actual,
      });
    }

    setSaving(false);
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCellSave();
    } else if (e.key === "Escape") {
      setEditingCell(null);
    }
  };

  const formatValue = (value: number | null, type: string) => {
    if (value === null) return "-";
    if (type === "percentage") return `${value}%`;
    if (type === "currency") return formatGBP(value);
    return value.toString();
  };

  // Group metrics by category
  const groupByCategory = <T extends { category: string }>(items: T[]) => {
    const groups: Record<string, T[]> = {};
    items.forEach((item) => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  };

  const kpiGroups = groupByCategory(kpiMetrics);
  const activityGroups = groupByCategory(activityMetrics);

  const renderTable = (
    _metrics: (KPIMetric | ActivityMetric)[],
    lookup: Record<string, Record<string, { target: number | null; actual: number | null }>>,
    groupedMetrics: Record<string, (KPIMetric | ActivityMetric)[]>
  ) => {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            {/* Month headers */}
            <tr className="border-b border-tp-light-grey">
              <th rowSpan={2} className="text-left py-2 pr-4 font-semibold text-tp-dark min-w-[200px] sticky left-0 bg-white align-bottom">
                Metric
              </th>
              {MONTHS.map((month) => (
                <th key={month} colSpan={2} className="text-center py-1 px-1 font-semibold text-tp-dark min-w-[90px] border-b border-tp-light-grey/50">
                  {month}
                </th>
              ))}
              <th colSpan={2} className="text-center py-1 px-1 font-semibold text-tp-dark bg-tp-light min-w-[90px] border-b border-tp-light-grey/50">
                YTD
              </th>
            </tr>
            {/* Tgt/Act sub-headers */}
            <tr className="border-b-2 border-tp-dark">
              {MONTHS.map((month) => (
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
            {Object.entries(groupedMetrics).map(([category, categoryMetrics]) => (
              <React.Fragment key={category}>
                {/* Category header row */}
                <tr>
                  <td colSpan={27} className="pt-4 pb-1 text-xs font-semibold text-tp-dark-grey uppercase tracking-wide bg-tp-light/50 px-2">
                    {category}
                  </td>
                </tr>
                {/* Metric rows */}
                {categoryMetrics.map((metric) => {
                  const metricLookup = lookup[metric.id] || {};
                  let ytdTarget = 0;
                  let ytdActual = 0;

                  return (
                    <tr key={metric.id} className="border-b border-tp-light-grey/30 hover:bg-tp-light/30">
                      <td className="py-1.5 pr-4 text-tp-dark sticky left-0 bg-white text-xs">
                        {metric.name}
                      </td>
                      {MONTHS.map((_, monthIndex) => {
                        const monthKey = `${selectedYear}-${String(monthIndex + 1).padStart(2, "0")}`;
                        const values = metricLookup[monthKey] || { target: null, actual: null };
                        const isEditingTarget = editingCell?.metricId === metric.id && editingCell?.monthIndex === monthIndex && editingCell?.field === "target";
                        const isEditingActual = editingCell?.metricId === metric.id && editingCell?.monthIndex === monthIndex && editingCell?.field === "actual";

                        if (values.target !== null) ytdTarget += values.target;
                        if (values.actual !== null) ytdActual += values.actual;

                        return (
                          <React.Fragment key={monthIndex}>
                            {/* Target cell */}
                            <td className="py-1 px-1 text-center">
                              {isEditingTarget ? (
                                <Input
                                  ref={inputRef}
                                  type="number"
                                  step={metric.target_type === "percentage" ? "1" : "0.01"}
                                  value={editingCell.value}
                                  onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                                  onKeyDown={handleKeyDown}
                                  onBlur={handleCellSave}
                                  className="h-6 w-12 text-center text-xs px-1"
                                  disabled={saving}
                                />
                              ) : (
                                <button
                                  onClick={() => handleCellClick(metric.id, monthIndex, "target", values.target)}
                                  className="w-full text-center px-1 py-0.5 rounded hover:bg-tp-light transition-colors text-xs tabular-nums text-tp-dark-grey"
                                >
                                  {formatValue(values.target, metric.target_type)}
                                </button>
                              )}
                            </td>
                            {/* Actual cell */}
                            <td className={`py-1 px-1 text-center ${values.actual !== null ? "bg-tp-blue/5" : ""}`}>
                              {isEditingActual ? (
                                <Input
                                  ref={inputRef}
                                  type="number"
                                  step={metric.target_type === "percentage" ? "1" : "0.01"}
                                  value={editingCell.value}
                                  onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                                  onKeyDown={handleKeyDown}
                                  onBlur={handleCellSave}
                                  className="h-6 w-12 text-center text-xs px-1"
                                  disabled={saving}
                                />
                              ) : (
                                <button
                                  onClick={() => handleCellClick(metric.id, monthIndex, "actual", values.actual)}
                                  className={`w-full text-center px-1 py-0.5 rounded hover:bg-tp-light transition-colors text-xs tabular-nums ${
                                    values.actual !== null ? "text-tp-blue font-medium" : "text-tp-dark-grey"
                                  }`}
                                >
                                  {formatValue(values.actual, metric.target_type)}
                                </button>
                              )}
                            </td>
                          </React.Fragment>
                        );
                      })}
                      {/* YTD columns */}
                      <td className="py-1 px-1 text-center bg-tp-light/50 text-xs tabular-nums text-tp-dark-grey">
                        {metric.target_type === "percentage" ? (ytdTarget > 0 ? `${Math.round(ytdTarget / 12)}%` : "-") : formatValue(ytdTarget, metric.target_type)}
                      </td>
                      <td className="py-1 px-1 text-center bg-tp-light/50 text-xs tabular-nums text-tp-blue font-medium">
                        {metric.target_type === "percentage" ? (ytdActual > 0 ? `${Math.round(ytdActual / 12)}%` : "-") : formatValue(ytdActual, metric.target_type)}
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <PageContainer title="KPI Dashboard">
      <div className="space-y-6">
        {/* Header */}
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
          <div className="flex items-center gap-4">
            <p className="text-sm text-tp-dark-grey">
              {loading ? "Loading..." : "Click any cell to edit"}
            </p>
            <div className="flex border border-tp-light-grey rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("kpi")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
                  viewMode === "kpi" ? "bg-tp-blue text-white" : "bg-white text-tp-dark-grey hover:bg-tp-light"
                }`}
              >
                <Target className="h-4 w-4" />
                KPI Dashboard
              </button>
              <button
                onClick={() => setViewMode("activity")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
                  viewMode === "activity" ? "bg-tp-blue text-white" : "bg-white text-tp-dark-grey hover:bg-tp-light"
                }`}
              >
                <Activity className="h-4 w-4" />
                Activity Tracker
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {viewMode === "kpi" ? "Monthly KPI Dashboard" : "CogniScale Activity Tracker"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {viewMode === "kpi" ? (
              kpiMetrics.length > 0 ? (
                renderTable(kpiMetrics, kpiLookup, kpiGroups)
              ) : (
                <p className="text-sm text-tp-dark-grey py-4">No KPI metrics configured. Run the database migration to add default metrics.</p>
              )
            ) : (
              activityMetrics.length > 0 ? (
                renderTable(activityMetrics, activityLookup, activityGroups)
              ) : (
                <p className="text-sm text-tp-dark-grey py-4">No activity metrics configured. Run the database migration to add default metrics.</p>
              )
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex items-center gap-6 text-xs text-tp-dark-grey">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-white border border-tp-light-grey"></div>
            <span>Target value (Tgt)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-tp-blue/10 border border-tp-blue/30"></div>
            <span className="text-tp-blue font-medium">Actual value entered (Act)</span>
          </div>
        </div>

        {/* Instructions */}
        <Card>
          <CardContent className="pt-6">
            <h4 className="font-semibold text-tp-dark mb-2">How to use</h4>
            <ul className="text-sm text-tp-dark-grey space-y-1">
              <li>• Click any <strong>Tgt</strong> cell to set the target for that month</li>
              <li>• Click any <strong>Act</strong> cell to record the actual value achieved</li>
              <li>• Press Enter to save, Escape to cancel</li>
              <li>• Default targets from the spreadsheet are pre-populated</li>
              <li>• Switch between KPI Dashboard and Activity Tracker using the toggle</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
