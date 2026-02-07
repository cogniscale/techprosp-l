import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Client } from "@/types";

export interface RevenueForecast {
  id: string;
  client_id: string;
  client?: Client;
  forecast_month: string;
  forecast_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useForecasts(year: number) {
  const [forecasts, setForecasts] = useState<(RevenueForecast & { client: Client })[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchForecasts = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch clients
      const { data: clientsData } = await supabase
        .from("clients")
        .select("*")
        .eq("is_active", true)
        .order("name");
      setClients(clientsData || []);

      // Fetch forecasts for the year
      const { data, error } = await supabase
        .from("revenue_forecasts")
        .select(`*, client:clients(*)`)
        .gte("forecast_month", `${year}-01-01`)
        .lte("forecast_month", `${year}-12-31`)
        .order("forecast_month");

      if (error) throw error;
      setForecasts(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch forecasts");
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchForecasts();
  }, [fetchForecasts]);

  const upsertForecast = async (forecastData: {
    client_id: string;
    forecast_month: string;
    forecast_amount: number;
    notes?: string;
  }) => {
    try {
      // Check if entry exists
      const { data: existing } = await supabase
        .from("revenue_forecasts")
        .select("id")
        .eq("client_id", forecastData.client_id)
        .eq("forecast_month", forecastData.forecast_month)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("revenue_forecasts")
          .update({
            forecast_amount: forecastData.forecast_amount,
            notes: forecastData.notes,
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("revenue_forecasts").insert({
          client_id: forecastData.client_id,
          forecast_month: forecastData.forecast_month,
          forecast_amount: forecastData.forecast_amount,
          notes: forecastData.notes,
        });

        if (error) throw error;
      }

      await fetchForecasts();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to save forecast",
      };
    }
  };

  const deleteForecast = async (forecastId: string) => {
    try {
      const { error } = await supabase
        .from("revenue_forecasts")
        .delete()
        .eq("id", forecastId);

      if (error) throw error;

      await fetchForecasts();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to delete forecast",
      };
    }
  };

  return {
    forecasts,
    clients,
    loading,
    error,
    upsertForecast,
    deleteForecast,
    refetch: fetchForecasts,
  };
}

// Hook for getting monthly forecast totals (for P&L)
export function useMonthlyForecasts(year: number) {
  const [monthlyTotals, setMonthlyTotals] = useState<
    Record<string, { total: number; byClient: Record<string, number> }>
  >({});
  const [loading, setLoading] = useState(true);

  const fetchMonthlyForecasts = useCallback(async () => {
    try {
      setLoading(true);

      const { data } = await supabase
        .from("revenue_forecasts")
        .select(`*, client:clients(name)`)
        .gte("forecast_month", `${year}-01-01`)
        .lte("forecast_month", `${year}-12-31`);

      // Initialize all months
      const byMonth: Record<string, { total: number; byClient: Record<string, number> }> = {};
      for (let month = 1; month <= 12; month++) {
        const monthKey = `${year}-${String(month).padStart(2, "0")}`;
        byMonth[monthKey] = { total: 0, byClient: {} };
      }

      // Populate from forecasts
      data?.forEach((forecast) => {
        const monthKey = forecast.forecast_month.slice(0, 7);
        const clientName = forecast.client?.name || "Unknown";

        if (!byMonth[monthKey]) {
          byMonth[monthKey] = { total: 0, byClient: {} };
        }

        byMonth[monthKey].total += Number(forecast.forecast_amount);
        byMonth[monthKey].byClient[clientName] =
          (byMonth[monthKey].byClient[clientName] || 0) + Number(forecast.forecast_amount);
      });

      setMonthlyTotals(byMonth);
    } catch (err) {
      console.error("Failed to fetch monthly forecasts:", err);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchMonthlyForecasts();
  }, [fetchMonthlyForecasts]);

  return { monthlyTotals, loading, refetch: fetchMonthlyForecasts };
}
