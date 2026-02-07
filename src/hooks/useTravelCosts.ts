import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";

export interface TravelCost {
  id: string;
  cost_month: string;
  budgeted_amount: number;
  actual_amount: number | null;
  description: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useTravelCosts(year: number) {
  const [travelCosts, setTravelCosts] = useState<TravelCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTravelCosts = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("travel_costs")
        .select("*")
        .gte("cost_month", `${year}-01-01`)
        .lte("cost_month", `${year}-12-31`)
        .order("cost_month");

      if (error) throw error;
      setTravelCosts(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch travel costs");
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchTravelCosts();
  }, [fetchTravelCosts]);

  const upsertTravelCost = async (costData: {
    cost_month: string;
    budgeted_amount?: number;
    actual_amount?: number | null;
    description?: string;
    notes?: string;
  }) => {
    try {
      // Check if entry exists
      const { data: existing } = await supabase
        .from("travel_costs")
        .select("id")
        .eq("cost_month", costData.cost_month)
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("travel_costs")
          .update({
            budgeted_amount: costData.budgeted_amount,
            actual_amount: costData.actual_amount,
            description: costData.description,
            notes: costData.notes,
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase.from("travel_costs").insert({
          cost_month: costData.cost_month,
          budgeted_amount: costData.budgeted_amount || 375,
          actual_amount: costData.actual_amount,
          description: costData.description,
          notes: costData.notes,
        });

        if (error) throw error;
      }

      await fetchTravelCosts();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to save travel cost",
      };
    }
  };

  // Build monthly totals with defaults
  const monthlyTotals: Record<string, { budgeted: number; actual: number }> = {};

  for (let month = 1; month <= 12; month++) {
    const monthKey = `${year}-${String(month).padStart(2, "0")}`;
    const entry = travelCosts.find((tc) => tc.cost_month.startsWith(monthKey));
    monthlyTotals[monthKey] = {
      budgeted: entry ? Number(entry.budgeted_amount) : 375,
      actual: entry?.actual_amount !== null && entry?.actual_amount !== undefined
        ? Number(entry.actual_amount)
        : (entry ? Number(entry.budgeted_amount) : 375),
    };
  }

  return {
    travelCosts,
    monthlyTotals,
    loading,
    error,
    upsertTravelCost,
    refetch: fetchTravelCosts,
  };
}

// Hook for getting monthly travel total (for P&L)
// Returns both budget and actual separately
export function useMonthlyTravelCost(year: number) {
  const [monthlyTotals, setMonthlyTotals] = useState<Record<string, { total: number; budget: number; actual: number; isReconciled: boolean }>>({});
  const [loading, setLoading] = useState(true);

  const fetchMonthlyTravelCosts = useCallback(async () => {
    try {
      setLoading(true);

      const { data } = await supabase
        .from("travel_costs")
        .select("*")
        .gte("cost_month", `${year}-01-01`)
        .lte("cost_month", `${year}-12-31`);

      // Build lookup
      const lookup: Record<string, TravelCost> = {};
      data?.forEach((tc) => {
        const monthKey = tc.cost_month.slice(0, 7);
        lookup[monthKey] = tc;
      });

      // Build monthly totals with defaults
      const byMonth: Record<string, { total: number; budget: number; actual: number; isReconciled: boolean }> = {};
      for (let month = 1; month <= 12; month++) {
        const monthKey = `${year}-${String(month).padStart(2, "0")}`;
        const entry = lookup[monthKey];
        const budget = entry ? Number(entry.budgeted_amount) : 375;
        const hasActual = entry?.actual_amount !== null && entry?.actual_amount !== undefined;
        const actual = hasActual ? Number(entry.actual_amount) : 0;

        byMonth[monthKey] = {
          budget,
          actual,
          isReconciled: hasActual,
          total: hasActual ? actual : budget, // For backwards compatibility
        };
      }

      setMonthlyTotals(byMonth);
    } catch (err) {
      console.error("Failed to fetch travel costs:", err);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchMonthlyTravelCosts();
  }, [fetchMonthlyTravelCosts]);

  return { monthlyTotals, loading, refetch: fetchMonthlyTravelCosts };
}
