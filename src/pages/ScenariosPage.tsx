import { useState } from "react";
import { Plus, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useScenarios } from "@/hooks/useScenarios";
import { formatGBP } from "@/lib/formatters";
import type { ScenarioCategory } from "@/types";

export function ScenariosPage() {
  const [year, setYear] = useState(2026);
  const {
    revenueScenarios,
    costScenarios,
    totals,
    loading,
    updateScenario,
    createScenario,
  } = useScenarios(year);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ pessimistic: "", realistic: "", optimistic: "" });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addCategory, setAddCategory] = useState<ScenarioCategory>("revenue");
  const [newItem, setNewItem] = useState({
    item_name: "",
    pessimistic: "",
    realistic: "",
    optimistic: "",
    notes: "",
  });

  const startEdit = (id: string, pess: number, real: number, opt: number) => {
    setEditingId(id);
    setEditValues({
      pessimistic: String(pess),
      realistic: String(real),
      optimistic: String(opt),
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await updateScenario(editingId, {
      pessimistic: parseFloat(editValues.pessimistic) || 0,
      realistic: parseFloat(editValues.realistic) || 0,
      optimistic: parseFloat(editValues.optimistic) || 0,
    });
    setEditingId(null);
  };

  const handleAddItem = async () => {
    if (!newItem.item_name) return;
    await createScenario({
      year,
      category: addCategory,
      item_name: newItem.item_name,
      pessimistic: parseFloat(newItem.pessimistic) || 0,
      realistic: parseFloat(newItem.realistic) || 0,
      optimistic: parseFloat(newItem.optimistic) || 0,
      notes: newItem.notes || undefined,
    });
    setShowAddDialog(false);
    setNewItem({ item_name: "", pessimistic: "", realistic: "", optimistic: "", notes: "" });
  };

  const openAddDialog = (category: ScenarioCategory) => {
    setAddCategory(category);
    setShowAddDialog(true);
  };

  return (
    <PageContainer title="Scenario Planning">
      <div className="space-y-6">
        {/* Year Selector */}
        <div className="flex items-center justify-between">
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
          <div className="text-sm text-tp-dark-grey">
            Pessimistic → Realistic → Optimistic
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-tp-dark-grey uppercase tracking-wide">Gross Profit</div>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-red-600">Pess:</span>
                  <span className="font-medium">{formatGBP(totals.grossProfit.pessimistic)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-yellow-600">Real:</span>
                  <span className="font-medium">{formatGBP(totals.grossProfit.realistic)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Opt:</span>
                  <span className="font-medium">{formatGBP(totals.grossProfit.optimistic)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-tp-dark-grey uppercase tracking-wide">Profit Pool</div>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-red-600">Pess:</span>
                  <span className="font-medium">{formatGBP(totals.profitPool.pessimistic)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-yellow-600">Real:</span>
                  <span className="font-medium">{formatGBP(totals.profitPool.realistic)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Opt:</span>
                  <span className="font-medium">{formatGBP(totals.profitPool.optimistic)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-tp-dark-grey uppercase tracking-wide">Taryn's Share (12%)</div>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-red-600">Pess:</span>
                  <span className="font-medium">{formatGBP(totals.tarynShare.pessimistic)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-yellow-600">Real:</span>
                  <span className="font-medium">{formatGBP(totals.tarynShare.realistic)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Opt:</span>
                  <span className="font-medium">{formatGBP(totals.tarynShare.optimistic)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-tp-dark-grey uppercase tracking-wide">Range</div>
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <span>{formatGBP(totals.tarynShare.pessimistic)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Minus className="h-4 w-4 text-yellow-500" />
                  <span>{formatGBP(totals.tarynShare.realistic)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span>{formatGBP(totals.tarynShare.optimistic)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <p className="text-sm text-tp-dark-grey">Loading scenarios...</p>
        ) : (
          <>
            {/* Revenue Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Revenue Scenarios</CardTitle>
                <Button size="sm" variant="outline" onClick={() => openAddDialog("revenue")}>
                  <Plus className="h-4 w-4 mr-1" /> Add Revenue
                </Button>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-tp-dark">
                      <th className="text-left py-2 px-2 font-semibold">Revenue Source</th>
                      <th className="text-right py-2 px-2 font-semibold text-red-600">Pessimistic</th>
                      <th className="text-right py-2 px-2 font-semibold text-yellow-600">Realistic</th>
                      <th className="text-right py-2 px-2 font-semibold text-green-600">Optimistic</th>
                      <th className="text-left py-2 px-2 font-semibold">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueScenarios.map((s) => (
                      <tr
                        key={s.id}
                        className="border-b border-tp-light-grey/50 hover:bg-tp-light/30 cursor-pointer"
                        onClick={() => startEdit(s.id, s.pessimistic, s.realistic, s.optimistic)}
                      >
                        <td className="py-2 px-2 font-medium">{s.item_name}</td>
                        <td className="py-2 px-2 text-right">
                          {editingId === s.id ? (
                            <Input
                              type="number"
                              value={editValues.pessimistic}
                              onChange={(e) => setEditValues({ ...editValues, pessimistic: e.target.value })}
                              className="h-7 w-24 text-right"
                              onClick={(e) => e.stopPropagation()}
                              onBlur={saveEdit}
                              onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                            />
                          ) : (
                            formatGBP(s.pessimistic)
                          )}
                        </td>
                        <td className="py-2 px-2 text-right">
                          {editingId === s.id ? (
                            <Input
                              type="number"
                              value={editValues.realistic}
                              onChange={(e) => setEditValues({ ...editValues, realistic: e.target.value })}
                              className="h-7 w-24 text-right"
                              onClick={(e) => e.stopPropagation()}
                              onBlur={saveEdit}
                              onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                            />
                          ) : (
                            formatGBP(s.realistic)
                          )}
                        </td>
                        <td className="py-2 px-2 text-right">
                          {editingId === s.id ? (
                            <Input
                              type="number"
                              value={editValues.optimistic}
                              onChange={(e) => setEditValues({ ...editValues, optimistic: e.target.value })}
                              className="h-7 w-24 text-right"
                              onClick={(e) => e.stopPropagation()}
                              onBlur={saveEdit}
                              onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                            />
                          ) : (
                            formatGBP(s.optimistic)
                          )}
                        </td>
                        <td className="py-2 px-2 text-tp-dark-grey text-xs">{s.notes || "-"}</td>
                      </tr>
                    ))}
                    {/* Total Row */}
                    <tr className="border-t-2 border-tp-dark bg-tp-light font-bold">
                      <td className="py-2 px-2">TOTAL REVENUE</td>
                      <td className="py-2 px-2 text-right text-red-600">{formatGBP(totals.revenue.pessimistic)}</td>
                      <td className="py-2 px-2 text-right text-yellow-600">{formatGBP(totals.revenue.realistic)}</td>
                      <td className="py-2 px-2 text-right text-green-600">{formatGBP(totals.revenue.optimistic)}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Costs Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Cost Scenarios</CardTitle>
                <Button size="sm" variant="outline" onClick={() => openAddDialog("cost")}>
                  <Plus className="h-4 w-4 mr-1" /> Add Cost
                </Button>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-tp-dark">
                      <th className="text-left py-2 px-2 font-semibold">Cost Item</th>
                      <th className="text-right py-2 px-2 font-semibold text-red-600">Pessimistic</th>
                      <th className="text-right py-2 px-2 font-semibold text-yellow-600">Realistic</th>
                      <th className="text-right py-2 px-2 font-semibold text-green-600">Optimistic</th>
                      <th className="text-left py-2 px-2 font-semibold">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costScenarios.map((s) => (
                      <tr
                        key={s.id}
                        className="border-b border-tp-light-grey/50 hover:bg-tp-light/30 cursor-pointer"
                        onClick={() => startEdit(s.id, s.pessimistic, s.realistic, s.optimistic)}
                      >
                        <td className="py-2 px-2 font-medium">{s.item_name}</td>
                        <td className="py-2 px-2 text-right">
                          {editingId === s.id ? (
                            <Input
                              type="number"
                              value={editValues.pessimistic}
                              onChange={(e) => setEditValues({ ...editValues, pessimistic: e.target.value })}
                              className="h-7 w-24 text-right"
                              onClick={(e) => e.stopPropagation()}
                              onBlur={saveEdit}
                              onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                            />
                          ) : (
                            formatGBP(s.pessimistic)
                          )}
                        </td>
                        <td className="py-2 px-2 text-right">
                          {editingId === s.id ? (
                            <Input
                              type="number"
                              value={editValues.realistic}
                              onChange={(e) => setEditValues({ ...editValues, realistic: e.target.value })}
                              className="h-7 w-24 text-right"
                              onClick={(e) => e.stopPropagation()}
                              onBlur={saveEdit}
                              onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                            />
                          ) : (
                            formatGBP(s.realistic)
                          )}
                        </td>
                        <td className="py-2 px-2 text-right">
                          {editingId === s.id ? (
                            <Input
                              type="number"
                              value={editValues.optimistic}
                              onChange={(e) => setEditValues({ ...editValues, optimistic: e.target.value })}
                              className="h-7 w-24 text-right"
                              onClick={(e) => e.stopPropagation()}
                              onBlur={saveEdit}
                              onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                            />
                          ) : (
                            formatGBP(s.optimistic)
                          )}
                        </td>
                        <td className="py-2 px-2 text-tp-dark-grey text-xs">{s.notes || "-"}</td>
                      </tr>
                    ))}
                    {/* Total Row */}
                    <tr className="border-t-2 border-tp-dark bg-tp-light font-bold">
                      <td className="py-2 px-2">TOTAL DIRECT COSTS</td>
                      <td className="py-2 px-2 text-right text-red-600">{formatGBP(totals.costs.pessimistic)}</td>
                      <td className="py-2 px-2 text-right text-yellow-600">{formatGBP(totals.costs.realistic)}</td>
                      <td className="py-2 px-2 text-right text-green-600">{formatGBP(totals.costs.optimistic)}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Profit Calculations */}
            <Card>
              <CardHeader>
                <CardTitle>Profit Calculations</CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-tp-dark">
                      <th className="text-left py-2 px-2 font-semibold">Metric</th>
                      <th className="text-right py-2 px-2 font-semibold text-red-600">Pessimistic</th>
                      <th className="text-right py-2 px-2 font-semibold text-yellow-600">Realistic</th>
                      <th className="text-right py-2 px-2 font-semibold text-green-600">Optimistic</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-tp-light-grey/50">
                      <td className="py-2 px-2">Total Revenue</td>
                      <td className="py-2 px-2 text-right">{formatGBP(totals.revenue.pessimistic)}</td>
                      <td className="py-2 px-2 text-right">{formatGBP(totals.revenue.realistic)}</td>
                      <td className="py-2 px-2 text-right">{formatGBP(totals.revenue.optimistic)}</td>
                    </tr>
                    <tr className="border-b border-tp-light-grey/50">
                      <td className="py-2 px-2">Total Direct Costs</td>
                      <td className="py-2 px-2 text-right text-red-500">({formatGBP(totals.costs.pessimistic)})</td>
                      <td className="py-2 px-2 text-right text-red-500">({formatGBP(totals.costs.realistic)})</td>
                      <td className="py-2 px-2 text-right text-red-500">({formatGBP(totals.costs.optimistic)})</td>
                    </tr>
                    <tr className="border-b border-tp-light-grey bg-tp-light font-semibold">
                      <td className="py-2 px-2">Gross Profit</td>
                      <td className="py-2 px-2 text-right">{formatGBP(totals.grossProfit.pessimistic)}</td>
                      <td className="py-2 px-2 text-right">{formatGBP(totals.grossProfit.realistic)}</td>
                      <td className="py-2 px-2 text-right">{formatGBP(totals.grossProfit.optimistic)}</td>
                    </tr>
                    <tr className="border-b border-tp-light-grey/50">
                      <td className="py-2 px-2">Central Overhead (£4,200 × 12)</td>
                      <td className="py-2 px-2 text-right text-red-500">({formatGBP(50400)})</td>
                      <td className="py-2 px-2 text-right text-red-500">({formatGBP(50400)})</td>
                      <td className="py-2 px-2 text-right text-red-500">({formatGBP(50400)})</td>
                    </tr>
                    <tr className="border-b border-tp-light-grey bg-tp-light font-semibold">
                      <td className="py-2 px-2">Profit Pool</td>
                      <td className="py-2 px-2 text-right">{formatGBP(totals.profitPool.pessimistic)}</td>
                      <td className="py-2 px-2 text-right">{formatGBP(totals.profitPool.realistic)}</td>
                      <td className="py-2 px-2 text-right">{formatGBP(totals.profitPool.optimistic)}</td>
                    </tr>
                    <tr className="border-t-2 border-tp-dark bg-tp-blue/10 font-bold">
                      <td className="py-2 px-2">Taryn's Share (12%)</td>
                      <td className="py-2 px-2 text-right text-red-600">{formatGBP(totals.tarynShare.pessimistic)}</td>
                      <td className="py-2 px-2 text-right text-yellow-600">{formatGBP(totals.tarynShare.realistic)}</td>
                      <td className="py-2 px-2 text-right text-green-600">{formatGBP(totals.tarynShare.optimistic)}</td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Add Item Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {addCategory === "revenue" ? "Revenue" : "Cost"} Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Item Name *</label>
              <Input
                value={newItem.item_name}
                onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
                placeholder={addCategory === "revenue" ? "e.g., New Client" : "e.g., Marketing"}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium text-red-600">Pessimistic</label>
                <Input
                  type="number"
                  value={newItem.pessimistic}
                  onChange={(e) => setNewItem({ ...newItem, pessimistic: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-yellow-600">Realistic</label>
                <Input
                  type="number"
                  value={newItem.realistic}
                  onChange={(e) => setNewItem({ ...newItem, realistic: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-green-600">Optimistic</label>
                <Input
                  type="number"
                  value={newItem.optimistic}
                  onChange={(e) => setNewItem({ ...newItem, optimistic: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Input
                value={newItem.notes}
                onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                placeholder="Optional notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddItem} disabled={!newItem.item_name}>
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
