import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Scenario, ScenarioCategory } from "@/types";

export function useScenarios(year: number = 2026) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScenarios = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("scenarios")
        .select("*")
        .eq("year", year)
        .eq("is_active", true)
        .order("category")
        .order("sort_order");

      if (error) throw error;
      setScenarios(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch scenarios");
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchScenarios();
  }, [fetchScenarios]);

  const updateScenario = async (
    id: string,
    updates: Partial<Pick<Scenario, "pessimistic" | "realistic" | "optimistic" | "notes">>
  ) => {
    try {
      const { error } = await supabase
        .from("scenarios")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
      await fetchScenarios();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to update scenario",
      };
    }
  };

  const createScenario = async (data: {
    year: number;
    category: ScenarioCategory;
    item_name: string;
    pessimistic: number;
    realistic: number;
    optimistic: number;
    notes?: string;
  }) => {
    try {
      const { error } = await supabase.from("scenarios").insert({
        ...data,
        sort_order: scenarios.filter((s) => s.category === data.category).length + 1,
      });

      if (error) throw error;
      await fetchScenarios();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to create scenario",
      };
    }
  };

  const deleteScenario = async (id: string) => {
    try {
      const { error } = await supabase
        .from("scenarios")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
      await fetchScenarios();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to delete scenario",
      };
    }
  };

  // Computed totals
  const revenueScenarios = scenarios.filter((s) => s.category === "revenue");
  const costScenarios = scenarios.filter((s) => s.category === "cost");

  const totals = {
    revenue: {
      pessimistic: revenueScenarios.reduce((sum, s) => sum + Number(s.pessimistic), 0),
      realistic: revenueScenarios.reduce((sum, s) => sum + Number(s.realistic), 0),
      optimistic: revenueScenarios.reduce((sum, s) => sum + Number(s.optimistic), 0),
    },
    costs: {
      pessimistic: costScenarios.reduce((sum, s) => sum + Number(s.pessimistic), 0),
      realistic: costScenarios.reduce((sum, s) => sum + Number(s.realistic), 0),
      optimistic: costScenarios.reduce((sum, s) => sum + Number(s.optimistic), 0),
    },
    grossProfit: {
      pessimistic: 0,
      realistic: 0,
      optimistic: 0,
    },
    profitPool: {
      pessimistic: 0,
      realistic: 0,
      optimistic: 0,
    },
    tarynShare: {
      pessimistic: 0,
      realistic: 0,
      optimistic: 0,
    },
  };

  // Calculate gross profit and profit pool
  const centralOverhead = 4200 * 12; // £4,200/month
  totals.grossProfit.pessimistic = totals.revenue.pessimistic - totals.costs.pessimistic;
  totals.grossProfit.realistic = totals.revenue.realistic - totals.costs.realistic;
  totals.grossProfit.optimistic = totals.revenue.optimistic - totals.costs.optimistic;

  totals.profitPool.pessimistic = Math.max(0, totals.grossProfit.pessimistic - centralOverhead);
  totals.profitPool.realistic = Math.max(0, totals.grossProfit.realistic - centralOverhead);
  totals.profitPool.optimistic = Math.max(0, totals.grossProfit.optimistic - centralOverhead);

  totals.tarynShare.pessimistic = totals.profitPool.pessimistic * 0.12;
  totals.tarynShare.realistic = totals.profitPool.realistic * 0.12;
  totals.tarynShare.optimistic = totals.profitPool.optimistic * 0.12;

  return {
    scenarios,
    revenueScenarios,
    costScenarios,
    totals,
    loading,
    error,
    updateScenario,
    createScenario,
    deleteScenario,
    refetch: fetchScenarios,
  };
}
