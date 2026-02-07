import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";

export interface OverheadConfig {
  id: string;
  effective_from: string;
  effective_to: string | null;
  monthly_amount: number;
  notes: string | null;
  created_at: string;
}

export function useOverheadConfig() {
  const [configs, setConfigs] = useState<OverheadConfig[]>([]);
  const [currentOverhead, setCurrentOverhead] = useState<number>(4200);
  const [loading, setLoading] = useState(true);

  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("central_overhead_config")
        .select("*")
        .order("effective_from", { ascending: false });

      if (error) throw error;
      setConfigs(data || []);

      // Get current overhead
      const now = new Date().toISOString().slice(0, 10);
      const current = data?.find(
        (c) => c.effective_from <= now && (!c.effective_to || c.effective_to >= now)
      );
      setCurrentOverhead(current ? Number(current.monthly_amount) : 4200);
    } catch (err) {
      console.error("Failed to fetch overhead config:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const updateOverhead = async (amount: number, effectiveFrom?: string) => {
    try {
      const { error } = await supabase.from("central_overhead_config").insert({
        effective_from: effectiveFrom || new Date().toISOString().slice(0, 10),
        monthly_amount: amount,
      });

      if (error) throw error;

      await fetchConfigs();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to update overhead",
      };
    }
  };

  const getOverheadForMonth = (month: string): number => {
    const monthDate = `${month}-01`;
    const config = configs.find(
      (c) => c.effective_from <= monthDate && (!c.effective_to || c.effective_to >= monthDate)
    );
    return config ? Number(config.monthly_amount) : 4200;
  };

  return {
    configs,
    currentOverhead,
    loading,
    updateOverhead,
    getOverheadForMonth,
    refetch: fetchConfigs,
  };
}
