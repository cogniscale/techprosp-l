import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";

export interface InboxDocument {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  document_category: "sales_invoice" | "cost_invoice" | "bank_statement" | "contract" | "other" | null;
  inbox_status: "pending" | "reviewing" | "imported" | "skipped" | "error";
  applies_to_month: string | null;
  period_start: string | null;
  period_end: string | null;
  extracted_data: {
    client?: string;
    client_id?: string;
    amount?: number;
    invoice_number?: string;
    invoice_date?: string;
    supplier?: string;
    team_member_id?: string;
    transactions?: Array<{
      description: string;
      amount: number;
      date: string;
      matched?: boolean;
      software_name?: string;
    }>;
    [key: string]: unknown;
  } | null;
  extraction_confidence: number | null;
  linked_contract_id: string | null;
  linked_contract?: Contract | null;
  google_drive_id: string | null;
  google_drive_path: string | null;
  review_notes: string | null;
  created_at: string;
}

export interface Contract {
  id: string;
  client_id: string | null;
  client?: { name: string } | null;
  contract_name: string;
  contract_type: "sow" | "msa" | "amendment" | "other";
  file_path: string | null;
  file_name: string | null;
  start_date: string | null;
  end_date: string | null;
  monthly_value: number | null;
  total_value: number | null;
  payment_terms: string | null;
  notes: string | null;
  is_active: boolean;
}

export interface InboxSummary {
  category: string;
  pending_count: number;
  imported_count: number;
  total_value: number;
}

export function useDocumentInbox(selectedMonth: string) {
  const [documents, setDocuments] = useState<InboxDocument[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [summary, setSummary] = useState<InboxSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const monthStart = `${selectedMonth}-01`;

      // Fetch documents for this month
      const { data: docs, error: docsError } = await supabase
        .from("documents")
        .select(`
          *,
          linked_contract:contracts(*)
        `)
        .or(`applies_to_month.eq.${monthStart},and(period_start.lte.${monthStart},period_end.gte.${monthStart})`)
        .order("created_at", { ascending: false });

      if (docsError) throw docsError;
      setDocuments(docs || []);

      // Fetch summary
      const { data: summaryData, error: summaryError } = await supabase
        .rpc("get_inbox_summary", { target_month: monthStart });

      if (!summaryError && summaryData) {
        setSummary(summaryData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch documents");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  const fetchContracts = useCallback(async () => {
    try {
      const { data, error: contractsError } = await supabase
        .from("contracts")
        .select(`
          *,
          client:clients(name)
        `)
        .eq("is_active", true)
        .order("contract_name");

      if (contractsError) throw contractsError;
      setContracts(data || []);
    } catch (err) {
      console.error("Failed to fetch contracts:", err);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
    fetchContracts();
  }, [fetchDocuments, fetchContracts]);

  const scanGoogleDrive = useCallback(async () => {
    try {
      setScanning(true);
      setError(null);

      const { data, error: scanError } = await supabase.functions.invoke("scan-drive-inbox", {
        body: { month: selectedMonth },
      });

      if (scanError) throw scanError;

      // Refresh documents after scan
      await fetchDocuments();

      return { success: true, newDocuments: data?.newDocuments || 0 };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to scan Google Drive";
      setError(message);
      return { success: false, error: message };
    } finally {
      setScanning(false);
    }
  }, [selectedMonth, fetchDocuments]);

  const updateDocument = useCallback(async (
    documentId: string,
    updates: Partial<InboxDocument>
  ) => {
    try {
      const { error: updateError } = await supabase
        .from("documents")
        .update(updates)
        .eq("id", documentId);

      if (updateError) throw updateError;

      // Update local state
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === documentId ? { ...doc, ...updates } : doc
        )
      );

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to update document",
      };
    }
  }, []);

  const importSalesInvoice = useCallback(async (
    documentId: string,
    data: {
      client_id: string;
      invoice_number: string;
      invoice_date: string;
      total_value: number;
      months_to_spread: number;
      recognition_start_month: string;
    }
  ) => {
    try {
      // Create the invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          invoice_number: data.invoice_number,
          client_id: data.client_id,
          invoice_date: data.invoice_date,
          total_value: data.total_value,
          months_to_spread: data.months_to_spread,
          source_document_id: documentId,
          status: "pending",
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Generate revenue recognition entries
      const monthlyAmount = data.total_value / data.months_to_spread;
      const startDate = new Date(data.recognition_start_month + "-01");
      const recognitionEntries = [];

      for (let i = 0; i < data.months_to_spread; i++) {
        const recognitionMonth = new Date(startDate);
        recognitionMonth.setMonth(recognitionMonth.getMonth() + i);
        recognitionEntries.push({
          invoice_id: invoice.id,
          recognition_month: recognitionMonth.toISOString().slice(0, 10),
          amount: Math.round(monthlyAmount * 100) / 100,
        });
      }

      const { error: recError } = await supabase
        .from("revenue_recognition")
        .insert(recognitionEntries);

      if (recError) throw recError;

      // Update document status
      await updateDocument(documentId, {
        inbox_status: "imported",
        linked_invoice_id: invoice.id,
        imported_at: new Date().toISOString(),
      } as Partial<InboxDocument>);

      return { success: true, invoice };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to import invoice",
      };
    }
  }, [updateDocument]);

  const importCostInvoice = useCallback(async (
    documentId: string,
    data: {
      team_member_id: string;
      cost_month: string;
      actual_cost: number;
      bonus?: number;
      notes?: string;
    }
  ) => {
    try {
      // Create or update HR cost entry
      const costMonth = `${data.cost_month}-01`;

      const { data: existing } = await supabase
        .from("hr_costs")
        .select("id")
        .eq("team_member_id", data.team_member_id)
        .eq("cost_month", costMonth)
        .single();

      if (existing) {
        const { error: updateError } = await supabase
          .from("hr_costs")
          .update({
            actual_cost: data.actual_cost,
            bonus: data.bonus || 0,
            notes: data.notes,
            source_document_id: documentId,
          })
          .eq("id", existing.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("hr_costs")
          .insert({
            team_member_id: data.team_member_id,
            cost_month: costMonth,
            actual_cost: data.actual_cost,
            bonus: data.bonus || 0,
            notes: data.notes,
            source_document_id: documentId,
          });

        if (insertError) throw insertError;
      }

      // Update document status
      await updateDocument(documentId, {
        inbox_status: "imported",
        imported_at: new Date().toISOString(),
      } as Partial<InboxDocument>);

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to import cost invoice",
      };
    }
  }, [updateDocument]);

  const importBankStatement = useCallback(async (
    documentId: string,
    costs: Array<{
      software_item_id: string;
      actual_cost: number;
    }>,
    month: string
  ) => {
    try {
      const costMonth = `${month}-01`;

      // Upsert all software costs
      for (const cost of costs) {
        const { error: upsertError } = await supabase
          .from("software_costs")
          .upsert(
            {
              software_item_id: cost.software_item_id,
              cost_month: costMonth,
              actual_cost: cost.actual_cost,
              notes: "Imported from bank statement",
            },
            { onConflict: "software_item_id,cost_month" }
          );

        if (upsertError) throw upsertError;
      }

      // Update document status
      await updateDocument(documentId, {
        inbox_status: "imported",
        imported_at: new Date().toISOString(),
      } as Partial<InboxDocument>);

      return { success: true, count: costs.length };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to import bank statement",
      };
    }
  }, [updateDocument]);

  const skipDocument = useCallback(async (documentId: string, reason?: string) => {
    return updateDocument(documentId, {
      inbox_status: "skipped",
      review_notes: reason || "Skipped by user",
    } as Partial<InboxDocument>);
  }, [updateDocument]);

  const addContract = useCallback(async (contract: Omit<Contract, "id">) => {
    try {
      const { data, error: insertError } = await supabase
        .from("contracts")
        .insert(contract)
        .select()
        .single();

      if (insertError) throw insertError;

      setContracts((prev) => [...prev, data]);
      return { success: true, contract: data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to add contract",
      };
    }
  }, []);

  // Group documents by category
  const documentsByCategory = {
    sales_invoices: documents.filter((d) => d.document_category === "sales_invoice"),
    cost_invoices: documents.filter((d) => d.document_category === "cost_invoice"),
    bank_statements: documents.filter((d) => d.document_category === "bank_statement"),
    contracts: documents.filter((d) => d.document_category === "contract"),
    other: documents.filter((d) => !d.document_category || d.document_category === "other"),
  };

  const pendingCount = documents.filter((d) => d.inbox_status === "pending").length;

  return {
    documents,
    documentsByCategory,
    contracts,
    summary,
    loading,
    scanning,
    error,
    pendingCount,
    refetch: fetchDocuments,
    scanGoogleDrive,
    updateDocument,
    importSalesInvoice,
    importCostInvoice,
    importBankStatement,
    skipDocument,
    addContract,
  };
}
