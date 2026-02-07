import { useState, useCallback, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calculator } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForecasts } from "@/hooks/useForecasts";
import { useDataRefresh } from "@/context/ChatContext";
import { formatGBP } from "@/lib/formatters";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Default annual projections from spreadsheet v5 (2026)
const DEFAULT_ANNUAL_PROJECTIONS: Record<string, number> = {
  "6sense": 55000,
  "Enate": 65000,
  "Gilroy": 50000,
  "HubbubHR": 36000,
  "Amphora": 13000,
};

interface EditingCell {
  clientId: string;
  monthIndex: number;
  value: string;
}

interface EditingAnnual {
  clientId: string;
  value: string;
}

export function ForecastsPage() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editingAnnual, setEditingAnnual] = useState<EditingAnnual | null>(null);
  const [saving, setSaving] = useState(false);
  const [distributing, setDistributing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const annualInputRef = useRef<HTMLInputElement>(null);

  const {
    forecasts,
    clients,
    loading,
    upsertForecast,
    refetch,
  } = useForecasts(selectedYear);

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

  useEffect(() => {
    if (editingAnnual && annualInputRef.current) {
      annualInputRef.current.focus();
      annualInputRef.current.select();
    }
  }, [editingAnnual]);

  // Build lookup: clientId -> monthKey -> amount
  const forecastLookup: Record<string, Record<string, number>> = {};
  forecasts.forEach((f) => {
    const monthKey = f.forecast_month.slice(0, 7);
    if (!forecastLookup[f.client_id]) {
      forecastLookup[f.client_id] = {};
    }
    forecastLookup[f.client_id][monthKey] = Number(f.forecast_amount);
  });

  const handleCellClick = (clientId: string, monthIndex: number) => {
    const monthKey = `${selectedYear}-${String(monthIndex + 1).padStart(2, "0")}`;
    const currentValue = forecastLookup[clientId]?.[monthKey] || 0;

    setEditingCell({
      clientId,
      monthIndex,
      value: currentValue > 0 ? currentValue.toFixed(2) : "",
    });
  };

  const handleCellSave = async () => {
    if (!editingCell) return;

    const monthKey = `${selectedYear}-${String(editingCell.monthIndex + 1).padStart(2, "0")}-01`;
    const newValue = parseFloat(editingCell.value) || 0;

    if (newValue <= 0) {
      // Don't save zero/empty values
      setEditingCell(null);
      return;
    }

    setSaving(true);
    await upsertForecast({
      client_id: editingCell.clientId,
      forecast_month: monthKey,
      forecast_amount: newValue,
    });
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

  // Handle annual projection click
  const handleAnnualClick = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    const defaultAmount = client ? DEFAULT_ANNUAL_PROJECTIONS[client.name] || 0 : 0;
    const currentTotal = clientYearTotals[clientId] || 0;

    setEditingAnnual({
      clientId,
      value: currentTotal > 0 ? currentTotal.toFixed(0) : (defaultAmount > 0 ? defaultAmount.toFixed(0) : ""),
    });
  };

  // Distribute annual amount to all months
  const handleAnnualSave = async () => {
    if (!editingAnnual) return;

    const annualAmount = parseFloat(editingAnnual.value) || 0;
    if (annualAmount <= 0) {
      setEditingAnnual(null);
      return;
    }

    const monthlyAmount = Math.round((annualAmount / 12) * 100) / 100;

    setDistributing(true);

    // Create forecasts for all 12 months
    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      const monthKey = `${selectedYear}-${String(monthIndex + 1).padStart(2, "0")}-01`;
      await upsertForecast({
        client_id: editingAnnual.clientId,
        forecast_month: monthKey,
        forecast_amount: monthlyAmount,
      });
    }

    setDistributing(false);
    setEditingAnnual(null);
  };

  const handleAnnualCancel = () => {
    setEditingAnnual(null);
  };

  const handleAnnualKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAnnualSave();
    } else if (e.key === "Escape") {
      handleAnnualCancel();
    }
  };

  // Calculate totals
  const monthlyTotals: number[] = MONTHS.map((_, monthIndex) => {
    const monthKey = `${selectedYear}-${String(monthIndex + 1).padStart(2, "0")}`;
    return clients.reduce((sum, client) => {
      return sum + (forecastLookup[client.id]?.[monthKey] || 0);
    }, 0);
  });

  const yearTotal = monthlyTotals.reduce((sum, m) => sum + m, 0);

  // Calculate client yearly totals
  const clientYearTotals: Record<string, number> = {};
  clients.forEach((client) => {
    clientYearTotals[client.id] = MONTHS.reduce((sum, _, monthIndex) => {
      const monthKey = `${selectedYear}-${String(monthIndex + 1).padStart(2, "0")}`;
      return sum + (forecastLookup[client.id]?.[monthKey] || 0);
    }, 0);
  });

  // Get default annual projection for a client
  const getDefaultAnnual = (clientName: string) => {
    return DEFAULT_ANNUAL_PROJECTIONS[clientName] || 0;
  };

  return (
    <PageContainer title="Revenue Forecast">
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
            {loading ? "Loading..." : distributing ? "Distributing to months..." : "Click Annual to set projection, or edit individual months"}
          </p>
        </div>

        {/* Forecast Grid */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue Forecast by Client</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-tp-light-grey">
                    <th className="text-left px-3 py-2 font-semibold text-tp-dark min-w-[150px]">Client</th>
                    <th className="text-right px-3 py-2 font-semibold text-tp-green bg-tp-green/10 min-w-[100px]">
                      <div className="flex items-center justify-end gap-1">
                        <Calculator className="h-3 w-3" />
                        Annual
                      </div>
                    </th>
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
                  {clients.map((client) => {
                    const isEditingAnnual = editingAnnual?.clientId === client.id;
                    const defaultAnnual = getDefaultAnnual(client.name);
                    const currentYearTotal = clientYearTotals[client.id] || 0;

                    return (
                      <tr key={client.id} className="border-b border-tp-light-grey/50">
                        <td className="px-3 py-2 font-medium text-tp-dark">{client.name}</td>
                        {/* Annual projection column */}
                        <td className="px-1 py-1 text-right bg-tp-green/5">
                          {isEditingAnnual ? (
                            <Input
                              ref={annualInputRef}
                              type="number"
                              step="1"
                              value={editingAnnual.value}
                              onChange={(e) =>
                                setEditingAnnual({ ...editingAnnual, value: e.target.value })
                              }
                              onKeyDown={handleAnnualKeyDown}
                              onBlur={handleAnnualSave}
                              className="h-7 w-24 text-right text-sm px-1"
                              disabled={distributing}
                              placeholder={defaultAnnual > 0 ? defaultAnnual.toFixed(0) : "Annual £"}
                            />
                          ) : (
                            <button
                              onClick={() => handleAnnualClick(client.id)}
                              className={`w-full text-right px-2 py-1 rounded hover:bg-tp-green/20 transition-colors ${
                                currentYearTotal > 0 ? "text-tp-green font-medium" : defaultAnnual > 0 ? "text-tp-green/60" : "text-tp-dark-grey"
                              }`}
                              title={defaultAnnual > 0 ? `Default: ${formatGBP(defaultAnnual)}` : "Click to set annual projection"}
                            >
                              {currentYearTotal > 0 ? formatGBP(currentYearTotal) : defaultAnnual > 0 ? `(${formatGBP(defaultAnnual)})` : "-"}
                            </button>
                          )}
                        </td>
                        {MONTHS.map((_, monthIndex) => {
                          const monthKey = `${selectedYear}-${String(monthIndex + 1).padStart(2, "0")}`;
                          const isEditing = editingCell?.clientId === client.id && editingCell?.monthIndex === monthIndex;
                          const value = forecastLookup[client.id]?.[monthKey] || 0;

                          return (
                            <td key={monthIndex} className={`px-1 py-1 text-right ${value > 0 ? "bg-tp-blue/5" : ""}`}>
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
                                  placeholder="0.00"
                                />
                              ) : (
                                <button
                                  onClick={() => handleCellClick(client.id, monthIndex)}
                                  className={`w-full text-right px-2 py-1 rounded hover:bg-tp-light transition-colors ${
                                    value > 0 ? "text-tp-blue font-medium" : "text-tp-dark-grey"
                                  }`}
                                >
                                  {value > 0 ? formatGBP(value) : "-"}
                                </button>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-right font-medium text-tp-dark bg-tp-light-grey/20">
                          {clientYearTotals[client.id] > 0 ? formatGBP(clientYearTotals[client.id]) : "-"}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Totals Row */}
                  <tr className="bg-tp-light font-semibold">
                    <td className="px-3 py-2 text-tp-dark">Total</td>
                    <td className="px-3 py-2 text-right text-tp-green bg-tp-green/10">
                      {yearTotal > 0 ? formatGBP(yearTotal) : "-"}
                    </td>
                    {monthlyTotals.map((total, monthIndex) => (
                      <td key={monthIndex} className="px-3 py-2 text-right text-tp-dark">
                        {total > 0 ? formatGBP(total) : "-"}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right text-tp-dark bg-tp-light-grey/30">
                      {yearTotal > 0 ? formatGBP(yearTotal) : "-"}
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
            <div className="w-4 h-4 rounded bg-tp-green/10 border border-tp-green/30"></div>
            <span className="text-tp-green font-medium">Annual projection (distributes to all months)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-white border border-tp-light-grey"></div>
            <span>No forecast entered</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-tp-blue/10 border border-tp-blue/30"></div>
            <span className="text-tp-blue font-medium">Forecast entered</span>
          </div>
        </div>

        {/* Instructions */}
        <Card>
          <CardContent className="pt-6">
            <h4 className="font-semibold text-tp-dark mb-2">How to use</h4>
            <ul className="text-sm text-tp-dark-grey space-y-1">
              <li>• <strong className="text-tp-green">Annual column:</strong> Click to set annual projection - it auto-distributes to all 12 months (÷12)</li>
              <li>• Numbers in parentheses (e.g., "(£55,000)") show the default projections from the spreadsheet</li>
              <li>• Click any monthly cell to manually override that specific month</li>
              <li>• Press Enter to save, Escape to cancel</li>
              <li>• Forecasts appear in the P&L page as "Tgt" (Target) column alongside "Act" (Actual)</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
