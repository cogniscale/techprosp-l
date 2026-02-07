import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Document } from "@/types";

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const uploadDocument = async (
    file: File,
    documentType: "invoice" | "bank_statement" | "contract" | "contractor_invoice"
  ) => {
    try {
      // Generate unique file path
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${documentType}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create document record
      const { data: doc, error: insertError } = await supabase
        .from("documents")
        .insert({
          file_name: file.name,
          file_path: filePath,
          file_type: documentType,
          mime_type: file.type,
          file_size: file.size,
          processing_status: "pending",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Trigger processing
      const { error: processError } = await supabase.functions.invoke(
        "process-document",
        {
          body: {
            documentId: doc.id,
            documentType,
          },
        }
      );

      if (processError) {
        console.error("Processing error:", processError);
        // Update status to failed
        await supabase
          .from("documents")
          .update({ processing_status: "failed" })
          .eq("id", doc.id);
      }

      // Refresh list
      await fetchDocuments();

      return { success: true, document: doc };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Upload failed",
      };
    }
  };

  const deleteDocument = async (documentId: string, filePath: string) => {
    try {
      // Delete from storage
      await supabase.storage.from("documents").remove([filePath]);

      // Delete record
      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("id", documentId);

      if (error) throw error;

      // Refresh list
      await fetchDocuments();

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Delete failed",
      };
    }
  };

  return {
    documents,
    loading,
    error,
    uploadDocument,
    deleteDocument,
    refetch: fetchDocuments,
  };
}
