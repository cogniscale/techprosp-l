import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import type { SoftwareItem, SoftwareCost } from "@/types";

export function useSoftwareItems() {
  const [softwareItems, setSoftwareItems] = useState<SoftwareItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSoftwareItems = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("software_items")
        .select("*")
        .order("name");

      if (error) throw error;
      setSoftwareItems(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch software items");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSoftwareItems();
  }, [fetchSoftwareItems]);

  const createSoftwareItem = async (itemData: {
    name: string;
    vendor?: string;
    default_monthly_cost: number;
    techpros_allocation_percent?: number;
    notes?: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from("software_items")
        .insert({
          name: itemData.name,
          vendor: itemData.vendor || null,
          default_monthly_cost: itemData.default_monthly_cost,
          techpros_allocation_percent: itemData.techpros_allocation_percent ?? 100,
          notes: itemData.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchSoftwareItems();
      return { success: true, softwareItem: data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to create software item",
      };
    }
  };

  const updateSoftwareItem = async (
    itemId: string,
    updates: Partial<SoftwareItem>
  ) => {
    try {
      const { error } = await supabase
        .from("software_items")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", itemId);

      if (error) throw error;

      await fetchSoftwareItems();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to update software item",
      };
    }
  };

  const deleteSoftwareItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from("software_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      await fetchSoftwareItems();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to delete software item",
      };
    }
  };

  return {
    softwareItems,
    activeSoftwareItems: softwareItems.filter((s) => s.is_active),
    loading,
    error,
    createSoftwareItem,
    updateSoftwareItem,
    deleteSoftwareItem,
    refetch: fetchSoftwareItems,
  };
}

export function useSoftwareCosts(year: number) {
  const [softwareCosts, setSoftwareCosts] = useState<
    (SoftwareCost & { software_item: SoftwareItem })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSoftwareCosts = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("software_costs")
        .select(`
          *,
          software_item:software_items(*)
        `)
        .gte("cost_month", `${year}-01-01`)
        .lte("cost_month", `${year}-12-31`)
        .order("cost_month");

      if (error) throw error;
      setSoftwareCosts(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch software costs");
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchSoftwareCosts();
  }, [fetchSoftwareCosts]);

  const upsertSoftwareCost = async (costData: {
    software_item_id: string;
    cost_month: string;
    actual_cost: number | null;
    techpros_allocation_percent?: number | null;
    notes?: string;
  }) => {
    try {
      // Check if entry exists
      const { data: existing } = await supabase
        .from("software_costs")
        .select("id")
        .eq("software_item_id", costData.software_item_id)
        .eq("cost_month", costData.cost_month)
        .single();

      const hasOverride = costData.actual_cost !== null ||
        costData.techpros_allocation_percent !== null && costData.techpros_allocation_percent !== undefined ||
        costData.notes;

      if (existing) {
        // If no overrides at all, delete the entry
        if (!hasOverride) {
          const { error } = await supabase
            .from("software_costs")
            .delete()
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          // Update existing
          const { error } = await supabase
            .from("software_costs")
            .update({
              actual_cost: costData.actual_cost,
              techpros_allocation_percent: costData.techpros_allocation_percent ?? null,
              notes: costData.notes || null,
            })
            .eq("id", existing.id);
          if (error) throw error;
        }
      } else if (hasOverride) {
        // Only insert if there's actually an override
        const { error } = await supabase.from("software_costs").insert({
          software_item_id: costData.software_item_id,
          cost_month: costData.cost_month,
          actual_cost: costData.actual_cost,
          techpros_allocation_percent: costData.techpros_allocation_percent ?? null,
          notes: costData.notes || null,
        });
        if (error) throw error;
      }

      await fetchSoftwareCosts();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to save software cost",
      };
    }
  };

  return {
    softwareCosts,
    loading,
    error,
    upsertSoftwareCost,
    refetch: fetchSoftwareCosts,
  };
}

// Hook for getting monthly software totals (for P&L)
// Returns both budget (from defaults) and actual (only when reconciled)
// Also returns costs grouped by category for separate P&L line items
export function useMonthlySoftwareCosts(year: number) {
  const [monthlyTotals, setMonthlyTotals] = useState<
    Record<string, {
      total: number;
      budget: number;
      actual: number;
      isReconciled: boolean;
      byItem: Record<string, number>;
      byCategory: Record<string, number>;
    }>
  >({});
  const [loading, setLoading] = useState(true);

  const fetchMonthlySoftwareCosts = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch all active software items
      const { data: items } = await supabase
        .from("software_items")
        .select("*")
        .eq("is_active", true);

      // Fetch software cost overrides for the year
      const { data: costs } = await supabase
        .from("software_costs")
        .select("*")
        .gte("cost_month", `${year}-01-01`)
        .lte("cost_month", `${year}-12-31`);

      // Build cost lookup by item_id and month (includes cost AND allocation overrides)
      const costLookup: Record<string, Record<string, { actual_cost: number | null; techpros_allocation_percent: number | null }>> = {};
      // Track which months have ANY reconciled entries
      const reconciledMonths = new Set<string>();

      costs?.forEach((cost) => {
        const monthKey = cost.cost_month.slice(0, 7);
        if (!costLookup[cost.software_item_id]) {
          costLookup[cost.software_item_id] = {};
        }
        costLookup[cost.software_item_id][monthKey] = {
          actual_cost: cost.actual_cost,
          techpros_allocation_percent: cost.techpros_allocation_percent,
        };
        reconciledMonths.add(monthKey);
      });

      // Initialize all months
      const byMonth: Record<string, {
        total: number;
        budget: number;
        actual: number;
        isReconciled: boolean;
        byItem: Record<string, number>;
        byCategory: Record<string, number>;
      }> = {};

      for (let month = 1; month <= 12; month++) {
        const monthKey = `${year}-${String(month).padStart(2, "0")}`;
        const isReconciled = reconciledMonths.has(monthKey);
        byMonth[monthKey] = { total: 0, budget: 0, actual: 0, isReconciled, byItem: {}, byCategory: {} };

        // Calculate totals for each item
        items?.forEach((item) => {
          const defaultCost = Number(item.default_monthly_cost);
          const defaultAllocation = item.techpros_allocation_percent;
          const category = item.category || "Software etc";
          const allocatedDefault = defaultCost * (defaultAllocation / 100);

          // Budget is always the default
          byMonth[monthKey].budget += allocatedDefault;

          // Check if there's an override for this item/month
          const override = costLookup[item.id]?.[monthKey];

          if (isReconciled) {
            // Month has been reconciled - use overrides if they exist, otherwise use defaults
            const effectiveCost = override?.actual_cost !== undefined && override?.actual_cost !== null
              ? override.actual_cost
              : defaultCost;
            const effectiveAllocation = override?.techpros_allocation_percent !== undefined && override?.techpros_allocation_percent !== null
              ? override.techpros_allocation_percent
              : defaultAllocation;
            const allocatedCost = effectiveCost * (effectiveAllocation / 100);

            byMonth[monthKey].byItem[item.name] = allocatedCost;
            byMonth[monthKey].actual += allocatedCost;
            byMonth[monthKey].total = byMonth[monthKey].actual;

            // Add to category totals
            byMonth[monthKey].byCategory[category] = (byMonth[monthKey].byCategory[category] || 0) + allocatedCost;
          } else {
            // Month not reconciled - actual stays 0, total uses budget for display
            byMonth[monthKey].byItem[item.name] = allocatedDefault;
            byMonth[monthKey].total = byMonth[monthKey].budget;

            // Add to category totals (using default)
            byMonth[monthKey].byCategory[category] = (byMonth[monthKey].byCategory[category] || 0) + allocatedDefault;
          }
        });
      }

      setMonthlyTotals(byMonth);
    } catch (err) {
      console.error("Failed to fetch monthly software costs:", err);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchMonthlySoftwareCosts();
  }, [fetchMonthlySoftwareCosts]);

  return { monthlyTotals, loading, refetch: fetchMonthlySoftwareCosts };
}
