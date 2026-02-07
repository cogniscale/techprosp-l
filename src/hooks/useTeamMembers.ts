import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import type { TeamMember, HRCost } from "@/types";

export function useTeamMembers() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeamMembers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .order("name");

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch team members");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  const createTeamMember = async (memberData: {
    name: string;
    role?: string;
    employment_type: "fte" | "contractor";
    default_monthly_cost: number;
    currency?: string;
    supplier_names?: string[];
    notes?: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from("team_members")
        .insert({
          name: memberData.name,
          role: memberData.role,
          employment_type: memberData.employment_type,
          default_monthly_cost: memberData.default_monthly_cost,
          currency: memberData.currency || "GBP",
          supplier_names: memberData.supplier_names || [],
          notes: memberData.notes,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchTeamMembers();
      return { success: true, teamMember: data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to create team member",
      };
    }
  };

  const updateTeamMember = async (
    memberId: string,
    updates: Partial<TeamMember>
  ) => {
    try {
      const { error } = await supabase
        .from("team_members")
        .update(updates)
        .eq("id", memberId);

      if (error) throw error;

      await fetchTeamMembers();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to update team member",
      };
    }
  };

  const deleteTeamMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      await fetchTeamMembers();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to delete team member",
      };
    }
  };

  // Match supplier name from invoice to team member
  const matchSupplierToTeamMember = (supplierName: string): TeamMember | null => {
    const normalizedSupplier = supplierName.toLowerCase().trim();

    for (const member of teamMembers) {
      // Check against supplier_names array
      if (member.supplier_names) {
        for (const name of member.supplier_names) {
          if (normalizedSupplier.includes(name.toLowerCase()) ||
              name.toLowerCase().includes(normalizedSupplier)) {
            return member;
          }
        }
      }

      // Also check against member name
      if (normalizedSupplier.includes(member.name.toLowerCase()) ||
          member.name.toLowerCase().includes(normalizedSupplier)) {
        return member;
      }
    }

    return null;
  };

  return {
    teamMembers,
    activeTeamMembers: teamMembers.filter(m => m.is_active),
    loading,
    error,
    createTeamMember,
    updateTeamMember,
    deleteTeamMember,
    matchSupplierToTeamMember,
    refetch: fetchTeamMembers,
  };
}

export function useHRCosts(year: number) {
  const [hrCosts, setHRCosts] = useState<(HRCost & { team_member: TeamMember })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHRCosts = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("hr_costs")
        .select(`
          *,
          team_member:team_members(*)
        `)
        .gte("cost_month", `${year}-01-01`)
        .lte("cost_month", `${year}-12-31`)
        .order("cost_month");

      if (error) throw error;
      setHRCosts(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch HR costs");
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchHRCosts();
  }, [fetchHRCosts]);

  const upsertHRCost = async (costData: {
    team_member_id: string;
    cost_month: string;
    actual_cost?: number | null;
    bonus?: number;
    source_document_id?: string;
    notes?: string;
  }) => {
    try {
      // Check if entry exists
      const { data: existing } = await supabase
        .from("hr_costs")
        .select("id")
        .eq("team_member_id", costData.team_member_id)
        .eq("cost_month", costData.cost_month)
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("hr_costs")
          .update({
            actual_cost: costData.actual_cost,
            bonus: costData.bonus || 0,
            source_document_id: costData.source_document_id,
            notes: costData.notes,
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("hr_costs")
          .insert({
            team_member_id: costData.team_member_id,
            cost_month: costData.cost_month,
            actual_cost: costData.actual_cost,
            bonus: costData.bonus || 0,
            source_document_id: costData.source_document_id,
            notes: costData.notes,
          });

        if (error) throw error;
      }

      await fetchHRCosts();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to save HR cost",
      };
    }
  };

  const deleteHRCost = async (costId: string) => {
    try {
      const { error } = await supabase
        .from("hr_costs")
        .delete()
        .eq("id", costId);

      if (error) throw error;

      await fetchHRCosts();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to delete HR cost",
      };
    }
  };

  return {
    hrCosts,
    loading,
    error,
    upsertHRCost,
    deleteHRCost,
    refetch: fetchHRCosts,
  };
}

// Hook for getting monthly HR totals (for P&L)
export function useMonthlyHRCosts(year: number) {
  const [monthlyTotals, setMonthlyTotals] = useState<
    Record<string, { baseCost: number; bonus: number; total: number; byMember: Record<string, { base: number; bonus: number }> }>
  >({});
  const [loading, setLoading] = useState(true);

  const fetchMonthlyHRCosts = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch HR costs for the year (with team member joined)
      const { data: hrCosts } = await supabase
        .from("hr_costs")
        .select(`*, team_member:team_members(*)`)
        .gte("cost_month", `${year}-01-01`)
        .lte("cost_month", `${year}-12-31`);

      // Initialize all months
      const byMonth: Record<string, { baseCost: number; bonus: number; total: number; byMember: Record<string, { base: number; bonus: number }> }> = {};

      for (let month = 1; month <= 12; month++) {
        const monthKey = `${year}-${String(month).padStart(2, "0")}`;
        byMonth[monthKey] = { baseCost: 0, bonus: 0, total: 0, byMember: {} };
      }

      // Process HR cost entries
      hrCosts?.forEach((cost) => {
        const monthKey = cost.cost_month.slice(0, 7);
        const member = cost.team_member as TeamMember;

        if (!byMonth[monthKey]) return;

        // Use actual_cost if set, otherwise use default
        const baseCost = cost.actual_cost !== null
          ? Number(cost.actual_cost)
          : Number(member?.default_monthly_cost || 0);
        const bonus = Number(cost.bonus || 0);

        byMonth[monthKey].baseCost += baseCost;
        byMonth[monthKey].bonus += bonus;
        byMonth[monthKey].total += baseCost + bonus;

        const memberName = member?.name || "Unknown";
        if (!byMonth[monthKey].byMember[memberName]) {
          byMonth[monthKey].byMember[memberName] = { base: 0, bonus: 0 };
        }
        byMonth[monthKey].byMember[memberName].base += baseCost;
        byMonth[monthKey].byMember[memberName].bonus += bonus;
      });

      setMonthlyTotals(byMonth);
    } catch (err) {
      console.error("Failed to fetch monthly HR costs:", err);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchMonthlyHRCosts();
  }, [fetchMonthlyHRCosts]);

  return { monthlyTotals, loading, refetch: fetchMonthlyHRCosts };
}
