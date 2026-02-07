import React, { useState, useCallback, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, Upload } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useSoftwareItems, useSoftwareCosts } from "@/hooks/useSoftwareCosts";
import { useDataRefresh } from "@/context/ChatContext";
import { formatGBP } from "@/lib/formatters";
import { CSVImportDialog } from "@/components/shared/CSVImportDialog";
import type { SoftwareItem } from "@/types";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

interface EditingCell {
  itemId: string;
  monthIndex: number;
  value: string;
  allocationValue: string;
}

interface NewItemForm {
  name: string;
  vendor: string;
  default_monthly_cost: string;
  techpros_allocation_percent: string;
}

export function SoftwareCostsPage() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [newItem, setNewItem] = useState<NewItemForm>({
    name: "",
    vendor: "",
    default_monthly_cost: "",
    techpros_allocation_percent: "100",
  });
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    activeSoftwareItems,
    loading: itemsLoading,
    createSoftwareItem,
    updateSoftwareItem,
    deleteSoftwareItem,
    refetch: refetchItems,
  } = useSoftwareItems();

  const {
    softwareCosts,
    loading: costsLoading,
    upsertSoftwareCost,
    refetch: refetchCosts,
  } = useSoftwareCosts(selectedYear);

  // Refresh data when chat makes changes
  const handleDataRefresh = useCallback(() => {
    refetchItems();
    refetchCosts();
  }, [refetchItems, refetchCosts]);

  useDataRefresh(handleDataRefresh);

  // Focus input when editing cell
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  // Build a lookup for cost overrides: { itemId: { monthKey: { cost, allocation } } }
  const costLookup: Record<string, Record<string, { actual_cost: number | null; techpros_allocation_percent: number | null }>> = {};
  softwareCosts.forEach((cost) => {
    const monthKey = cost.cost_month.slice(0, 7);
    if (!costLookup[cost.software_item_id]) {
      costLookup[cost.software_item_id] = {};
    }
    costLookup[cost.software_item_id][monthKey] = {
      actual_cost: cost.actual_cost,
      techpros_allocation_percent: cost.techpros_allocation_percent,
    };
  });

  const getEffectiveCost = (item: SoftwareItem, monthIndex: number): number => {
    const monthKey = `${selectedYear}-${String(monthIndex + 1).padStart(2, "0")}`;
    const override = costLookup[item.id]?.[monthKey];
    return override?.actual_cost !== undefined && override?.actual_cost !== null
      ? override.actual_cost
      : Number(item.default_monthly_cost);
  };

  const getEffectiveAllocation = (item: SoftwareItem, monthIndex: number): number => {
    const monthKey = `${selectedYear}-${String(monthIndex + 1).padStart(2, "0")}`;
    const override = costLookup[item.id]?.[monthKey];
    return override?.techpros_allocation_percent !== undefined && override?.techpros_allocation_percent !== null
      ? override.techpros_allocation_percent
      : item.techpros_allocation_percent;
  };

  const isOverridden = (item: SoftwareItem, monthIndex: number): boolean => {
    const monthKey = `${selectedYear}-${String(monthIndex + 1).padStart(2, "0")}`;
    return costLookup[item.id]?.[monthKey] !== undefined;
  };

  const hasAllocationOverride = (item: SoftwareItem, monthIndex: number): boolean => {
    const monthKey = `${selectedYear}-${String(monthIndex + 1).padStart(2, "0")}`;
    const override = costLookup[item.id]?.[monthKey];
    return override?.techpros_allocation_percent !== undefined && override?.techpros_allocation_percent !== null;
  };

  const handleCellClick = (item: SoftwareItem, monthIndex: number) => {
    const effectiveCost = getEffectiveCost(item, monthIndex);
    const effectiveAllocation = getEffectiveAllocation(item, monthIndex);
    setEditingCell({
      itemId: item.id,
      monthIndex,
      value: effectiveCost.toFixed(2),
      allocationValue: effectiveAllocation.toString(),
    });
  };

  const handleCellSave = async () => {
    if (!editingCell) return;

    const item = activeSoftwareItems.find((i) => i.id === editingCell.itemId);
    if (!item) return;

    const newValue = parseFloat(editingCell.value);
    const newAllocation = parseInt(editingCell.allocationValue);
    const monthKey = `${selectedYear}-${String(editingCell.monthIndex + 1).padStart(2, "0")}-01`;

    // If value equals default, remove override (set to null)
    const actualCost =
      Math.abs(newValue - Number(item.default_monthly_cost)) < 0.01
        ? null
        : newValue;

    // If allocation equals default, remove override (set to null)
    const allocationOverride =
      newAllocation === item.techpros_allocation_percent
        ? null
        : newAllocation;

    setSaving(true);
    await upsertSoftwareCost({
      software_item_id: item.id,
      cost_month: monthKey,
      actual_cost: actualCost,
      techpros_allocation_percent: allocationOverride,
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

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.default_monthly_cost) return;

    setSaving(true);
    const result = await createSoftwareItem({
      name: newItem.name,
      vendor: newItem.vendor || undefined,
      default_monthly_cost: parseFloat(newItem.default_monthly_cost),
      techpros_allocation_percent: parseInt(newItem.techpros_allocation_percent) || 100,
    });
    setSaving(false);

    if (result.success) {
      setShowAddDialog(false);
      setNewItem({
        name: "",
        vendor: "",
        default_monthly_cost: "",
        techpros_allocation_percent: "100",
      });
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this software item?")) return;
    await deleteSoftwareItem(itemId);
  };

  const handleDefaultCostChange = async (item: SoftwareItem, newDefault: string) => {
    const value = parseFloat(newDefault);
    if (isNaN(value)) return;
    await updateSoftwareItem(item.id, { default_monthly_cost: value });
  };

  // Handle CSV import
  const handleCSVImport = async (
    rows: Array<{ itemId: string; month: string; amount: number; isNew: boolean; newName?: string }>
  ) => {
    for (const row of rows) {
      let itemId = row.itemId;

      // Create new item if needed
      if (row.isNew && row.newName) {
        const result = await createSoftwareItem({
          name: row.newName,
          default_monthly_cost: row.amount,
          techpros_allocation_percent: 100,
        });
        if (result.success && result.item) {
          itemId = result.item.id;
        } else {
          continue;
        }
      }

      // Upsert the cost
      await upsertSoftwareCost({
        software_item_id: itemId,
        cost_month: `${row.month}-01`,
        actual_cost: row.amount,
      });
    }

    refetchItems();
    refetchCosts();
  };

  const handleCreateSoftwareItem = async (name: string): Promise<string | null> => {
    const result = await createSoftwareItem({
      name,
      default_monthly_cost: 0,
      techpros_allocation_percent: 100,
    });
    return result.success && result.item ? result.item.id : null;
  };

  // Calculate totals (using effective allocation which may be overridden)
  const monthlyTotals = MONTHS.map((_, monthIndex) => {
    return activeSoftwareItems.reduce((sum, item) => {
      const cost = getEffectiveCost(item, monthIndex);
      const allocation = getEffectiveAllocation(item, monthIndex);
      const allocated = cost * (allocation / 100);
      return sum + allocated;
    }, 0);
  });

  const ytdTotal = monthlyTotals.reduce((sum, total) => sum + total, 0);

  const loading = itemsLoading || costsLoading;

  return (
    <PageContainer title="Software Costs">
      <div className="space-y-4">
        {/* Header with year selector and add button */}
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
            <Button variant="outline" onClick={() => setShowImportDialog(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Software
            </Button>
          </div>
        </div>

        {/* Spreadsheet table */}
        <div className="border border-tp-light-grey rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-tp-light border-b border-tp-light-grey">
                  <th rowSpan={2} className="text-left px-3 py-2 font-semibold text-tp-dark sticky left-0 bg-tp-light min-w-[200px] align-bottom">
                    Software Item
                  </th>
                  <th rowSpan={2} className="text-right px-3 py-2 font-semibold text-tp-dark min-w-[70px] align-bottom">
                    Default
                  </th>
                  <th rowSpan={2} className="text-center px-2 py-2 font-semibold text-tp-dark-grey min-w-[40px] align-bottom">
                    %
                  </th>
                  {MONTHS.map((month) => (
                    <th
                      key={month}
                      colSpan={2}
                      className="text-center px-1 py-1 font-semibold text-tp-dark min-w-[90px] border-b border-tp-light-grey/50"
                    >
                      {month}
                    </th>
                  ))}
                  <th rowSpan={2} className="text-right px-3 py-2 font-semibold text-tp-dark bg-tp-light-grey/50 min-w-[90px] align-bottom">
                    YTD
                  </th>
                  <th rowSpan={2} className="w-10"></th>
                </tr>
                <tr className="bg-tp-light border-b border-tp-light-grey">
                  {MONTHS.map((month) => (
                    <React.Fragment key={`${month}-sub`}>
                      <th className="text-center px-1 py-1 text-[10px] font-normal text-tp-dark-grey min-w-[45px]">Tgt</th>
                      <th className="text-center px-1 py-1 text-[10px] font-normal text-tp-dark-grey min-w-[45px]">Act</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeSoftwareItems.map((item) => {
                  const itemYTD = MONTHS.reduce((sum, _, monthIndex) => {
                    const cost = getEffectiveCost(item, monthIndex);
                    const allocation = getEffectiveAllocation(item, monthIndex);
                    return sum + cost * (allocation / 100);
                  }, 0);

                  return (
                    <tr
                      key={item.id}
                      className="border-b border-tp-light-grey/50 hover:bg-tp-light/30"
                    >
                      {/* Item name */}
                      <td className="px-3 py-1.5 text-tp-dark font-medium sticky left-0 bg-white">
                        <div className="flex flex-col">
                          <span>{item.name}</span>
                          {item.vendor && (
                            <span className="text-xs text-tp-dark-grey">{item.vendor}</span>
                          )}
                        </div>
                      </td>

                      {/* Default cost (editable) */}
                      <td className="px-3 py-1.5 text-right">
                        <input
                          type="number"
                          step="0.01"
                          className="w-full text-right bg-transparent border-0 focus:ring-1 focus:ring-tp-blue rounded px-1 py-0.5 text-tp-dark-grey"
                          defaultValue={Number(item.default_monthly_cost).toFixed(2)}
                          onBlur={(e) => handleDefaultCostChange(item, e.target.value)}
                        />
                      </td>

                      {/* Allocation % */}
                      <td className="px-2 py-1.5 text-center text-tp-dark-grey text-xs">
                        {item.techpros_allocation_percent}%
                      </td>

                      {/* Monthly cells - Tgt and Act columns */}
                      {MONTHS.map((_, monthIndex) => {
                        const effectiveCost = getEffectiveCost(item, monthIndex);
                        const effectiveAllocation = getEffectiveAllocation(item, monthIndex);
                        const hasOverride = isOverridden(item, monthIndex);
                        const hasAllocOverride = hasAllocationOverride(item, monthIndex);
                        const defaultCost = Number(item.default_monthly_cost);

                        return (
                          <React.Fragment key={monthIndex}>
                            {/* Tgt (Target) column - shows default cost */}
                            <td className="px-1 py-1 text-center">
                              <span className="text-xs tabular-nums text-tp-dark-grey">
                                {formatGBP(defaultCost).replace("£", "")}
                              </span>
                            </td>
                            {/* Act (Actual) column - click to open edit dialog */}
                            <td className={`px-1 py-1 text-center ${hasOverride ? "bg-tp-blue/5" : ""}`}>
                              <button
                                onClick={() => handleCellClick(item, monthIndex)}
                                className={`w-full text-center px-1 py-1 rounded hover:bg-tp-light transition-colors text-xs tabular-nums ${
                                  hasOverride
                                    ? "text-tp-blue font-medium bg-tp-blue/10"
                                    : "text-tp-dark"
                                }`}
                                title={hasAllocOverride ? `Allocation: ${effectiveAllocation}%` : undefined}
                              >
                                {hasOverride ? (
                                  <>
                                    {formatGBP(effectiveCost).replace("£", "")}
                                    {hasAllocOverride && <span className="text-tp-green ml-0.5">*</span>}
                                  </>
                                ) : "-"}
                              </button>
                            </td>
                          </React.Fragment>
                        );
                      })}

                      {/* YTD */}
                      <td className="px-3 py-1.5 text-right font-medium text-tp-dark bg-tp-light-grey/20">
                        {formatGBP(itemYTD)}
                      </td>

                      {/* Delete */}
                      <td className="px-2 py-1.5">
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 text-tp-dark-grey hover:text-error rounded transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {/* Totals row */}
                <tr className="bg-tp-light border-t-2 border-tp-dark font-semibold">
                  <td className="px-3 py-2 text-tp-dark sticky left-0 bg-tp-light">
                    TOTAL
                  </td>
                  <td></td>
                  <td></td>
                  {MONTHS.map((_, monthIndex) => {
                    // Calculate target total (sum of all defaults * default allocation)
                    const targetTotal = activeSoftwareItems.reduce((sum, item) => {
                      return sum + Number(item.default_monthly_cost) * (item.techpros_allocation_percent / 100);
                    }, 0);
                    // Calculate actual total (use effective cost and allocation which considers overrides)
                    const actualTotal = activeSoftwareItems.reduce((sum, item) => {
                      const cost = getEffectiveCost(item, monthIndex);
                      const allocation = getEffectiveAllocation(item, monthIndex);
                      return sum + cost * (allocation / 100);
                    }, 0);
                    const hasAnyOverride = activeSoftwareItems.some(item => isOverridden(item, monthIndex));
                    return (
                      <React.Fragment key={monthIndex}>
                        {/* Tgt total */}
                        <td className="px-1 py-2 text-center text-tp-dark-grey text-xs tabular-nums">
                          {formatGBP(targetTotal).replace("£", "")}
                        </td>
                        {/* Act total */}
                        <td className="px-1 py-2 text-center text-tp-dark text-xs tabular-nums">
                          {hasAnyOverride ? formatGBP(actualTotal).replace("£", "") : "-"}
                        </td>
                      </React.Fragment>
                    );
                  })}
                  <td className="px-3 py-2 text-right text-tp-dark bg-tp-green/10">
                    {formatGBP(ytdTotal)}
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 text-xs text-tp-dark-grey">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-white border border-tp-light-grey"></div>
            <span>Default value</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-tp-blue/10 border border-tp-blue/30"></div>
            <span className="text-tp-blue font-medium">Overridden cost</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-tp-green font-medium">*</span>
            <span>Allocation % override</span>
          </div>
        </div>
      </div>

      {/* Add Software Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Software Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-tp-dark">Name *</label>
              <Input
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                placeholder="e.g., Slack"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-tp-dark">Vendor</label>
              <Input
                value={newItem.vendor}
                onChange={(e) => setNewItem({ ...newItem, vendor: e.target.value })}
                placeholder="e.g., Slack Technologies"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-tp-dark">
                Default Monthly Cost (GBP) *
              </label>
              <Input
                type="number"
                step="0.01"
                value={newItem.default_monthly_cost}
                onChange={(e) =>
                  setNewItem({ ...newItem, default_monthly_cost: e.target.value })
                }
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-tp-dark">
                TechPros Allocation %
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                value={newItem.techpros_allocation_percent}
                onChange={(e) =>
                  setNewItem({ ...newItem, techpros_allocation_percent: e.target.value })
                }
                placeholder="100"
              />
              <p className="text-xs text-tp-dark-grey mt-1">
                Percentage of cost allocated to TechPros (vs personal)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddItem}
              disabled={saving || !newItem.name || !newItem.default_monthly_cost}
            >
              {saving ? "Adding..." : "Add Software"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <CSVImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        title="Import Software Costs from CSV"
        existingItems={activeSoftwareItems.map((item) => ({ id: item.id, name: item.name }))}
        onImport={handleCSVImport}
        onCreateItem={handleCreateSoftwareItem}
      />

      {/* Edit Cost Dialog */}
      <Dialog open={!!editingCell} onOpenChange={(open) => !open && setEditingCell(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Edit {editingCell && activeSoftwareItems.find(i => i.id === editingCell.itemId)?.name}
              {editingCell && ` - ${MONTHS[editingCell.monthIndex]} ${selectedYear}`}
            </DialogTitle>
          </DialogHeader>
          {editingCell && (
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-tp-dark">Cost (GBP)</label>
                <Input
                  ref={inputRef}
                  type="number"
                  step="0.01"
                  value={editingCell.value}
                  onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                  onKeyDown={handleKeyDown}
                />
                <p className="text-xs text-tp-dark-grey mt-1">
                  Default: {formatGBP(Number(activeSoftwareItems.find(i => i.id === editingCell.itemId)?.default_monthly_cost || 0))}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-tp-dark">TechPros Allocation %</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={editingCell.allocationValue}
                  onChange={(e) => setEditingCell({ ...editingCell, allocationValue: e.target.value })}
                  onKeyDown={handleKeyDown}
                />
                <p className="text-xs text-tp-dark-grey mt-1">
                  Default: {activeSoftwareItems.find(i => i.id === editingCell.itemId)?.techpros_allocation_percent}%
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleCellCancel}>
              Cancel
            </Button>
            <Button onClick={handleCellSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
