import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInvoices } from "@/hooks/useInvoices";
import { formatGBP } from "@/lib/formatters";
import { X, Check, Calculator } from "lucide-react";

interface ExtractedInvoiceData {
  invoice_number?: string;
  client_name?: string;
  invoice_date?: string;
  total_amount?: number;
  currency?: string;
  line_items?: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
}

interface InvoiceFormProps {
  extractedData?: ExtractedInvoiceData;
  documentId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function generateMonthOptions() {
  const options: { value: string; label: string }[] = [];
  const now = new Date();

  // Generate 24 months (12 past, current, 11 future)
  for (let i = -12; i <= 11; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = date.toISOString().slice(0, 7); // YYYY-MM
    const label = date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    options.push({ value, label });
  }

  return options;
}

export function InvoiceForm({
  extractedData,
  documentId,
  onSuccess,
  onCancel,
}: InvoiceFormProps) {
  const { clients, createInvoice } = useInvoices();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [clientId, setClientId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [totalValue, setTotalValue] = useState("");
  const [recognitionStartMonth, setRecognitionStartMonth] = useState("");
  const [monthsToSpread, setMonthsToSpread] = useState("1");
  const [notes, setNotes] = useState("");

  const monthOptions = generateMonthOptions();

  // Pre-fill from extracted data
  useEffect(() => {
    if (extractedData) {
      if (extractedData.invoice_number) {
        setInvoiceNumber(extractedData.invoice_number);
      }
      if (extractedData.invoice_date) {
        setInvoiceDate(extractedData.invoice_date);
        // Default recognition start to invoice month
        setRecognitionStartMonth(extractedData.invoice_date.slice(0, 7));
      }
      if (extractedData.total_amount) {
        setTotalValue(String(extractedData.total_amount));
      }
      // Try to match client by name
      if (extractedData.client_name && clients.length > 0) {
        const matchedClient = clients.find(
          (c) =>
            c.name.toLowerCase().includes(extractedData.client_name!.toLowerCase()) ||
            extractedData.client_name!.toLowerCase().includes(c.name.toLowerCase())
        );
        if (matchedClient) {
          setClientId(matchedClient.id);
        }
      }
    }
  }, [extractedData, clients]);

  // Set default recognition month to current month if not set
  useEffect(() => {
    if (!recognitionStartMonth) {
      const now = new Date();
      setRecognitionStartMonth(now.toISOString().slice(0, 7));
    }
  }, [recognitionStartMonth]);

  const monthlyAmount = totalValue && monthsToSpread
    ? Number(totalValue) / Number(monthsToSpread)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!invoiceNumber || !clientId || !invoiceDate || !totalValue || !recognitionStartMonth) {
      setError("Please fill in all required fields");
      return;
    }

    setSaving(true);

    const result = await createInvoice({
      invoice_number: invoiceNumber,
      client_id: clientId,
      invoice_date: invoiceDate,
      total_value: Number(totalValue),
      months_to_spread: Number(monthsToSpread),
      recognition_start_month: recognitionStartMonth,
      notes: notes || undefined,
      source_document_id: documentId,
    });

    setSaving(false);

    if (result.success) {
      onSuccess();
    } else {
      setError(result.error || "Failed to create invoice");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Create Invoice from Document</CardTitle>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-error/10 border border-error/20 p-3 text-sm text-error">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Invoice Number */}
            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">Invoice Number *</Label>
              <Input
                id="invoiceNumber"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="INV-001"
                required
              />
            </div>

            {/* Client */}
            <div className="space-y-2">
              <Label htmlFor="client">Client *</Label>
              <select
                id="client"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full h-10 rounded-lg border border-tp-light-grey bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-tp-blue"
                required
              >
                <option value="">Select client...</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
              {extractedData?.client_name && !clientId && (
                <p className="text-xs text-tp-dark-grey">
                  Extracted: "{extractedData.client_name}"
                </p>
              )}
            </div>

            {/* Invoice Date */}
            <div className="space-y-2">
              <Label htmlFor="invoiceDate">Invoice Date *</Label>
              <Input
                id="invoiceDate"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                required
              />
            </div>

            {/* Total Value */}
            <div className="space-y-2">
              <Label htmlFor="totalValue">Total Value (GBP) *</Label>
              <Input
                id="totalValue"
                type="number"
                step="0.01"
                min="0"
                value={totalValue}
                onChange={(e) => setTotalValue(e.target.value)}
                placeholder="12000.00"
                required
              />
            </div>
          </div>

          {/* Revenue Recognition Section */}
          <div className="border-t border-tp-light-grey pt-4 mt-4">
            <h4 className="text-sm font-semibold text-tp-dark mb-4 flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Revenue Recognition
            </h4>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Recognition Start Month */}
              <div className="space-y-2">
                <Label htmlFor="recognitionStart">Recognition Start Month *</Label>
                <select
                  id="recognitionStart"
                  value={recognitionStartMonth}
                  onChange={(e) => setRecognitionStartMonth(e.target.value)}
                  className="w-full h-10 rounded-lg border border-tp-light-grey bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-tp-blue"
                  required
                >
                  {monthOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Months to Spread */}
              <div className="space-y-2">
                <Label htmlFor="monthsToSpread">Split Over (Months) *</Label>
                <Input
                  id="monthsToSpread"
                  type="number"
                  min="1"
                  max="60"
                  value={monthsToSpread}
                  onChange={(e) => setMonthsToSpread(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Preview */}
            {totalValue && monthsToSpread && Number(monthsToSpread) > 0 && (
              <div className="mt-4 p-4 rounded-lg bg-tp-light">
                <p className="text-sm text-tp-dark-grey">
                  <span className="font-medium text-tp-dark">{formatGBP(Number(totalValue))}</span>
                  {" "}will be recognized as{" "}
                  <span className="font-medium text-tp-green">{formatGBP(monthlyAmount)}/month</span>
                  {" "}for {monthsToSpread} months starting{" "}
                  <span className="font-medium text-tp-dark">
                    {monthOptions.find((m) => m.value === recognitionStartMonth)?.label}
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full min-h-[80px] rounded-lg border border-tp-light-grey bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tp-blue resize-none"
              placeholder="Any additional notes..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : (
                <>
                  <Check className="h-4 w-4" />
                  Create Invoice
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
