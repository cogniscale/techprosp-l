import { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FolderSearch,
  FileText,
  Receipt,
  Building2,
  CreditCard,
  Check,
  X,
  AlertCircle,
  Loader2,
  Link2,
  ExternalLink,
  FileSpreadsheet,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useDocumentInbox, InboxDocument, Contract } from "@/hooks/useDocumentInbox";
import { useClients } from "@/hooks/useClients";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useSoftwareItems } from "@/hooks/useSoftwareCosts";
import { formatGBP } from "@/lib/formatters";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getMonthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  return `${MONTHS[parseInt(month) - 1]} ${year}`;
}

export default function DocumentInboxPage() {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(currentDate.getMonth());
  const selectedMonth = getMonthKey(selectedYear, selectedMonthIndex);

  const {
    documentsByCategory,
    contracts,
    loading,
    scanning,
    error,
    pendingCount,
    scanGoogleDrive,
    importSalesInvoice,
    importCostInvoice,
    importBankStatement,
    skipDocument,
    refetch,
  } = useDocumentInbox(selectedMonth);

  const { clients } = useClients();
  const { teamMembers } = useTeamMembers();
  const { softwareItems } = useSoftwareItems();

  // Review dialog state
  const [reviewingDoc, setReviewingDoc] = useState<InboxDocument | null>(null);
  const [reviewForm, setReviewForm] = useState<Record<string, unknown>>({});
  const [importing, setImporting] = useState(false);

  const navigateMonth = (delta: number) => {
    let newMonth = selectedMonthIndex + delta;
    let newYear = selectedYear;

    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }

    setSelectedMonthIndex(newMonth);
    setSelectedYear(newYear);
  };

  const handleScan = async () => {
    const result = await scanGoogleDrive();
    if (result.success) {
      alert(`Scan complete! Found ${result.newDocuments} new documents.`);
    } else {
      alert(`Scan failed: ${result.error}`);
    }
  };

  const openReviewDialog = (doc: InboxDocument) => {
    setReviewingDoc(doc);

    // Pre-populate form with extracted data
    if (doc.document_category === "sales_invoice") {
      setReviewForm({
        client_id: doc.extracted_data?.client_id || "",
        invoice_number: doc.extracted_data?.invoice_number || "",
        invoice_date: doc.extracted_data?.invoice_date || "",
        total_value: doc.extracted_data?.amount || 0,
        months_to_spread: 1,
        recognition_start_month: selectedMonth,
      });
    } else if (doc.document_category === "cost_invoice") {
      setReviewForm({
        team_member_id: doc.extracted_data?.team_member_id || "",
        cost_month: selectedMonth,
        actual_cost: doc.extracted_data?.amount || 0,
        bonus: 0,
        notes: "",
      });
    } else if (doc.document_category === "bank_statement") {
      // For bank statements, pre-select matched transactions
      const transactions = doc.extracted_data?.transactions || [];
      const selectedTxns = transactions
        .filter((t) => t.matched)
        .map((t) => ({
          software_item_id: t.software_name, // Will need to look up ID
          actual_cost: t.amount,
          selected: true,
        }));
      setReviewForm({ transactions: selectedTxns });
    }
  };

  const handleImport = async () => {
    if (!reviewingDoc) return;
    setImporting(true);

    try {
      let result;

      if (reviewingDoc.document_category === "sales_invoice") {
        result = await importSalesInvoice(reviewingDoc.id, {
          client_id: reviewForm.client_id as string,
          invoice_number: reviewForm.invoice_number as string,
          invoice_date: reviewForm.invoice_date as string,
          total_value: reviewForm.total_value as number,
          months_to_spread: reviewForm.months_to_spread as number,
          recognition_start_month: reviewForm.recognition_start_month as string,
        });
      } else if (reviewingDoc.document_category === "cost_invoice") {
        result = await importCostInvoice(reviewingDoc.id, {
          team_member_id: reviewForm.team_member_id as string,
          cost_month: reviewForm.cost_month as string,
          actual_cost: reviewForm.actual_cost as number,
          bonus: reviewForm.bonus as number,
          notes: reviewForm.notes as string,
        });
      } else if (reviewingDoc.document_category === "bank_statement") {
        const costs = (reviewForm.transactions as Array<{
          software_item_id: string;
          actual_cost: number;
          selected: boolean;
        }>)
          .filter((t) => t.selected)
          .map((t) => ({
            software_item_id: t.software_item_id,
            actual_cost: t.actual_cost,
          }));
        result = await importBankStatement(reviewingDoc.id, costs, selectedMonth);
      }

      if (result?.success) {
        setReviewingDoc(null);
        refetch();
      } else {
        alert(`Import failed: ${result?.error}`);
      }
    } finally {
      setImporting(false);
    }
  };

  const handleSkip = async () => {
    if (!reviewingDoc) return;
    await skipDocument(reviewingDoc.id, "Skipped during review");
    setReviewingDoc(null);
    refetch();
  };

  // Calculate monthly amount preview for sales invoices
  const monthlyAmountPreview = useMemo(() => {
    if (reviewingDoc?.document_category !== "sales_invoice") return null;
    const total = (reviewForm.total_value as number) || 0;
    const months = (reviewForm.months_to_spread as number) || 1;
    return total / months;
  }, [reviewingDoc?.document_category, reviewForm.total_value, reviewForm.months_to_spread]);

  const renderDocumentCard = (doc: InboxDocument) => {
    const statusColors = {
      pending: "bg-amber-100 text-amber-800",
      reviewing: "bg-blue-100 text-blue-800",
      imported: "bg-green-100 text-green-800",
      skipped: "bg-gray-100 text-gray-600",
      error: "bg-red-100 text-red-800",
    };

    return (
      <div
        key={doc.id}
        className="border border-tp-light-grey rounded-lg p-4 hover:border-tp-blue transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <FileText className="h-5 w-5 text-tp-dark-grey mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-tp-dark truncate">{doc.file_name}</p>
              {doc.extracted_data && (
                <div className="mt-1 text-sm text-tp-dark-grey space-y-0.5">
                  {doc.extracted_data.client && (
                    <p>Client: {doc.extracted_data.client}</p>
                  )}
                  {doc.extracted_data.supplier && (
                    <p>Supplier: {doc.extracted_data.supplier}</p>
                  )}
                  {doc.extracted_data.amount && (
                    <p className="font-medium text-tp-dark">
                      {formatGBP(doc.extracted_data.amount)}
                    </p>
                  )}
                  {doc.period_start && doc.period_end && (
                    <p>
                      Period: {formatMonth(doc.period_start.slice(0, 7))} -{" "}
                      {formatMonth(doc.period_end.slice(0, 7))}
                    </p>
                  )}
                  {doc.extracted_data.transactions && (
                    <p>{doc.extracted_data.transactions.length} transactions found</p>
                  )}
                </div>
              )}
              {doc.linked_contract && (
                <div className="mt-2 flex items-center gap-1 text-xs text-tp-blue">
                  <Link2 className="h-3 w-3" />
                  Linked: {doc.linked_contract.contract_name}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={`text-xs px-2 py-1 rounded-full ${statusColors[doc.inbox_status]}`}
            >
              {doc.inbox_status}
            </span>
            {doc.inbox_status === "pending" && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openReviewDialog(doc)}>
                  Review
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => skipDocument(doc.id)}
                  className="text-tp-dark-grey"
                >
                  Skip
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderContractCard = (contract: Contract) => (
    <div
      key={contract.id}
      className="border border-tp-light-grey rounded-lg p-3 hover:border-tp-blue transition-colors"
    >
      <div className="flex items-start gap-3">
        <FileSpreadsheet className="h-4 w-4 text-tp-dark-grey mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-tp-dark text-sm truncate">{contract.contract_name}</p>
          <p className="text-xs text-tp-dark-grey">
            {contract.client?.name || "No client"}
            {contract.monthly_value && ` | ${formatGBP(contract.monthly_value)}/month`}
          </p>
          {contract.start_date && contract.end_date && (
            <p className="text-xs text-tp-dark-grey">
              {contract.start_date.slice(0, 7)} to {contract.end_date.slice(0, 7)}
            </p>
          )}
        </div>
        {contract.file_path && (
          <a
            href={contract.file_path}
            target="_blank"
            rel="noopener noreferrer"
            className="text-tp-blue hover:text-tp-blue/80"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );

  return (
    <PageContainer title="Document Inbox">
      <div className="space-y-6">
        {/* Header with month navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-semibold text-tp-dark font-heading min-w-[140px] text-center">
              {formatMonth(selectedMonth)}
            </h2>
            <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-4">
            {pendingCount > 0 && (
              <span className="text-sm text-tp-dark-grey">
                {pendingCount} pending
              </span>
            )}
            <Button onClick={handleScan} disabled={scanning}>
              {scanning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <FolderSearch className="h-4 w-4 mr-2" />
                  Scan Drive
                </>
              )}
            </Button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-tp-blue" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content - 2 columns */}
            <div className="lg:col-span-2 space-y-6">
              {/* Sales Invoices */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Receipt className="h-5 w-5 text-tp-green" />
                    Sales Invoices
                    {documentsByCategory.sales_invoices.filter((d) => d.inbox_status === "pending")
                      .length > 0 && (
                      <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                        {
                          documentsByCategory.sales_invoices.filter(
                            (d) => d.inbox_status === "pending"
                          ).length
                        }{" "}
                        pending
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {documentsByCategory.sales_invoices.length === 0 ? (
                    <p className="text-sm text-tp-dark-grey py-4 text-center">
                      No sales invoices for this month
                    </p>
                  ) : (
                    documentsByCategory.sales_invoices.map(renderDocumentCard)
                  )}
                </CardContent>
              </Card>

              {/* Cost Invoices */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="h-5 w-5 text-tp-blue" />
                    Cost Invoices (Contractors)
                    {documentsByCategory.cost_invoices.filter((d) => d.inbox_status === "pending")
                      .length > 0 && (
                      <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                        {
                          documentsByCategory.cost_invoices.filter(
                            (d) => d.inbox_status === "pending"
                          ).length
                        }{" "}
                        pending
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {documentsByCategory.cost_invoices.length === 0 ? (
                    <p className="text-sm text-tp-dark-grey py-4 text-center">
                      No cost invoices for this month
                    </p>
                  ) : (
                    documentsByCategory.cost_invoices.map(renderDocumentCard)
                  )}
                </CardContent>
              </Card>

              {/* Bank Statements */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CreditCard className="h-5 w-5 text-purple-600" />
                    Bank Statements
                    {documentsByCategory.bank_statements.filter((d) => d.inbox_status === "pending")
                      .length > 0 && (
                      <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                        {
                          documentsByCategory.bank_statements.filter(
                            (d) => d.inbox_status === "pending"
                          ).length
                        }{" "}
                        pending
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {documentsByCategory.bank_statements.length === 0 ? (
                    <p className="text-sm text-tp-dark-grey py-4 text-center">
                      No bank statements for this month
                    </p>
                  ) : (
                    documentsByCategory.bank_statements.map(renderDocumentCard)
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - Reference Documents */}
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileSpreadsheet className="h-5 w-5 text-tp-dark-grey" />
                    Reference Contracts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {contracts.length === 0 ? (
                    <p className="text-sm text-tp-dark-grey py-4 text-center">
                      No contracts uploaded
                    </p>
                  ) : (
                    contracts.map(renderContractCard)
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Month Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-tp-dark-grey">Sales Invoices</span>
                      <span className="font-medium">
                        {documentsByCategory.sales_invoices.filter((d) => d.inbox_status === "imported").length} imported
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-tp-dark-grey">Cost Invoices</span>
                      <span className="font-medium">
                        {documentsByCategory.cost_invoices.filter((d) => d.inbox_status === "imported").length} imported
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-tp-dark-grey">Bank Statements</span>
                      <span className="font-medium">
                        {documentsByCategory.bank_statements.filter((d) => d.inbox_status === "imported").length} imported
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Review Dialog for Sales Invoices */}
      <Dialog
        open={reviewingDoc?.document_category === "sales_invoice"}
        onOpenChange={() => setReviewingDoc(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Sales Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-tp-light rounded-lg">
              <p className="text-sm font-medium text-tp-dark">{reviewingDoc?.file_name}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-tp-dark mb-1">Client</label>
                <select
                  className="w-full border border-tp-light-grey rounded-lg px-3 py-2 text-sm"
                  value={(reviewForm.client_id as string) || ""}
                  onChange={(e) => setReviewForm({ ...reviewForm, client_id: e.target.value })}
                >
                  <option value="">Select client...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-tp-dark mb-1">Invoice #</label>
                <Input
                  value={(reviewForm.invoice_number as string) || ""}
                  onChange={(e) => setReviewForm({ ...reviewForm, invoice_number: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-tp-dark mb-1">Invoice Date</label>
                <Input
                  type="date"
                  value={(reviewForm.invoice_date as string) || ""}
                  onChange={(e) => setReviewForm({ ...reviewForm, invoice_date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-tp-dark mb-1">Total Value</label>
                <Input
                  type="number"
                  step="0.01"
                  value={(reviewForm.total_value as number) || ""}
                  onChange={(e) =>
                    setReviewForm({ ...reviewForm, total_value: parseFloat(e.target.value) })
                  }
                />
              </div>
            </div>

            <div className="border-t border-tp-light-grey pt-4">
              <label className="block text-sm font-medium text-tp-dark mb-2">
                Revenue Recognition
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-tp-dark-grey mb-1">Months to Spread</label>
                  <Input
                    type="number"
                    min="1"
                    max="36"
                    value={(reviewForm.months_to_spread as number) || 1}
                    onChange={(e) =>
                      setReviewForm({ ...reviewForm, months_to_spread: parseInt(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs text-tp-dark-grey mb-1">Starting Month</label>
                  <Input
                    type="month"
                    value={(reviewForm.recognition_start_month as string) || selectedMonth}
                    onChange={(e) =>
                      setReviewForm({ ...reviewForm, recognition_start_month: e.target.value })
                    }
                  />
                </div>
              </div>
              {monthlyAmountPreview !== null && monthlyAmountPreview > 0 && (
                <p className="mt-2 text-sm text-tp-blue">
                  = {formatGBP(monthlyAmountPreview)} per month
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleSkip} disabled={importing}>
              <X className="h-4 w-4 mr-2" />
              Skip
            </Button>
            <Button onClick={handleImport} disabled={importing}>
              {importing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Import Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog for Cost Invoices */}
      <Dialog
        open={reviewingDoc?.document_category === "cost_invoice"}
        onOpenChange={() => setReviewingDoc(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Cost Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-tp-light rounded-lg">
              <p className="text-sm font-medium text-tp-dark">{reviewingDoc?.file_name}</p>
              {reviewingDoc?.extracted_data?.supplier && (
                <p className="text-sm text-tp-dark-grey">
                  Supplier: {reviewingDoc.extracted_data.supplier}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-tp-dark mb-1">Team Member</label>
              <select
                className="w-full border border-tp-light-grey rounded-lg px-3 py-2 text-sm"
                value={(reviewForm.team_member_id as string) || ""}
                onChange={(e) => setReviewForm({ ...reviewForm, team_member_id: e.target.value })}
              >
                <option value="">Select team member...</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.employment_type})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-tp-dark mb-1">Cost Month</label>
                <Input
                  type="month"
                  value={(reviewForm.cost_month as string) || selectedMonth}
                  onChange={(e) => setReviewForm({ ...reviewForm, cost_month: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-tp-dark mb-1">Amount</label>
                <Input
                  type="number"
                  step="0.01"
                  value={(reviewForm.actual_cost as number) || ""}
                  onChange={(e) =>
                    setReviewForm({ ...reviewForm, actual_cost: parseFloat(e.target.value) })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-tp-dark mb-1">Bonus</label>
                <Input
                  type="number"
                  step="0.01"
                  value={(reviewForm.bonus as number) || 0}
                  onChange={(e) =>
                    setReviewForm({ ...reviewForm, bonus: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-tp-dark mb-1">Notes</label>
                <Input
                  value={(reviewForm.notes as string) || ""}
                  onChange={(e) => setReviewForm({ ...reviewForm, notes: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleSkip} disabled={importing}>
              <X className="h-4 w-4 mr-2" />
              Skip
            </Button>
            <Button onClick={handleImport} disabled={importing}>
              {importing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Import Cost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
