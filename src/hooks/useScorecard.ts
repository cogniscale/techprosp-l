import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import type { ScorecardCategory, ScorecardMetric, ScorecardActual } from "@/types";

export interface MetricWithActual extends ScorecardMetric {
  actual_value: number | null;
  achievement_percent: number;
  rag_status: "green" | "amber" | "red" | "none";
}

export interface CategoryWithMetrics extends ScorecardCategory {
  metrics: MetricWithActual[];
  category_score: number;
  weighted_score: number;
}

export function useScorecard(periodStart: string, periodEnd: string) {
  const [categories, setCategories] = useState<ScorecardCategory[]>([]);
  const [metrics, setMetrics] = useState<ScorecardMetric[]>([]);
  const [actuals, setActuals] = useState<ScorecardActual[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch categories
      const { data: catData, error: catError } = await supabase
        .from("scorecard_categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (catError) throw catError;

      // Fetch metrics
      const { data: metricData, error: metricError } = await supabase
        .from("scorecard_metrics")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (metricError) throw metricError;

      // Fetch actuals for the period
      const { data: actualData, error: actualError } = await supabase
        .from("scorecard_actuals")
        .select("*")
        .gte("period_start", periodStart)
        .lte("period_end", periodEnd);

      if (actualError) throw actualError;

      setCategories(catData || []);
      setMetrics(metricData || []);
      setActuals(actualData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch scorecard data");
    } finally {
      setLoading(false);
    }
  }, [periodStart, periodEnd]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateActual = async (metricId: string, actualValue: number) => {
    try {
      const { error } = await supabase
        .from("scorecard_actuals")
        .upsert({
          metric_id: metricId,
          period_start: periodStart,
          period_end: periodEnd,
          actual_value: actualValue,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "metric_id,period_start,period_end",
        });

      if (error) throw error;
      await fetchData();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to update actual",
      };
    }
  };

  // Calculate RAG status based on achievement percentage
  const getRAGStatus = (achievementPercent: number): "green" | "amber" | "red" | "none" => {
    if (achievementPercent === 0) return "none";
    if (achievementPercent >= 100) return "green";
    if (achievementPercent >= 85) return "amber";
    return "red";
  };

  // Build categories with metrics and scores
  const categoriesWithMetrics = useMemo((): CategoryWithMetrics[] => {
    return categories.map((category) => {
      const categoryMetrics = metrics.filter((m) => m.category_id === category.id);

      const metricsWithActuals: MetricWithActual[] = categoryMetrics.map((metric) => {
        const actual = actuals.find((a) => a.metric_id === metric.id);
        const actualValue = actual?.actual_value ?? null;
        const targetValue = metric.target_value || 0;

        let achievementPercent = 0;
        if (targetValue > 0 && actualValue !== null) {
          // For metrics where lower is better (like escalations), invert the calculation
          if (metric.name.toLowerCase().includes("escalation")) {
            // For escalations, 0 = 100%, any escalations reduce the score
            achievementPercent = actualValue === 0 ? 100 : Math.max(0, 100 - (actualValue * 25));
          } else {
            achievementPercent = (actualValue / targetValue) * 100;
          }
        }

        return {
          ...metric,
          actual_value: actualValue,
          achievement_percent: achievementPercent,
          rag_status: getRAGStatus(achievementPercent),
        };
      });

      // Calculate category score (average of metrics with actuals)
      const metricsWithValues = metricsWithActuals.filter((m) => m.actual_value !== null);
      const categoryScore = metricsWithValues.length > 0
        ? metricsWithValues.reduce((sum, m) => sum + Math.min(m.achievement_percent, 100), 0) / metricsWithValues.length
        : 0;

      const weightedScore = categoryScore * category.weight;

      return {
        ...category,
        metrics: metricsWithActuals,
        category_score: categoryScore,
        weighted_score: weightedScore,
      };
    });
  }, [categories, metrics, actuals]);

  // Calculate overall score
  const overallScore = useMemo(() => {
    const totalWeight = categoriesWithMetrics.reduce((sum, c) => {
      const hasActuals = c.metrics.some((m) => m.actual_value !== null);
      return hasActuals ? sum + c.weight : sum;
    }, 0);

    if (totalWeight === 0) return 0;

    const weightedSum = categoriesWithMetrics.reduce((sum, c) => sum + c.weighted_score, 0);
    return (weightedSum / totalWeight) * 100;
  }, [categoriesWithMetrics]);

  const overallRAG = getRAGStatus(overallScore);

  return {
    categories: categoriesWithMetrics,
    overallScore,
    overallRAG,
    loading,
    error,
    updateActual,
    refetch: fetchData,
  };
}
