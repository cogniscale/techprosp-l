import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Invoice, Client, RevenueRecognition } from "@/types";

export interface InvoiceWithRevenue extends Invoice {
  client: Client;
  revenue_recognition: Array<{
    id: string;
    recognition_month: string;
    amount: number;
  }>;
}

export function useInvoices() {
  const [invoices, setInvoices] = useState<InvoiceWithRevenue[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("invoices")
        .select("*, client:clients(*), revenue_recognition(*)")
        .order("invoice_date", { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch invoices");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClients = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      console.error("Failed to fetch clients:", err);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
    fetchClients();
  }, [fetchInvoices, fetchClients]);

  const createInvoice = async (invoiceData: {
    invoice_number: string;
    client_id: string;
    invoice_date: string;
    total_value: number;
    months_to_spread: number;
    recognition_start_month: string;
    currency?: string;
    notes?: string;
    source_document_id?: string;
  }) => {
    try {
      // Create the invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          invoice_number: invoiceData.invoice_number,
          client_id: invoiceData.client_id,
          invoice_date: invoiceData.invoice_date,
          total_value: invoiceData.total_value,
          months_to_spread: invoiceData.months_to_spread,
          currency: invoiceData.currency || "GBP",
          notes: invoiceData.notes,
          source_document_id: invoiceData.source_document_id,
          status: "pending",
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Generate revenue recognition records
      const monthlyAmount = invoiceData.total_value / invoiceData.months_to_spread;
      const recognitionRecords: Omit<RevenueRecognition, "id" | "created_at">[] = [];

      const startDate = new Date(invoiceData.recognition_start_month + "-01");

      for (let i = 0; i < invoiceData.months_to_spread; i++) {
        const recognitionMonth = new Date(startDate);
        recognitionMonth.setMonth(recognitionMonth.getMonth() + i);

        recognitionRecords.push({
          invoice_id: invoice.id,
          recognition_month: recognitionMonth.toISOString().slice(0, 10),
          amount: Math.round(monthlyAmount * 100) / 100, // Round to 2 decimal places
        });
      }

      // Insert revenue recognition records
      const { error: revenueError } = await supabase
        .from("revenue_recognition")
        .insert(recognitionRecords);

      if (revenueError) throw revenueError;

      // Refresh invoices
      await fetchInvoices();

      return { success: true, invoice };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to create invoice",
      };
    }
  };

  const updateInvoice = async (
    invoiceId: string,
    updates: Partial<Invoice>
  ) => {
    try {
      const { error } = await supabase
        .from("invoices")
        .update(updates)
        .eq("id", invoiceId);

      if (error) throw error;

      await fetchInvoices();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to update invoice",
      };
    }
  };

  const deleteInvoice = async (invoiceId: string) => {
    try {
      // Revenue recognition records cascade delete due to FK constraint
      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("id", invoiceId);

      if (error) throw error;

      await fetchInvoices();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to delete invoice",
      };
    }
  };

  return {
    invoices,
    clients,
    loading,
    error,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    refetch: fetchInvoices,
  };
}

// Hook for getting revenue by month (for P&L)
export function useMonthlyRevenue(year: number) {
  const [revenueByMonth, setRevenueByMonth] = useState<
    Record<string, { total: number; byClient: Record<string, number> }>
  >({});
  const [loading, setLoading] = useState(true);

  const fetchMonthlyRevenue = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch revenue recognition with invoice and client data
      const { data, error } = await supabase
        .from("revenue_recognition")
        .select(`
          *,
          invoice:invoices(
            *,
            client:clients(name)
          )
        `)
        .gte("recognition_month", `${year}-01-01`)
        .lte("recognition_month", `${year}-12-31`);

      if (error) throw error;

      // Group by month
      const byMonth: Record<string, { total: number; byClient: Record<string, number> }> = {};

      for (let month = 1; month <= 12; month++) {
        const monthKey = `${year}-${String(month).padStart(2, "0")}`;
        byMonth[monthKey] = { total: 0, byClient: {} };
      }

      data?.forEach((record) => {
        const monthKey = record.recognition_month.slice(0, 7);
        const clientName = record.invoice?.client?.name || "Unknown";

        if (!byMonth[monthKey]) {
          byMonth[monthKey] = { total: 0, byClient: {} };
        }

        byMonth[monthKey].total += Number(record.amount);
        byMonth[monthKey].byClient[clientName] =
          (byMonth[monthKey].byClient[clientName] || 0) + Number(record.amount);
      });

      setRevenueByMonth(byMonth);
    } catch (err) {
      console.error("Failed to fetch monthly revenue:", err);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchMonthlyRevenue();
  }, [fetchMonthlyRevenue]);

  return { revenueByMonth, loading, refetch: fetchMonthlyRevenue };
}
