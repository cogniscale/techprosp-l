import React, { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus, Users, Pencil, Trash2, Loader2 } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTeamMembers, useHRCosts, useMonthlyHRCosts } from "@/hooks/useTeamMembers";
import { useDataRefresh } from "@/context/ChatContext";
import { formatGBP } from "@/lib/formatters";
import type { TeamMember } from "@/types";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export function TeamHRPage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editingCost, setEditingCost] = useState<{ memberId: string; month: number } | null>(null);

  const { teamMembers, activeTeamMembers, loading: membersLoading, createTeamMember, updateTeamMember, deleteTeamMember, refetch: refetchMembers } = useTeamMembers();
  const { hrCosts, upsertHRCost, loading: costsLoading, refetch: refetchCosts } = useHRCosts(selectedYear);
  const { monthlyTotals } = useMonthlyHRCosts(selectedYear);

  // Refresh data when chat makes changes
  const handleDataRefresh = useCallback(() => {
    refetchMembers();
    refetchCosts();
  }, [refetchMembers, refetchCosts]);

  useDataRefresh(handleDataRefresh);

  // Get HR cost for a specific member and month
  const getCostEntry = (memberId: string, month: number) => {
    const monthKey = `${selectedYear}-${String(month + 1).padStart(2, "0")}`;
    return hrCosts.find(
      (c) => c.team_member_id === memberId && c.cost_month.startsWith(monthKey)
    );
  };

  // Get effective cost for a member in a month
  const getEffectiveCost = (member: TeamMember, month: number) => {
    const entry = getCostEntry(member.id, month);
    if (entry) {
      return {
        base: entry.actual_cost !== null ? entry.actual_cost : member.default_monthly_cost,
        bonus: entry.bonus || 0,
        hasEntry: true,
        isOverride: entry.actual_cost !== null && entry.actual_cost !== member.default_monthly_cost,
      };
    }
    return {
      base: member.default_monthly_cost,
      bonus: 0,
      hasEntry: false,
      isOverride: false,
    };
  };

  // Calculate YTD totals
  const ytdTotals = Object.entries(monthlyTotals)
    .filter(([key]) => key.startsWith(String(selectedYear)))
    .reduce(
      (acc, [, data]) => ({
        base: acc.base + data.baseCost,
        bonus: acc.bonus + data.bonus,
        total: acc.total + data.total,
      }),
      { base: 0, bonus: 0, total: 0 }
    );

  return (
    <PageContainer title="Team / HR Costs">
      <div className="space-y-6">
        {/* Year selector and summary */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => setSelectedYear((y) => y - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-semibold text-tp-dark font-heading min-w-[100px] text-center">
              {selectedYear}
            </h2>
            <Button variant="outline" size="icon" onClick={() => setSelectedYear((y) => y + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-tp-dark-grey">YTD Base: </span>
              <span className="font-semibold text-tp-dark">{formatGBP(ytdTotals.base)}</span>
            </div>
            <div>
              <span className="text-tp-dark-grey">YTD Bonus: </span>
              <span className="font-semibold text-tp-dark">{formatGBP(ytdTotals.bonus)}</span>
            </div>
            <div className="text-base">
              <span className="text-tp-dark-grey">YTD Total: </span>
              <span className="font-bold text-tp-dark">{formatGBP(ytdTotals.total)}</span>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Team Members List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team Members
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowAddMember(true)}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </CardHeader>
              <CardContent>
                {membersLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-tp-blue" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {teamMembers.map((member) => (
                      <div
                        key={member.id}
                        className={`p-3 rounded-lg border ${
                          member.is_active ? "bg-white border-tp-light-grey" : "bg-tp-light border-tp-light-grey/50 opacity-60"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-tp-dark text-sm">{member.name}</p>
                            {member.role && (
                              <p className="text-xs text-tp-dark-grey">{member.role}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                member.employment_type === "fte"
                                  ? "bg-tp-blue/10 text-tp-blue"
                                  : "bg-tp-green/10 text-tp-green"
                              }`}>
                                {member.employment_type === "fte" ? "FTE" : "Contractor"}
                              </span>
                              <span className="text-xs text-tp-dark-grey">
                                {formatGBP(member.default_monthly_cost)}/mo
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => setEditingMember(member)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Monthly Cost Grid */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Monthly HR Costs - {selectedYear}</CardTitle>
              </CardHeader>
              <CardContent>
                {costsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-tp-blue" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-tp-light-grey">
                          <th rowSpan={2} className="text-left py-2 pr-4 font-medium text-tp-dark-grey align-bottom">Team Member</th>
                          {MONTHS.map((month, i) => (
                            <th
                              key={month}
                              colSpan={2}
                              className={`text-center py-1 px-1 font-medium border-b border-tp-light-grey/50 ${
                                i === currentMonth && selectedYear === currentYear
                                  ? "text-tp-blue"
                                  : "text-tp-dark-grey"
                              }`}
                            >
                              {month}
                            </th>
                          ))}
                          <th rowSpan={2} className="text-right py-2 pl-4 font-medium text-tp-dark-grey align-bottom">Total</th>
                        </tr>
                        <tr className="border-b border-tp-light-grey">
                          {MONTHS.map((month) => (
                            <React.Fragment key={`${month}-sub`}>
                              <th className="text-center py-1 px-1 text-[10px] font-normal text-tp-dark-grey min-w-[45px]">Tgt</th>
                              <th className="text-center py-1 px-1 text-[10px] font-normal text-tp-dark-grey min-w-[45px]">Act</th>
                            </React.Fragment>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {activeTeamMembers.map((member) => {
                          const rowTotal = MONTHS.reduce((sum, _, i) => {
                            const cost = getEffectiveCost(member, i);
                            return sum + cost.base + cost.bonus;
                          }, 0);

                          return (
                            <tr key={member.id} className="border-b border-tp-light-grey/50 hover:bg-tp-light/50">
                              <td className="py-2 pr-4">
                                <span className="font-medium text-tp-dark">{member.name}</span>
                              </td>
                              {MONTHS.map((_, monthIndex) => {
                                const cost = getEffectiveCost(member, monthIndex);
                                const isEditing = editingCost?.memberId === member.id && editingCost?.month === monthIndex;
                                const isPast = selectedYear < currentYear || (selectedYear === currentYear && monthIndex <= currentMonth);

                                return (
                                  <React.Fragment key={monthIndex}>
                                    {/* Tgt (Target) column - always shows default cost */}
                                    <td className="py-1 px-1 text-center">
                                      <span className="text-xs tabular-nums text-tp-dark-grey">
                                        {formatGBP(member.default_monthly_cost).replace("£", "")}
                                      </span>
                                    </td>
                                    {/* Act (Actual) column - editable, shows recorded cost */}
                                    <td className="py-1 px-1 text-center">
                                      {isEditing ? (
                                        <CostEditCell
                                          member={member}
                                          month={monthIndex}
                                          year={selectedYear}
                                          initialBase={cost.base}
                                          initialBonus={cost.bonus}
                                          onSave={async (base, bonus) => {
                                            await upsertHRCost({
                                              team_member_id: member.id,
                                              cost_month: `${selectedYear}-${String(monthIndex + 1).padStart(2, "0")}-01`,
                                              actual_cost: base !== member.default_monthly_cost ? base : null,
                                              bonus,
                                            });
                                            setEditingCost(null);
                                          }}
                                          onCancel={() => setEditingCost(null)}
                                        />
                                      ) : (
                                        <button
                                          onClick={() => setEditingCost({ memberId: member.id, month: monthIndex })}
                                          className={`w-full px-1 py-1 rounded text-xs tabular-nums transition-colors ${
                                            cost.hasEntry
                                              ? cost.isOverride
                                                ? "bg-tp-purple/10 text-tp-purple font-medium"
                                                : "bg-tp-blue/10 text-tp-blue"
                                              : isPast
                                              ? "text-tp-dark-grey hover:bg-tp-light"
                                              : "text-tp-light-grey hover:bg-tp-light"
                                          }`}
                                        >
                                          {cost.hasEntry ? (
                                            <>
                                              <span className="block">{formatGBP(cost.base).replace("£", "")}</span>
                                              {cost.bonus > 0 && (
                                                <span className="block text-tp-green text-[10px]">+{formatGBP(cost.bonus).replace("£", "")}</span>
                                              )}
                                            </>
                                          ) : (
                                            "-"
                                          )}
                                        </button>
                                      )}
                                    </td>
                                  </React.Fragment>
                                );
                              })}
                              <td className="py-2 pl-4 text-right">
                                <span className="font-semibold text-tp-dark tabular-nums">{formatGBP(rowTotal)}</span>
                              </td>
                            </tr>
                          );
                        })}
                        {/* Monthly totals row */}
                        <tr className="bg-tp-light font-semibold">
                          <td className="py-2 pr-4 text-tp-dark">Monthly Total</td>
                          {MONTHS.map((_, monthIndex) => {
                            const monthKey = `${selectedYear}-${String(monthIndex + 1).padStart(2, "0")}`;
                            const monthData = monthlyTotals[monthKey] || { total: 0, baseCost: 0 };
                            // Calculate target total for this month (sum of all active members' default costs)
                            const targetTotal = activeTeamMembers.reduce((sum, m) => sum + m.default_monthly_cost, 0);
                            return (
                              <React.Fragment key={monthIndex}>
                                {/* Tgt total */}
                                <td className="py-2 px-1 text-center text-tp-dark-grey tabular-nums text-xs">
                                  {formatGBP(targetTotal).replace("£", "")}
                                </td>
                                {/* Act total */}
                                <td className="py-2 px-1 text-center text-tp-dark tabular-nums text-xs">
                                  {monthData.total > 0 ? formatGBP(monthData.total).replace("£", "") : "-"}
                                </td>
                              </React.Fragment>
                            );
                          })}
                          <td className="py-2 pl-4 text-right text-tp-dark tabular-nums">
                            {formatGBP(ytdTotals.total)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Note about Taryn */}
            <div className="mt-4 p-4 bg-tp-light rounded-lg">
              <p className="text-sm text-tp-dark-grey">
                <strong className="text-tp-dark">Note:</strong> Taryn's base salary ({formatGBP(3800)}/mo) is counted as an HR cost.
                Her 12% profit share is calculated separately in the P&L and does NOT count as a cost.
              </p>
            </div>
          </div>
        </div>

        {/* Add/Edit Member Modal */}
        {(showAddMember || editingMember) && (
          <TeamMemberModal
            member={editingMember}
            onSave={async (data) => {
              if (editingMember) {
                await updateTeamMember(editingMember.id, data);
              } else {
                await createTeamMember(data as Parameters<typeof createTeamMember>[0]);
              }
              setShowAddMember(false);
              setEditingMember(null);
            }}
            onDelete={editingMember ? async () => {
              if (confirm(`Delete ${editingMember.name}? This will also delete all their HR cost entries.`)) {
                await deleteTeamMember(editingMember.id);
                setEditingMember(null);
              }
            } : undefined}
            onClose={() => {
              setShowAddMember(false);
              setEditingMember(null);
            }}
          />
        )}
      </div>
    </PageContainer>
  );
}

// Inline cost edit cell
function CostEditCell({
  member,
  initialBase,
  initialBonus,
  onSave,
  onCancel,
}: {
  member: TeamMember;
  month: number;
  year: number;
  initialBase: number;
  initialBonus: number;
  onSave: (base: number, bonus: number) => void;
  onCancel: () => void;
}) {
  const [base, setBase] = useState(String(initialBase));
  const [bonus, setBonus] = useState(String(initialBonus));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(parseFloat(base) || 0, parseFloat(bonus) || 0);
    setSaving(false);
  };

  return (
    <div className="p-2 bg-white border border-tp-blue rounded shadow-lg min-w-[120px]">
      <div className="space-y-2">
        <div>
          <label className="text-[10px] text-tp-dark-grey">Base</label>
          <Input
            type="number"
            value={base}
            onChange={(e) => setBase(e.target.value)}
            className="h-7 text-xs"
            placeholder={String(member.default_monthly_cost)}
          />
        </div>
        <div>
          <label className="text-[10px] text-tp-dark-grey">Bonus</label>
          <Input
            type="number"
            value={bonus}
            onChange={(e) => setBonus(e.target.value)}
            className="h-7 text-xs"
            placeholder="0"
          />
        </div>
        <div className="flex gap-1">
          <Button size="sm" className="h-6 text-xs flex-1" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
          </Button>
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// Team member add/edit modal
function TeamMemberModal({
  member,
  onSave,
  onDelete,
  onClose,
}: {
  member: TeamMember | null;
  onSave: (data: Partial<TeamMember> & { employment_type: "fte" | "contractor" }) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(member?.name || "");
  const [role, setRole] = useState(member?.role || "");
  const [employmentType, setEmploymentType] = useState<"fte" | "contractor">(member?.employment_type || "contractor");
  const [defaultCost, setDefaultCost] = useState(String(member?.default_monthly_cost || ""));
  const [supplierNames, setSupplierNames] = useState(member?.supplier_names?.join(", ") || "");
  const [notes, setNotes] = useState(member?.notes || "");
  const [isActive, setIsActive] = useState(member?.is_active ?? true);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      name,
      role: role || undefined,
      employment_type: employmentType,
      default_monthly_cost: parseFloat(defaultCost) || 0,
      supplier_names: supplierNames ? supplierNames.split(",").map((s) => s.trim()) : [],
      notes: notes || undefined,
      is_active: isActive,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h3 className="text-lg font-semibold text-tp-dark mb-4">
          {member ? "Edit Team Member" : "Add Team Member"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Aamir"
            />
          </div>

          <div>
            <Label htmlFor="role">Role</Label>
            <Input
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Technology"
            />
          </div>

          <div>
            <Label>Employment Type *</Label>
            <div className="flex gap-4 mt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={employmentType === "fte"}
                  onChange={() => setEmploymentType("fte")}
                  className="w-4 h-4 text-tp-blue"
                />
                <span className="text-sm">FTE (Fixed monthly)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={employmentType === "contractor"}
                  onChange={() => setEmploymentType("contractor")}
                  className="w-4 h-4 text-tp-blue"
                />
                <span className="text-sm">Contractor (Invoice-based)</span>
              </label>
            </div>
          </div>

          <div>
            <Label htmlFor="defaultCost">Default Monthly Cost (GBP) *</Label>
            <Input
              id="defaultCost"
              type="number"
              step="0.01"
              value={defaultCost}
              onChange={(e) => setDefaultCost(e.target.value)}
              required
              placeholder="e.g. 1800"
            />
          </div>

          {employmentType === "contractor" && (
            <div>
              <Label htmlFor="supplierNames">Supplier Names (for invoice matching)</Label>
              <Input
                id="supplierNames"
                value={supplierNames}
                onChange={(e) => setSupplierNames(e.target.value)}
                placeholder="e.g. Aamir Khan, A Khan Ltd"
              />
              <p className="text-xs text-tp-dark-grey mt-1">
                Comma-separated names that appear on invoices
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
            />
          </div>

          {member && (
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-tp-blue"
                />
                <span className="text-sm">Active</span>
              </label>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {member ? "Update" : "Add"} Member
            </Button>
            {onDelete && (
              <Button type="button" variant="outline" onClick={onDelete} className="text-red-600 hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
