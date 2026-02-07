import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";

export interface KPIMetric {
  id: string;
  category: string;
  name: string;
  description: string | null;
  target_type: "number" | "percentage" | "currency";
  sort_order: number;
  is_active: boolean;
}

export interface KPIValue {
  id: string;
  metric_id: string;
  kpi_month: string;
  target_value: number | null;
  actual_value: number | null;
  notes: string | null;
}

export interface ActivityMetric {
  id: string;
  category: string;
  name: string;
  description: string | null;
  annual_target: number | null;
  target_type: "number" | "currency";
  sort_order: number;
  is_active: boolean;
}

export interface ActivityValue {
  id: string;
  metric_id: string;
  activity_month: string;
  target_value: number | null;
  actual_value: number | null;
  notes: string | null;
}

export function useKPIMetrics() {
  const [metrics, setMetrics] = useState<KPIMetric[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("kpi_metrics")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");

    if (!error && data) {
      setMetrics(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { metrics, loading, refetch: fetchMetrics };
}

export function useKPIValues(year: number) {
  const [values, setValues] = useState<KPIValue[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchValues = useCallback(async () => {
    setLoading(true);
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const { data, error } = await supabase
      .from("kpi_values")
      .select("*")
      .gte("kpi_month", startDate)
      .lte("kpi_month", endDate);

    if (!error && data) {
      setValues(data);
    }
    setLoading(false);
  }, [year]);

  useEffect(() => {
    fetchValues();
  }, [fetchValues]);

  const upsertValue = async (data: {
    metric_id: string;
    kpi_month: string;
    target_value?: number | null;
    actual_value?: number | null;
    notes?: string | null;
  }) => {
    const { error } = await supabase.from("kpi_values").upsert(
      {
        metric_id: data.metric_id,
        kpi_month: data.kpi_month,
        target_value: data.target_value,
        actual_value: data.actual_value,
        notes: data.notes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "metric_id,kpi_month" }
    );

    if (!error) {
      await fetchValues();
    }
    return { success: !error, error };
  };

  return { values, loading, upsertValue, refetch: fetchValues };
}

export function useActivityMetrics() {
  const [metrics, setMetrics] = useState<ActivityMetric[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("activity_metrics")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");

    if (!error && data) {
      setMetrics(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { metrics, loading, refetch: fetchMetrics };
}

export function useActivityValues(year: number) {
  const [values, setValues] = useState<ActivityValue[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchValues = useCallback(async () => {
    setLoading(true);
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const { data, error } = await supabase
      .from("activity_values")
      .select("*")
      .gte("activity_month", startDate)
      .lte("activity_month", endDate);

    if (!error && data) {
      setValues(data);
    }
    setLoading(false);
  }, [year]);

  useEffect(() => {
    fetchValues();
  }, [fetchValues]);

  const upsertValue = async (data: {
    metric_id: string;
    activity_month: string;
    target_value?: number | null;
    actual_value?: number | null;
    notes?: string | null;
  }) => {
    const { error } = await supabase.from("activity_values").upsert(
      {
        metric_id: data.metric_id,
        activity_month: data.activity_month,
        target_value: data.target_value,
        actual_value: data.actual_value,
        notes: data.notes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "metric_id,activity_month" }
    );

    if (!error) {
      await fetchValues();
    }
    return { success: !error, error };
  };

  return { values, loading, upsertValue, refetch: fetchValues };
}
