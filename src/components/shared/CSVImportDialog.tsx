import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, Check, AlertCircle, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatGBP } from "@/lib/formatters";

interface CSVRow {
  name: string;
  month: string;
  amount: number;
  rawData: Record<string, string>;
}

interface MatchedRow extends CSVRow {
  matchedId: string | null;
  matchedName: string | null;
  confidence: "exact" | "fuzzy" | "none";
  createNew?: boolean;
}

interface ExistingItem {
  id: string;
  name: string;
}

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  existingItems: ExistingItem[];
  onImport: (rows: Array<{ itemId: string; month: string; amount: number; isNew: boolean; newName?: string }>) => Promise<void>;
  onCreateItem?: (name: string) => Promise<string | null>;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/['"]/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || "";
    });
    rows.push(row);
  }

  return rows;
}

function fuzzyMatch(input: string, target: string): number {
  const a = input.toLowerCase().replace(/[^a-z0-9]/g, "");
  const b = target.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (a === b) return 1;
  if (b.includes(a) || a.includes(b)) return 0.8;

  // Simple character overlap score
  const aChars = new Set(a.split(""));
  const bChars = new Set(b.split(""));
  const intersection = [...aChars].filter((c) => bChars.has(c)).length;
  const union = new Set([...aChars, ...bChars]).size;

  return intersection / union;
}

function detectColumns(row: Record<string, string>): { nameCol: string; monthCol: string; amountCol: string } | null {
  const keys = Object.keys(row);

  const nameCol = keys.find((k) =>
    k.includes("name") || k.includes("software") || k.includes("vendor") || k.includes("item")
  );
  const monthCol = keys.find((k) =>
    k.includes("month") || k.includes("date") || k.includes("period")
  );
  const amountCol = keys.find((k) =>
    k.includes("amount") || k.includes("cost") || k.includes("value") || k.includes("actual")
  );

  if (!nameCol || !monthCol || !amountCol) return null;
  return { nameCol, monthCol, amountCol };
}

function parseMonth(value: string): string | null {
  // Try YYYY-MM format
  if (/^\d{4}-\d{2}$/.test(value)) return value;

  // Try YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.slice(0, 7);

  // Try DD/MM/YYYY format
  const dmyMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, "0")}`;
  }

  // Try Month YYYY format (e.g., "January 2026")
  const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const monthMatch = value.toLowerCase().match(/^(\w+)\s*(\d{4})$/);
  if (monthMatch) {
    const monthIdx = monthNames.findIndex((m) => monthMatch[1].startsWith(m));
    if (monthIdx >= 0) {
      return `${monthMatch[2]}-${String(monthIdx + 1).padStart(2, "0")}`;
    }
  }

  return null;
}

function parseAmount(value: string): number {
  // Remove currency symbols and commas
  const cleaned = value.replace(/[£$€,]/g, "").trim();
  return parseFloat(cleaned) || 0;
}

export function CSVImportDialog({
  open,
  onOpenChange,
  title,
  existingItems,
  onImport,
  onCreateItem,
}: CSVImportDialogProps) {
  const [step, setStep] = useState<"upload" | "preview" | "importing">("upload");
  const [error, setError] = useState<string | null>(null);
  const [matchedRows, setMatchedRows] = useState<MatchedRow[]>([]);
  const [importing, setImporting] = useState(false);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const rawRows = parseCSV(text);

          if (rawRows.length === 0) {
            setError("No data found in CSV");
            return;
          }

          const columns = detectColumns(rawRows[0]);
          if (!columns) {
            setError("Could not detect required columns. Expected: name/software, month/date, amount/cost");
            return;
          }

          const parsed: MatchedRow[] = rawRows
            .map((raw) => {
              const name = raw[columns.nameCol] || "";
              const monthRaw = raw[columns.monthCol] || "";
              const amountRaw = raw[columns.amountCol] || "";

              const month = parseMonth(monthRaw);
              const amount = parseAmount(amountRaw);

              if (!name || !month || amount <= 0) return null;

              // Find best match
              let bestMatch: ExistingItem | null = null;
              let bestScore = 0;

              for (const item of existingItems) {
                const score = fuzzyMatch(name, item.name);
                if (score > bestScore) {
                  bestScore = score;
                  bestMatch = item;
                }
              }

              const confidence: "exact" | "fuzzy" | "none" =
                bestScore >= 0.95 ? "exact" : bestScore >= 0.6 ? "fuzzy" : "none";

              return {
                name,
                month,
                amount,
                rawData: raw,
                matchedId: confidence !== "none" ? bestMatch?.id || null : null,
                matchedName: confidence !== "none" ? bestMatch?.name || null : null,
                confidence,
                createNew: confidence === "none",
              };
            })
            .filter((r): r is MatchedRow => r !== null);

          if (parsed.length === 0) {
            setError("No valid rows found. Check that dates and amounts are correct.");
            return;
          }

          setMatchedRows(parsed);
          setError(null);
          setStep("preview");
        } catch (err) {
          setError("Failed to parse CSV file");
        }
      };
      reader.readAsText(file);
    },
    [existingItems]
  );

  const handleMatchChange = (index: number, itemId: string) => {
    setMatchedRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const item = existingItems.find((it) => it.id === itemId);
        return {
          ...row,
          matchedId: itemId,
          matchedName: item?.name || null,
          confidence: "exact",
          createNew: false,
        };
      })
    );
  };

  const handleCreateNewToggle = (index: number) => {
    setMatchedRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        return {
          ...row,
          createNew: !row.createNew,
          matchedId: row.createNew ? row.matchedId : null,
          matchedName: row.createNew ? row.matchedName : null,
        };
      })
    );
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const toImport: Array<{ itemId: string; month: string; amount: number; isNew: boolean; newName?: string }> = [];

      for (const row of matchedRows) {
        if (row.createNew && onCreateItem) {
          toImport.push({
            itemId: "", // Will be created
            month: row.month,
            amount: row.amount,
            isNew: true,
            newName: row.name,
          });
        } else if (row.matchedId) {
          toImport.push({
            itemId: row.matchedId,
            month: row.month,
            amount: row.amount,
            isNew: false,
          });
        }
      }

      await onImport(toImport);
      onOpenChange(false);
      setStep("upload");
      setMatchedRows([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setStep("upload");
    setMatchedRows([]);
    setError(null);
  };

  const validRows = matchedRows.filter((r) => r.matchedId || r.createNew);
  const totalAmount = validRows.reduce((sum, r) => sum + r.amount, 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-tp-light-grey rounded-lg p-8 text-center">
              <FileSpreadsheet className="h-12 w-12 mx-auto text-tp-dark-grey mb-4" />
              <p className="text-sm text-tp-dark-grey mb-4">
                Upload a CSV with columns: <strong>Name</strong>, <strong>Month</strong>, <strong>Amount</strong>
              </p>
              <label className="cursor-pointer">
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button variant="outline" asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Select CSV File
                  </span>
                </Button>
              </label>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="text-xs text-tp-dark-grey">
              <p className="font-medium mb-1">Expected CSV format:</p>
              <code className="block bg-tp-light p-2 rounded">
                Name,Month,Amount<br />
                Slack,2026-01,29.00<br />
                GitHub,2026-01,79.00
              </code>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>
                Found <strong>{matchedRows.length}</strong> rows, <strong>{validRows.length}</strong> will be imported
              </span>
              <span className="text-tp-dark-grey">
                Total: <strong className="text-tp-green">{formatGBP(totalAmount)}</strong>
              </span>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-tp-light">
                  <tr>
                    <th className="text-left px-3 py-2">CSV Name</th>
                    <th className="text-left px-3 py-2">Month</th>
                    <th className="text-right px-3 py-2">Amount</th>
                    <th className="text-left px-3 py-2">Match</th>
                    <th className="text-center px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {matchedRows.map((row, idx) => (
                    <tr key={idx} className="border-t border-tp-light-grey">
                      <td className="px-3 py-2 font-medium">{row.name}</td>
                      <td className="px-3 py-2">{row.month}</td>
                      <td className="px-3 py-2 text-right">{formatGBP(row.amount)}</td>
                      <td className="px-3 py-2">
                        {row.createNew ? (
                          <span className="text-tp-blue flex items-center gap-1">
                            <Plus className="h-3 w-3" /> Create new
                          </span>
                        ) : (
                          <select
                            value={row.matchedId || ""}
                            onChange={(e) => handleMatchChange(idx, e.target.value)}
                            className="text-sm border rounded px-2 py-1 w-full"
                          >
                            <option value="">-- Select --</option>
                            {existingItems.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {row.confidence === "exact" && !row.createNew && (
                          <Check className="h-4 w-4 text-green-600 mx-auto" />
                        )}
                        {row.confidence === "fuzzy" && !row.createNew && (
                          <span className="text-yellow-600 text-xs">Review</span>
                        )}
                        {(row.confidence === "none" || row.createNew) && onCreateItem && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCreateNewToggle(idx)}
                            className="text-xs"
                          >
                            {row.createNew ? "Match existing" : "Create new"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={importing || validRows.length === 0}>
                {importing ? "Importing..." : `Import ${validRows.length} rows`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
