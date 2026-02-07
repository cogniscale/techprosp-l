import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import type { CogniScaleService } from "@/types";

export function useCogniScaleServices() {
  const [services, setServices] = useState<CogniScaleService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("cogniscale_services")
        .select("*")
        .eq("is_active", true)
        .order("service_type")
        .order("sort_order");

      if (error) throw error;
      setServices(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch services");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const billableServices = services.filter((s) => s.service_type === "billable");
  const variableServices = services.filter((s) => s.service_type === "variable");

  const totalFixedFee = billableServices.reduce((sum, s) => sum + (s.annual_value || 0), 0);
  const monthlyFixedFee = totalFixedFee / 12;

  return {
    services,
    billableServices,
    variableServices,
    totalFixedFee,
    monthlyFixedFee,
    loading,
    error,
    refetch: fetchServices,
  };
}
