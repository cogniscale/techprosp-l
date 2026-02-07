import { useState, useMemo } from "react";
import { Plus, Edit2, Trash2, List, Table2, ChevronLeft, ChevronRight } from "lucide-react";
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
import { useInvoices } from "@/hooks/useInvoices";
import { formatGBP } from "@/lib/formatters";

type ViewMode = "list" | "tracker";

type InvoiceStatus = "pending" | "sent" | "paid" | "overdue";

interface NewInvoiceForm {
  invoice_number: string;
  client_id: string;
  invoice_date: string;
  total_value: string;
  months_to_spread: string;
  recognition_start_month: string;
  notes: string;
}

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  sent: "bg-blue-100 text-blue-800 border-blue-300",
  paid: "bg-green-100 text-green-800 border-green-300",
  overdue: "bg-red-100 text-red-800 border-red-300",
};

function generateRevenuePreview(
  totalValue: number,
  monthsToSpread: number,
  startMonth: string
): Array<{ month: string; amount: number }> {
  if (!totalValue || !monthsToSpread || !startMonth) return [];

  const monthlyAmount = Math.round((totalValue / monthsToSpread) * 100) / 100;
  const result: Array<{ month: string; amount: number }> = [];

  const startDate = new Date(startMonth + "-01");

  for (let i = 0; i < monthsToSpread; i++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + i);
    const monthKey = date.toISOString().slice(0, 7);
    result.push({ month: monthKey, amount: monthlyAmount });
  }

  return result;
}

function formatMonthDisplay(monthKey: string): string {
  const date = new Date(monthKey + "-01");
  return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

// Generate array of months for a given year
function getMonthsForYear(year: number): string[] {
  return Array.from({ length: 12 }, (_, i) => {
    const month = String(i + 1).padStart(2, "0");
    return `${year}-${month}`;
  });
}

// Format month key to short display
function formatMonthShort(monthKey: string): string {
  const date = new Date(monthKey + "-01");
  return date.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

export function InvoicesPage() {
  const { invoices, clients, loading, createInvoice, updateInvoice, deleteInvoice } = useInvoices();
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterClient, setFilterClient] = useState<string>("all");
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("tracker"); // Revenue tracker is primary view
  const [trackerYear, setTrackerYear] = useState(new Date().getFullYear());

  const [newInvoice, setNewInvoice] = useState<NewInvoiceForm>({
    invoice_number: "",
    client_id: "",
    invoice_date: new Date().toISOString().slice(0, 10),
    total_value: "",
    months_to_spread: "1",
    recognition_start_month: new Date().toISOString().slice(0, 7),
    notes: "",
  });

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (filterStatus !== "all" && inv.status !== filterStatus) return false;
      if (filterClient !== "all" && inv.client_id !== filterClient) return false;
      return true;
    });
  }, [invoices, filterStatus, filterClient]);

  // Revenue preview for new invoice
  const revenuePreview = useMemo(() => {
    const totalValue = parseFloat(newInvoice.total_value) || 0;
    const monthsToSpread = parseInt(newInvoice.months_to_spread) || 1;
    return generateRevenuePreview(totalValue, monthsToSpread, newInvoice.recognition_start_month);
  }, [newInvoice.total_value, newInvoice.months_to_spread, newInvoice.recognition_start_month]);

  // Months for tracker view (must be defined before trackerData and stats)
  const trackerMonths = useMemo(() => getMonthsForYear(trackerYear), [trackerYear]);

  // Build revenue data for tracker view
  const trackerData = useMemo(() => {
    // Build a map of month -> invoice -> amount
    const invoiceRevenueByMonth: Record<string, Record<string, number>> = {};
    const clientRevenueByMonth: Record<string, Record<string, number>> = {};
    const monthTotals: Record<string, number> = {};

    // Initialize months
    for (const month of trackerMonths) {
      invoiceRevenueByMonth[month] = {};
      clientRevenueByMonth[month] = {};
      monthTotals[month] = 0;
    }

    // Process each invoice's revenue recognition
    for (const invoice of invoices) {
      const clientName = invoice.client?.name || "Unknown";
      const revenueRecords = invoice.revenue_recognition || [];

      for (const rec of revenueRecords) {
        const month = rec.recognition_month.slice(0, 7);
        if (trackerMonths.includes(month)) {
          // Track by invoice
          invoiceRevenueByMonth[month][invoice.id] = rec.amount;

          // Track by client
          if (!clientRevenueByMonth[month][clientName]) {
            clientRevenueByMonth[month][clientName] = 0;
          }
          clientRevenueByMonth[month][clientName] += rec.amount;

          // Track monthly total
          monthTotals[month] += rec.amount;
        }
      }
    }

    // Get unique clients with revenue in this year
    const clientsWithRevenue = new Set<string>();
    for (const month of trackerMonths) {
      for (const clientName of Object.keys(clientRevenueByMonth[month])) {
        clientsWithRevenue.add(clientName);
      }
    }

    return {
      invoiceRevenueByMonth,
      clientRevenueByMonth,
      monthTotals,
      clientsWithRevenue: Array.from(clientsWithRevenue).sort(),
    };
  }, [invoices, trackerMonths]);

  // Revenue stats for current tracker year (must be after trackerData)
  const stats = useMemo(() => {
    // Calculate total invoiced value for selected year
    const yearInvoices = invoices.filter((inv) => {
      const invYear = new Date(inv.invoice_date).getFullYear();
      return invYear === trackerYear;
    });
    const totalInvoiced = yearInvoices.reduce((sum, inv) => sum + Number(inv.total_value), 0);

    // Calculate total recognized revenue for selected year
    const totalRecognized = Object.values(trackerData.monthTotals).reduce((sum, val) => sum + val, 0);

    // Calculate recognized so far (months up to current month)
    const currentMonth = new Date().toISOString().slice(0, 7);
    const recognizedToDate = trackerMonths
      .filter((m) => m <= currentMonth)
      .reduce((sum, month) => sum + (trackerData.monthTotals[month] || 0), 0);

    return { totalInvoiced, totalRecognized, recognizedToDate };
  }, [invoices, trackerYear, trackerData.monthTotals, trackerMonths]);

  // Filter invoices that have revenue in the tracker year
  const invoicesWithYearRevenue = useMemo(() => {
    return invoices.filter((inv) => {
      const revenueRecords = inv.revenue_recognition || [];
      return revenueRecords.some((rec) => {
        const month = rec.recognition_month.slice(0, 7);
        return trackerMonths.includes(month);
      });
    });
  }, [invoices, trackerMonths]);

  const handleCreateInvoice = async () => {
    if (!newInvoice.invoice_number || !newInvoice.client_id || !newInvoice.total_value) return;

    setSaving(true);
    const result = await createInvoice({
      invoice_number: newInvoice.invoice_number,
      client_id: newInvoice.client_id,
      invoice_date: newInvoice.invoice_date,
      total_value: parseFloat(newInvoice.total_value),
      months_to_spread: parseInt(newInvoice.months_to_spread) || 1,
      recognition_start_month: newInvoice.recognition_start_month,
      notes: newInvoice.notes || undefined,
    });
    setSaving(false);

    if (result.success) {
      setShowNewDialog(false);
      setNewInvoice({
        invoice_number: "",
        client_id: "",
        invoice_date: new Date().toISOString().slice(0, 10),
        total_value: "",
        months_to_spread: "1",
        recognition_start_month: new Date().toISOString().slice(0, 7),
        notes: "",
      });
    }
  };

  const handleStatusChange = async (invoiceId: string, newStatus: InvoiceStatus) => {
    setSaving(true);
    const updates: { status: InvoiceStatus; payment_received_date?: string } = { status: newStatus };
    if (newStatus === "paid") {
      updates.payment_received_date = new Date().toISOString().slice(0, 10);
    }
    await updateInvoice(invoiceId, updates);
    setSaving(false);
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm("Are you sure you want to delete this invoice? This will also delete all revenue recognition records.")) {
      return;
    }
    await deleteInvoice(invoiceId);
  };

  const openEditDialog = (invoiceId: string) => {
    setEditingInvoice(invoiceId);
    setShowEditDialog(true);
  };

  const editingInvoiceData = invoices.find((inv) => inv.id === editingInvoice);

  return (
    <PageContainer title="Sales Revenue">
      <div className="space-y-6">
        {/* Revenue Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-tp-dark-grey">Total Invoiced ({trackerYear})</div>
              <div className="text-2xl font-bold text-tp-dark">{formatGBP(stats.totalInvoiced)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-tp-dark-grey">Revenue Scheduled ({trackerYear})</div>
              <div className="text-2xl font-bold text-tp-blue">{formatGBP(stats.totalRecognized)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-tp-dark-grey">Recognized to Date</div>
              <div className="text-2xl font-bold text-tp-green">{formatGBP(stats.recognizedToDate)}</div>
            </CardContent>
          </Card>
        </div>

        {/* View Toggle and Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* View Toggle */}
            <div className="flex items-center rounded-md border border-tp-light-grey bg-white">
              <button
                onClick={() => setViewMode("tracker")}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-l-md transition-colors ${
                  viewMode === "tracker"
                    ? "bg-tp-blue text-white"
                    : "text-tp-dark-grey hover:bg-tp-light"
                }`}
              >
                <Table2 className="h-4 w-4" />
                Revenue Tracker
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-r-md transition-colors ${
                  viewMode === "list"
                    ? "bg-tp-blue text-white"
                    : "text-tp-dark-grey hover:bg-tp-light"
                }`}
              >
                <List className="h-4 w-4" />
                Invoice List
              </button>
            </div>

            {/* Filters for List View */}
            {viewMode === "list" && (
              <>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="h-10 rounded-md border border-tp-light-grey bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tp-blue"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>

                <select
                  value={filterClient}
                  onChange={(e) => setFilterClient(e.target.value)}
                  className="h-10 rounded-md border border-tp-light-grey bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tp-blue"
                >
                  <option value="all">All Clients</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </>
            )}

            {/* Year Selector for Tracker View */}
            {viewMode === "tracker" && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTrackerYear(trackerYear - 1)}
                  className="p-1.5 rounded hover:bg-tp-light text-tp-dark-grey"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="font-medium text-tp-dark min-w-[60px] text-center">{trackerYear}</span>
                <button
                  onClick={() => setTrackerYear(trackerYear + 1)}
                  className="p-1.5 rounded hover:bg-tp-light text-tp-dark-grey"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>

          <Button onClick={() => setShowNewDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
        </div>

        {/* List View */}
        {viewMode === "list" && (
          <Card>
            <CardHeader>
              <CardTitle>Invoice List</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-tp-dark-grey">Loading invoices...</p>
              ) : filteredInvoices.length === 0 ? (
                <p className="text-sm text-tp-dark-grey">No invoices found. Click "New Invoice" to create one.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-tp-light-grey">
                        <th className="text-left px-3 py-2 font-semibold text-tp-dark">Invoice #</th>
                        <th className="text-left px-3 py-2 font-semibold text-tp-dark">Client</th>
                        <th className="text-left px-3 py-2 font-semibold text-tp-dark">Date</th>
                        <th className="text-right px-3 py-2 font-semibold text-tp-dark">Amount</th>
                        <th className="text-center px-3 py-2 font-semibold text-tp-dark">Spread</th>
                        <th className="text-center px-3 py-2 font-semibold text-tp-dark">Status</th>
                        <th className="text-right px-3 py-2 font-semibold text-tp-dark">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.map((invoice) => (
                        <tr key={invoice.id} className="border-b border-tp-light-grey/50 hover:bg-tp-light/50">
                          <td className="px-3 py-2 font-medium text-tp-dark">{invoice.invoice_number}</td>
                          <td className="px-3 py-2 text-tp-dark">{invoice.client?.name || "Unknown"}</td>
                          <td className="px-3 py-2 text-tp-dark-grey">
                            {new Date(invoice.invoice_date).toLocaleDateString("en-GB")}
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-tp-dark">
                            {formatGBP(Number(invoice.total_value))}
                          </td>
                          <td className="px-3 py-2 text-center text-tp-dark-grey">
                            {invoice.months_to_spread} {invoice.months_to_spread === 1 ? "month" : "months"}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <select
                              value={invoice.status}
                              onChange={(e) => handleStatusChange(invoice.id, e.target.value as InvoiceStatus)}
                              className={`h-7 text-xs rounded border px-2 py-1 ${STATUS_COLORS[invoice.status as InvoiceStatus]}`}
                            >
                              <option value="pending">Pending</option>
                              <option value="sent">Sent</option>
                              <option value="paid">Paid</option>
                              <option value="overdue">Overdue</option>
                            </select>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEditDialog(invoice.id)}
                                className="p-1 text-tp-dark-grey hover:text-tp-blue rounded transition-colors"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteInvoice(invoice.id)}
                                className="p-1 text-tp-dark-grey hover:text-red-600 rounded transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Revenue Tracker View - Spreadsheet Style */}
        {viewMode === "tracker" && (
          <Card>
            <CardHeader>
              <CardTitle>Revenue Recognition - {trackerYear}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-tp-dark-grey">Loading invoices...</p>
              ) : invoicesWithYearRevenue.length === 0 ? (
                <p className="text-sm text-tp-dark-grey">No revenue recognized in {trackerYear}.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b-2 border-tp-dark">
                        <th className="text-left px-2 py-2 font-semibold text-tp-dark sticky left-0 bg-white min-w-[100px]">Invoice #</th>
                        <th className="text-left px-2 py-2 font-semibold text-tp-dark min-w-[120px]">Client</th>
                        <th className="text-left px-2 py-2 font-semibold text-tp-dark min-w-[80px]">Date</th>
                        <th className="text-right px-2 py-2 font-semibold text-tp-dark min-w-[90px]">Total</th>
                        <th className="text-center px-2 py-2 font-semibold text-tp-dark min-w-[50px]">Mths</th>
                        {trackerMonths.map((month) => (
                          <th key={month} className="text-right px-2 py-2 font-semibold text-tp-dark min-w-[80px] border-l border-tp-light-grey">
                            {formatMonthShort(month)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Invoice Rows */}
                      {invoicesWithYearRevenue.map((invoice) => (
                        <tr key={invoice.id} className="border-b border-tp-light-grey/50 hover:bg-tp-light/30">
                          <td className="px-2 py-1.5 font-medium text-tp-dark sticky left-0 bg-white text-xs">
                            {invoice.invoice_number}
                          </td>
                          <td className="px-2 py-1.5 text-tp-dark text-xs">{invoice.client?.name || "Unknown"}</td>
                          <td className="px-2 py-1.5 text-tp-dark-grey text-xs">
                            {new Date(invoice.invoice_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                          </td>
                          <td className="px-2 py-1.5 text-right font-medium text-tp-dark text-xs">
                            {formatGBP(Number(invoice.total_value))}
                          </td>
                          <td className="px-2 py-1.5 text-center text-tp-dark-grey text-xs">
                            {invoice.months_to_spread}
                          </td>
                          {trackerMonths.map((month) => {
                            const amount = trackerData.invoiceRevenueByMonth[month]?.[invoice.id];
                            return (
                              <td key={month} className="px-2 py-1.5 text-right text-xs border-l border-tp-light-grey">
                                {amount ? (
                                  <span className="text-tp-green font-medium">{formatGBP(amount)}</span>
                                ) : (
                                  <span className="text-tp-light-grey">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}

                      {/* Empty Row Separator */}
                      <tr className="h-4">
                        <td colSpan={5 + trackerMonths.length}></td>
                      </tr>

                      {/* Client Totals Section Header */}
                      <tr className="border-t-2 border-tp-dark bg-tp-light">
                        <td colSpan={5} className="px-2 py-2 font-bold text-tp-dark text-xs uppercase">
                          Client Totals
                        </td>
                        {trackerMonths.map((month) => (
                          <td key={month} className="px-2 py-2 border-l border-tp-light-grey"></td>
                        ))}
                      </tr>

                      {/* Client Total Rows */}
                      {trackerData.clientsWithRevenue.map((clientName) => (
                        <tr key={clientName} className="border-b border-tp-light-grey/50 bg-tp-light/50">
                          <td colSpan={5} className="px-2 py-1.5 font-medium text-tp-dark text-xs">
                            {clientName}
                          </td>
                          {trackerMonths.map((month) => {
                            const amount = trackerData.clientRevenueByMonth[month]?.[clientName];
                            return (
                              <td key={month} className="px-2 py-1.5 text-right text-xs border-l border-tp-light-grey">
                                {amount ? (
                                  <span className="text-tp-blue font-semibold">{formatGBP(amount)}</span>
                                ) : (
                                  <span className="text-tp-light-grey">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}

                      {/* Grand Total Row */}
                      <tr className="border-t-2 border-tp-dark bg-tp-dark text-white">
                        <td colSpan={5} className="px-2 py-2 font-bold text-xs uppercase">
                          Total Revenue
                        </td>
                        {trackerMonths.map((month) => {
                          const total = trackerData.monthTotals[month] || 0;
                          return (
                            <td key={month} className="px-2 py-2 text-right text-xs border-l border-tp-dark-grey font-bold">
                              {total > 0 ? formatGBP(total) : "-"}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* New Invoice Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Invoice</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <label className="text-sm font-medium text-tp-dark">Invoice Number *</label>
              <Input
                value={newInvoice.invoice_number}
                onChange={(e) => setNewInvoice({ ...newInvoice, invoice_number: e.target.value })}
                placeholder="INV-2026-001"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-tp-dark">Client *</label>
              <select
                value={newInvoice.client_id}
                onChange={(e) => setNewInvoice({ ...newInvoice, client_id: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-tp-dark">Invoice Date *</label>
              <Input
                type="date"
                value={newInvoice.invoice_date}
                onChange={(e) => setNewInvoice({ ...newInvoice, invoice_date: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-tp-dark">Total Value (GBP) *</label>
              <Input
                type="number"
                step="0.01"
                value={newInvoice.total_value}
                onChange={(e) => setNewInvoice({ ...newInvoice, total_value: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-tp-dark">Months to Spread</label>
              <select
                value={newInvoice.months_to_spread}
                onChange={(e) => setNewInvoice({ ...newInvoice, months_to_spread: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="1">1 month</option>
                <option value="3">3 months</option>
                <option value="6">6 months</option>
                <option value="12">12 months</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-tp-dark">Recognition Start Month</label>
              <Input
                type="month"
                value={newInvoice.recognition_start_month}
                onChange={(e) => setNewInvoice({ ...newInvoice, recognition_start_month: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-tp-dark">Notes</label>
              <Input
                value={newInvoice.notes}
                onChange={(e) => setNewInvoice({ ...newInvoice, notes: e.target.value })}
                placeholder="Optional notes"
              />
            </div>
          </div>

          {/* Revenue Recognition Preview */}
          {revenuePreview.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-tp-dark mb-2">Revenue Recognition Preview</h4>
              <div className="bg-tp-light rounded-lg p-3">
                <div className="flex flex-wrap gap-2">
                  {revenuePreview.map((item) => (
                    <div key={item.month} className="bg-white rounded px-3 py-1 text-sm">
                      <span className="text-tp-dark-grey">{formatMonthDisplay(item.month)}:</span>{" "}
                      <span className="font-medium text-tp-green">{formatGBP(item.amount)}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-tp-dark-grey mt-2">
                  Total: {formatGBP(parseFloat(newInvoice.total_value) || 0)} spread over {newInvoice.months_to_spread} month(s)
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateInvoice}
              disabled={saving || !newInvoice.invoice_number || !newInvoice.client_id || !newInvoice.total_value}
            >
              {saving ? "Creating..." : "Create Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Invoice Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
          </DialogHeader>
          {editingInvoiceData && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-tp-dark-grey">Invoice Number</label>
                  <p className="font-medium">{editingInvoiceData.invoice_number}</p>
                </div>
                <div>
                  <label className="text-sm text-tp-dark-grey">Client</label>
                  <p className="font-medium">{editingInvoiceData.client?.name}</p>
                </div>
                <div>
                  <label className="text-sm text-tp-dark-grey">Invoice Date</label>
                  <p className="font-medium">
                    {new Date(editingInvoiceData.invoice_date).toLocaleDateString("en-GB")}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-tp-dark-grey">Total Value</label>
                  <p className="font-medium">{formatGBP(Number(editingInvoiceData.total_value))}</p>
                </div>
                <div>
                  <label className="text-sm text-tp-dark-grey">Spread</label>
                  <p className="font-medium">{editingInvoiceData.months_to_spread} month(s)</p>
                </div>
                <div>
                  <label className="text-sm text-tp-dark-grey">Payment Received</label>
                  <p className="font-medium">
                    {editingInvoiceData.payment_received_date
                      ? new Date(editingInvoiceData.payment_received_date).toLocaleDateString("en-GB")
                      : "-"}
                  </p>
                </div>
              </div>
              {editingInvoiceData.notes && (
                <div>
                  <label className="text-sm text-tp-dark-grey">Notes</label>
                  <p className="text-sm">{editingInvoiceData.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
