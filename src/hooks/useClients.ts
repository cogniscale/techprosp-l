import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";

export interface Client {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  contract_start_date: string | null;
  contract_end_date: string | null;
  monthly_retainer: number | null;
}

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("clients")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (fetchError) throw fetchError;
      setClients(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch clients");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  return {
    clients,
    loading,
    error,
    refetch: fetchClients,
  };
}
