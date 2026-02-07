import { useState, useRef } from "react";
import { Upload, FileText, Trash2, CheckCircle, AlertCircle, Clock, Loader2, Plus } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InvoiceForm } from "@/components/invoices/InvoiceForm";
import { useDocuments } from "@/hooks/useDocuments";
import type { Document, ProcessingStatus } from "@/types";

const DOCUMENT_TYPES = [
  { value: "invoice", label: "Client Invoice" },
  { value: "contractor_invoice", label: "Contractor Invoice (HR Cost)" },
  { value: "bank_statement", label: "Bank Statement" },
  { value: "contract", label: "Contract" },
] as const;

function StatusBadge({ status }: { status: ProcessingStatus }) {
  const config = {
    pending: { icon: Clock, color: "text-tp-dark-grey bg-tp-light", label: "Pending" },
    processing: { icon: Loader2, color: "text-tp-blue bg-tp-blue/10", label: "Processing" },
    completed: { icon: CheckCircle, color: "text-tp-green bg-tp-green/10", label: "Completed" },
    failed: { icon: AlertCircle, color: "text-error bg-error/10", label: "Failed" },
    manual_review: { icon: AlertCircle, color: "text-warning bg-warning/10", label: "Review Required" },
  };

  const { icon: Icon, color, label } = config[status] || config.pending;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>
      <Icon className={`h-3.5 w-3.5 ${status === "processing" ? "animate-spin" : ""}`} />
      {label}
    </span>
  );
}

function DocumentRow({
  document,
  onDelete,
  onCreateInvoice,
}: {
  document: Document;
  onDelete: (id: string, path: string) => void;
  onCreateInvoice: (doc: Document) => void;
}) {
  const [showData, setShowData] = useState(false);
  const canCreateInvoice = document.file_type === "invoice" &&
    document.processing_status === "completed" &&
    document.extracted_data;
  const isContractorInvoice = document.file_type === "contractor_invoice" &&
    document.processing_status === "completed" &&
    document.extracted_data;

  return (
    <div className="border-b border-tp-light-grey last:border-0">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-tp-light flex items-center justify-center">
            <FileText className="h-5 w-5 text-tp-dark-grey" />
          </div>
          <div>
            <p className="text-sm font-medium text-tp-dark">{document.file_name}</p>
            <p className="text-xs text-tp-dark-grey">
              {document.file_type} • {new Date(document.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={document.processing_status} />
          {canCreateInvoice && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCreateInvoice(document)}
            >
              <Plus className="h-4 w-4" />
              Create Invoice
            </Button>
          )}
          {isContractorInvoice && (
            <div className="flex items-center gap-2">
              {(document.extracted_data as { matched_team_member?: { name: string } })?.matched_team_member && (
                <span className="text-xs text-tp-green bg-tp-green/10 px-2 py-1 rounded">
                  Matched: {(document.extracted_data as { matched_team_member: { name: string } }).matched_team_member.name}
                </span>
              )}
              <span className="text-xs text-tp-dark-grey">
                Use AI Chat to record cost
              </span>
            </div>
          )}
          {document.extracted_data && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowData(!showData)}
            >
              {showData ? "Hide" : "View"} Data
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(document.id, document.file_path)}
            className="text-tp-dark-grey hover:text-error"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {showData && document.extracted_data && (
        <div className="px-4 pb-4">
          <pre className="text-xs bg-tp-light p-4 rounded-lg overflow-auto max-h-64">
            {JSON.stringify(document.extracted_data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export function DocumentsPage() {
  const { documents, loading, uploadDocument, deleteDocument, refetch } = useDocuments();
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState<"invoice" | "contractor_invoice" | "bank_statement" | "contract">("invoice");
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const result = await uploadDocument(file, selectedType);
    setUploading(false);

    if (!result.success) {
      alert(`Upload failed: ${result.error}`);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: string, path: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    const result = await deleteDocument(id, path);
    if (!result.success) {
      alert(`Delete failed: ${result.error}`);
    }
  };

  const handleCreateInvoice = (doc: Document) => {
    setSelectedDocument(doc);
    setShowInvoiceForm(true);
  };

  const handleInvoiceCreated = () => {
    setShowInvoiceForm(false);
    setSelectedDocument(null);
    refetch();
  };

  return (
    <PageContainer title="Documents">
      <div className="space-y-6">
        {/* Invoice Form Modal */}
        {showInvoiceForm && selectedDocument && (
          <InvoiceForm
            extractedData={selectedDocument.extracted_data as Record<string, unknown>}
            documentId={selectedDocument.id}
            onSuccess={handleInvoiceCreated}
            onCancel={() => {
              setShowInvoiceForm(false);
              setSelectedDocument(null);
            }}
          />
        )}

        {/* Upload section */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Document</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-tp-dark mb-2">
                  Document Type
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as typeof selectedType)}
                  className="w-full h-10 rounded-lg border border-tp-light-grey bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-tp-blue"
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleUpload}
                  className="hidden"
                  id="file-upload"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Upload File
                    </>
                  )}
                </Button>
              </div>
            </div>
            <p className="mt-3 text-xs text-tp-dark-grey">
              Supported formats: PDF, PNG, JPG. Max 50MB. Documents will be processed by AI to extract data.
            </p>
          </CardContent>
        </Card>

        {/* Documents list */}
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Documents</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-tp-blue" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-tp-light-grey mx-auto mb-4" />
                <p className="text-sm text-tp-dark-grey">No documents uploaded yet</p>
                <p className="text-xs text-tp-dark-grey mt-1">
                  Upload invoices, bank statements, or contracts to get started
                </p>
              </div>
            ) : (
              <div>
                {documents.map((doc) => (
                  <DocumentRow
                    key={doc.id}
                    document={doc}
                    onDelete={handleDelete}
                    onCreateInvoice={handleCreateInvoice}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
