import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.30.1";
import * as XLSX from "npm:xlsx@0.18.5";

// Helper types and functions for spreadsheet parsing
interface ParsedSpreadsheet {
  headers: string[];
  rows: Record<string, unknown>[];
}

function parseSpreadsheet(base64Data: string): ParsedSpreadsheet {
  // Decode base64 to buffer
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Parse with xlsx
  const workbook = XLSX.read(bytes, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

  return { headers, rows };
}

function detectDocumentType(headers: string[]): string {
  const headerLower = headers.map(h => String(h).toLowerCase());

  // Bank statement detection - look for common bank statement columns
  const bankSignals = ["date", "description", "amount", "debit", "credit", "balance", "narrative", "reference"];
  const bankMatches = bankSignals.filter(signal =>
    headerLower.some(h => h.includes(signal))
  ).length;

  if (bankMatches >= 3) return "bank_statement";

  // Invoice/transaction list detection
  const invoiceSignals = ["invoice", "client", "customer", "total", "tax", "vat"];
  const invoiceMatches = invoiceSignals.filter(signal =>
    headerLower.some(h => h.includes(signal))
  ).length;

  if (invoiceMatches >= 2) return "invoice_list";

  return "unknown";
}

// Google Sheets API integration
interface GoogleServiceAccount {
  client_email: string;
  private_key: string;
}

async function createGoogleAuthToken(serviceAccount: GoogleServiceAccount): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  // Import the private key
  const pemContents = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\\n/g, "")
    .replace(/\s/g, "");

  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  // Create JWT
  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const claimB64 = btoa(JSON.stringify(claim)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const signatureInput = encoder.encode(`${headerB64}.${claimB64}`);

  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, signatureInput);
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const jwt = `${headerB64}.${claimB64}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

async function fetchGoogleSheet(sheetId: string): Promise<ParsedSpreadsheet> {
  const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT");
  if (!serviceAccountJson) {
    throw new Error("Google service account not configured. Please set GOOGLE_SERVICE_ACCOUNT secret.");
  }

  const serviceAccount = JSON.parse(serviceAccountJson) as GoogleServiceAccount;
  const accessToken = await createGoogleAuthToken(serviceAccount);

  // Fetch sheet data
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A:ZZ?majorDimension=ROWS`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Sheets API error: ${error}`);
  }

  const data = await response.json();
  const rows = data.values || [];

  if (rows.length === 0) {
    return { headers: [], rows: [] };
  }

  // First row is headers
  const headers = rows[0] as string[];
  const dataRows = rows.slice(1).map((row: unknown[]) => {
    const obj: Record<string, unknown> = {};
    headers.forEach((header, i) => {
      obj[header] = row[i] ?? null;
    });
    return obj;
  });

  return { headers, rows: dataRows };
}

function extractGoogleSheetId(input: string): string | null {
  // From URL: https://docs.google.com/spreadsheets/d/SHEET_ID/...
  const urlMatch = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch) return urlMatch[1];

  // From .gsheet file JSON content
  try {
    const json = JSON.parse(input);
    if (json.doc_id) return json.doc_id;
  } catch {
    // Not JSON
  }

  // Direct ID (alphanumeric with dashes/underscores, typically 44 chars)
  if (/^[a-zA-Z0-9-_]{20,50}$/.test(input.trim())) {
    return input.trim();
  }

  return null;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatAttachment {
  path: string;
  name: string;
  type: string;
  base64: string;
}

interface ChatRequest {
  message: string;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  attachments?: ChatAttachment[];
}

const SYSTEM_PROMPT = `You are a helpful financial assistant for TechPros.io, a consulting company. You help Tim and Taryn manage their finances, invoices, and P&L.

## Database Schema

You have access to these tables:
- **clients**: id, name, slug, is_active, contract_start_date, contract_end_date, monthly_retainer
- **invoices**: id, invoice_number, client_id, invoice_date, total_value, months_to_spread, currency, status (pending/sent/paid/overdue), payment_received_date, notes
- **revenue_recognition**: id, invoice_id, recognition_month, amount (monthly apportioned amounts)
- **team_members**: id, name, role, employment_type (fte/contractor), default_monthly_cost, supplier_names (for invoice matching)
- **hr_costs**: id, team_member_id, cost_month, actual_cost (null means use default), bonus, source_document_id, notes
- **software_items**: id, name, vendor, vendor_aliases (array for bank statement matching), default_monthly_cost, techpros_allocation_percent
- **software_costs**: id, software_item_id, cost_month, actual_cost (null means use default), notes
- **cogniscale_activities**: id, activity_date, activity_month, interviews_conducted, roundtables_held, clevel_meetings_completed, surveys_from_interviews, surveys_from_roundtables, surveys_from_clevel
- **cogniscale_fee_config**: fixed_monthly_fee (£4,236), survey_fee (£1,000), meeting_fee (£700)
- **operating_costs**: id, cost_month, hr_base_costs, hr_bonus_percentage, software_technology, travel_expenses, central_overhead
- **documents**: id, file_name, file_type, processing_status, extracted_data

## Team Members
- Taryn: FTE, £4,560/month base (R85,000 ZAR), Sales Director
- Vanessa: Contractor, £1,650/month
- Aamir: Contractor, £1,800/month + bonuses
- Nikita: Contractor, £500/month
- Pakistan Team: Contractor, variable monthly overhead

## Key Business Rules
- Revenue is recognized monthly based on revenue_recognition table, not invoice dates
- HR costs are tracked per team member per month in hr_costs table
- Software costs are tracked per item per month in software_costs table
- Taryn's base salary counts as HR cost; her 12% profit share does NOT count as cost
- All contractor fees and bonuses count as cost
- CogniScale fees: £4,236/month fixed + £1,000 per survey + £700 per C-level meeting
- Profit Pool = Gross Profit - £4,200 central overhead
- Taryn's share = 12% of Profit Pool
- Clients: 6sense, Enate, Gilroy, HubbubHR, Amphora

## Your Capabilities
1. **Query data**: Answer questions about invoices, revenue, costs, P&L, team costs, software costs
2. **Modify data**: Update invoice recognition periods, change status, record HR costs, record software costs
3. **Calculate**: Compute totals, averages, comparisons
4. **HR Cost management**: Record contractor invoice amounts, add bonuses
5. **Software Cost management**: Match bank transactions to software items, record actual costs

## Document Processing - IMPORTANT WORKFLOW

When a user uploads a spreadsheet (CSV/XLSX), the system automatically parses it and detects the document type.

### Bank Statement Processing

When you receive parsed bank statement data:
1. Use the **match_bank_transactions** tool to match ALL transactions at once
2. Present the results in a clear, numbered format showing:
   - ✓ Exact matches (amount = default)
   - ⚠ Matches with variance (amount ≠ default, show the difference)
   - ? Unmatched transactions
3. Show totals: matched count, unmatched count, total amount
4. **ASK FOR CONFIRMATION** - Do NOT record anything until user says "yes", "confirm", "go ahead", etc.
5. After confirmation, use **batch_record_software_costs** to record all at once
6. Report what was recorded

Example response format:
"I analyzed your bank statement and found 8 software transactions for January 2026:

1. ✓ ZOOM.US - £159.00 → Zoom (matches default £159)
2. ✓ SLACK TECH - £29.00 → Slack-TechPros (matches default £29)
3. ⚠ ANTHROPIC - £612.00 → Claude (default £583, £29 over)
4. ✓ GITHUB INC - £79.00 → GitHub (matches default £79)
5. ? ACME SAAS CO - £50.00 → No match found

**Summary:** 4 matched (3 exact, 1 with variance), 1 unmatched
**Total matched:** £879.00

Should I record items 1-4 as January actuals? For item 5, which software subscription is this?"

### CRITICAL: Always Ask Before Recording

- NEVER record costs, HR entries, or any data without explicit user confirmation
- Show what you plan to do, then ask "Should I record this?"
- Wait for clear confirmation like "yes", "confirm", "do it", "go ahead"
- If user says "no" or wants changes, adjust accordingly

### Contractor Invoice Processing

When you receive a contractor invoice:
1. Identify the supplier/contractor name
2. Match to a team member using their name or supplier_names field
3. Show the extracted details and proposed HR cost entry
4. Ask for confirmation before recording

Format currency as GBP (£). Be concise but helpful.`;

// Tool definitions for Claude
const tools: Anthropic.Tool[] = [
  {
    name: "query_database",
    description: "Execute a read-only SQL query against the database. Use this to fetch data about invoices, revenue, clients, costs, etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "The SQL SELECT query to execute. Only SELECT queries are allowed.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "update_invoice",
    description: "Update an invoice's details including recognition period",
    input_schema: {
      type: "object" as const,
      properties: {
        invoice_id: {
          type: "string",
          description: "The UUID of the invoice to update",
        },
        updates: {
          type: "object",
          description: "Fields to update",
          properties: {
            status: { type: "string", enum: ["pending", "sent", "paid", "overdue"] },
            payment_received_date: { type: "string", description: "Date in YYYY-MM-DD format" },
            notes: { type: "string" },
          },
        },
        new_recognition: {
          type: "object",
          description: "New revenue recognition settings (will regenerate all recognition records)",
          properties: {
            start_month: { type: "string", description: "Start month in YYYY-MM format" },
            months_to_spread: { type: "number" },
          },
        },
      },
      required: ["invoice_id"],
    },
  },
  {
    name: "get_monthly_pl",
    description: "Get the P&L breakdown for a specific month",
    input_schema: {
      type: "object" as const,
      properties: {
        month: {
          type: "string",
          description: "Month in YYYY-MM format",
        },
      },
      required: ["month"],
    },
  },
  {
    name: "record_hr_cost",
    description: "Record or update an HR cost entry for a team member for a specific month. Use this to record contractor invoice amounts or add bonuses.",
    input_schema: {
      type: "object" as const,
      properties: {
        team_member_name: {
          type: "string",
          description: "Name of the team member (e.g., 'Aamir', 'Vanessa', 'Taryn')",
        },
        month: {
          type: "string",
          description: "Month in YYYY-MM format",
        },
        actual_cost: {
          type: "number",
          description: "The actual cost for this month (if different from default). If not provided, will use default.",
        },
        bonus: {
          type: "number",
          description: "Bonus amount for this month (optional)",
        },
        notes: {
          type: "string",
          description: "Notes about this cost entry",
        },
      },
      required: ["team_member_name", "month"],
    },
  },
  {
    name: "get_team_members",
    description: "Get list of all team members with their default costs",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_hr_costs_for_month",
    description: "Get all HR costs recorded for a specific month",
    input_schema: {
      type: "object" as const,
      properties: {
        month: {
          type: "string",
          description: "Month in YYYY-MM format",
        },
      },
      required: ["month"],
    },
  },
  {
    name: "get_software_items",
    description: "Get list of all software items with their default costs and vendor aliases for matching",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "match_software_transaction",
    description: "Match a bank transaction description to a software item. Returns possible matches based on name, vendor, and aliases.",
    input_schema: {
      type: "object" as const,
      properties: {
        description: {
          type: "string",
          description: "The transaction description from the bank statement",
        },
      },
      required: ["description"],
    },
  },
  {
    name: "record_software_cost",
    description: "Record or update a software cost for a specific month. Use after confirming with the user which transactions to record.",
    input_schema: {
      type: "object" as const,
      properties: {
        software_name: {
          type: "string",
          description: "Name of the software item (e.g., 'Zoom', 'Slack – TechPros.io')",
        },
        month: {
          type: "string",
          description: "Month in YYYY-MM format",
        },
        actual_cost: {
          type: "number",
          description: "The actual cost from the bank statement. If same as default, you can omit this.",
        },
        notes: {
          type: "string",
          description: "Notes about this cost entry (e.g., 'From bank statement')",
        },
      },
      required: ["software_name", "month"],
    },
  },
  {
    name: "get_software_costs_for_month",
    description: "Get all software costs recorded for a specific month, showing both defaults and overrides",
    input_schema: {
      type: "object" as const,
      properties: {
        month: {
          type: "string",
          description: "Month in YYYY-MM format",
        },
      },
      required: ["month"],
    },
  },
  {
    name: "match_bank_transactions",
    description: "Match multiple bank statement transactions to software items at once. Use this after parsing a bank statement to identify which transactions correspond to known software subscriptions. Returns matches with confidence scores and variance from default costs.",
    input_schema: {
      type: "object" as const,
      properties: {
        transactions: {
          type: "array",
          description: "Array of transactions from the bank statement",
          items: {
            type: "object",
            properties: {
              description: { type: "string", description: "Transaction description from bank" },
              amount: { type: "number", description: "Transaction amount (positive number)" },
              date: { type: "string", description: "Transaction date" },
            },
            required: ["description", "amount"],
          },
        },
      },
      required: ["transactions"],
    },
  },
  {
    name: "batch_record_software_costs",
    description: "Record multiple software costs in a single operation after user confirmation. Use this after showing the user matched transactions and getting their approval.",
    input_schema: {
      type: "object" as const,
      properties: {
        month: {
          type: "string",
          description: "Month in YYYY-MM format",
        },
        costs: {
          type: "array",
          description: "Array of costs to record",
          items: {
            type: "object",
            properties: {
              software_name: { type: "string", description: "Name of the software item" },
              actual_cost: { type: "number", description: "The actual cost from the bank statement" },
              notes: { type: "string", description: "Optional notes (e.g., 'From bank statement')" },
            },
            required: ["software_name", "actual_cost"],
          },
        },
      },
      required: ["month", "costs"],
    },
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const anthropic = new Anthropic({ apiKey: anthropicApiKey });

    const { message, conversationHistory = [], attachments = [] } = await req.json() as ChatRequest;

    // Fetch relevant historical context based on the current message
    let historicalContext = "";
    if (message) {
      // Search for relevant past conversations
      const { data: relevantHistory } = await supabase.rpc("get_relevant_chat_context", {
        topic: message,
        limit_count: 10,
      });

      if (relevantHistory && relevantHistory.length > 0) {
        historicalContext = "\n\n## Relevant Past Conversations\nHere are relevant messages from past conversations that may provide context:\n\n";
        for (const msg of relevantHistory) {
          const date = new Date(msg.created_at).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
          historicalContext += `[${date}] ${msg.role === "user" ? "User" : "Assistant"}: ${msg.content.slice(0, 500)}${msg.content.length > 500 ? "..." : ""}\n\n`;
        }
      }
    }

    // Build system prompt with historical context
    const systemPromptWithContext = SYSTEM_PROMPT + historicalContext;

    // Build the current user message content
    const userContent: Anthropic.ContentBlockParam[] = [];

    // Add attachments as document/image content
    for (const attachment of attachments) {
      if (attachment.type.startsWith("image/")) {
        // Image attachment
        userContent.push({
          type: "image",
          source: {
            type: "base64",
            media_type: attachment.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
            data: attachment.base64,
          },
        });
      } else if (attachment.type === "application/pdf") {
        // PDF document
        userContent.push({
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: attachment.base64,
          },
        });
      } else if (
        attachment.type === "text/csv" ||
        attachment.type === "application/vnd.ms-excel" ||
        attachment.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        attachment.name.endsWith(".csv") ||
        attachment.name.endsWith(".xlsx") ||
        attachment.name.endsWith(".xls")
      ) {
        // CSV/XLSX spreadsheet - parse and include as structured text
        try {
          const parsed = parseSpreadsheet(attachment.base64);
          const docType = detectDocumentType(parsed.headers);

          // Limit rows to prevent token overflow (first 100 rows)
          const limitedRows = parsed.rows.slice(0, 100);
          const hasMore = parsed.rows.length > 100;

          userContent.push({
            type: "text",
            text: `[Parsed spreadsheet: ${attachment.name}]
Document type detected: ${docType}
Columns: ${parsed.headers.join(", ")}
Total rows: ${parsed.rows.length}${hasMore ? " (showing first 100)" : ""}

Data:
${JSON.stringify(limitedRows, null, 2)}`,
          });
        } catch (parseError) {
          userContent.push({
            type: "text",
            text: `[Attached file: ${attachment.name}] - Error parsing spreadsheet: ${parseError instanceof Error ? parseError.message : "Unknown error"}. Please check the file format.`,
          });
        }
      } else if (attachment.name.endsWith(".gsheet")) {
        // Handle .gsheet files (Google Sheets link files)
        try {
          // .gsheet files contain JSON with the sheet ID
          const content = atob(attachment.base64);
          const sheetId = extractGoogleSheetId(content);

          if (sheetId) {
            const parsed = await fetchGoogleSheet(sheetId);
            const docType = detectDocumentType(parsed.headers);
            const limitedRows = parsed.rows.slice(0, 100);
            const hasMore = parsed.rows.length > 100;

            userContent.push({
              type: "text",
              text: `[Google Sheet: ${attachment.name}]
Document type detected: ${docType}
Columns: ${parsed.headers.join(", ")}
Total rows: ${parsed.rows.length}${hasMore ? " (showing first 100)" : ""}

Data:
${JSON.stringify(limitedRows, null, 2)}`,
            });
          } else {
            userContent.push({
              type: "text",
              text: `[Attached file: ${attachment.name}] - Could not extract Google Sheet ID from .gsheet file.`,
            });
          }
        } catch (gsheetError) {
          userContent.push({
            type: "text",
            text: `[Attached file: ${attachment.name}] - Error fetching Google Sheet: ${gsheetError instanceof Error ? gsheetError.message : "Unknown error"}. Make sure the sheet is shared with the service account.`,
          });
        }
      } else {
        // Other file types - just mention them
        userContent.push({
          type: "text",
          text: `[Attached file: ${attachment.name}] - This file type (${attachment.type}) cannot be directly analyzed. Please describe what you'd like me to do with it.`,
        });
      }
    }

    // Add the text message
    if (message) {
      userContent.push({
        type: "text",
        text: message,
      });

      // Check for Google Sheets URLs in the message
      const sheetUrlMatch = message.match(/https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (sheetUrlMatch) {
        try {
          const sheetId = sheetUrlMatch[1];
          const parsed = await fetchGoogleSheet(sheetId);
          const docType = detectDocumentType(parsed.headers);
          const limitedRows = parsed.rows.slice(0, 100);
          const hasMore = parsed.rows.length > 100;

          userContent.push({
            type: "text",
            text: `[Fetched Google Sheet from URL]
Document type detected: ${docType}
Columns: ${parsed.headers.join(", ")}
Total rows: ${parsed.rows.length}${hasMore ? " (showing first 100)" : ""}

Data:
${JSON.stringify(limitedRows, null, 2)}`,
          });
        } catch (fetchError) {
          userContent.push({
            type: "text",
            text: `[Could not fetch Google Sheet: ${fetchError instanceof Error ? fetchError.message : "Unknown error"}. Make sure the sheet is shared with the service account.]`,
          });
        }
      }
    } else if (attachments.length > 0) {
      // If no message but has attachments, add a default instruction
      userContent.push({
        type: "text",
        text: `I've attached ${attachments.length} file(s): ${attachments.map(a => a.name).join(", ")}. Please analyze them and let me know what you find. If this is an invoice, extract the details and help me record it.`,
      });
    }

    // Build messages array
    const messages: Anthropic.MessageParam[] = [
      ...conversationHistory.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user" as const, content: userContent.length === 1 && userContent[0].type === "text" ? message : userContent },
    ];

    // Initial Claude call
    let response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4096,
      system: systemPromptWithContext,
      tools,
      messages,
    });

    // Process tool calls in a loop
    while (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        let result: string;

        try {
          if (toolUse.name === "query_database") {
            const input = toolUse.input as { query: string };
            // Validate it's a SELECT query
            if (!input.query.trim().toLowerCase().startsWith("select")) {
              result = "Error: Only SELECT queries are allowed";
            } else {
              const { data, error } = await supabase.rpc("exec_sql", {
                sql_query: input.query,
              });
              if (error) {
                // Fallback: try direct query for simple cases
                const { data: directData, error: directError } = await supabase
                  .from("invoices")
                  .select("*, client:clients(name)");
                if (directError) {
                  result = `Query error: ${error.message}. Note: Complex queries may need the exec_sql function to be created.`;
                } else {
                  result = JSON.stringify(directData, null, 2);
                }
              } else {
                result = JSON.stringify(data, null, 2);
              }
            }
          } else if (toolUse.name === "update_invoice") {
            const input = toolUse.input as {
              invoice_id: string;
              updates?: Record<string, unknown>;
              new_recognition?: { start_month: string; months_to_spread: number };
            };

            // Fetch current invoice
            const { data: invoice, error: fetchError } = await supabase
              .from("invoices")
              .select("*")
              .eq("id", input.invoice_id)
              .single();

            if (fetchError || !invoice) {
              result = `Error: Invoice not found`;
            } else {
              // Update invoice fields if provided
              if (input.updates) {
                const { error: updateError } = await supabase
                  .from("invoices")
                  .update(input.updates)
                  .eq("id", input.invoice_id);

                if (updateError) {
                  result = `Error updating invoice: ${updateError.message}`;
                  toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: result });
                  continue;
                }
              }

              // Regenerate recognition records if new_recognition provided
              if (input.new_recognition) {
                // Delete existing recognition records
                await supabase
                  .from("revenue_recognition")
                  .delete()
                  .eq("invoice_id", input.invoice_id);

                // Generate new records
                const monthlyAmount = Number(invoice.total_value) / input.new_recognition.months_to_spread;
                const startDate = new Date(input.new_recognition.start_month + "-01");
                const records = [];

                for (let i = 0; i < input.new_recognition.months_to_spread; i++) {
                  const recognitionMonth = new Date(startDate);
                  recognitionMonth.setMonth(recognitionMonth.getMonth() + i);
                  records.push({
                    invoice_id: input.invoice_id,
                    recognition_month: recognitionMonth.toISOString().slice(0, 10),
                    amount: Math.round(monthlyAmount * 100) / 100,
                  });
                }

                const { error: insertError } = await supabase
                  .from("revenue_recognition")
                  .insert(records);

                if (insertError) {
                  result = `Error creating recognition records: ${insertError.message}`;
                  toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: result });
                  continue;
                }

                // Update invoice months_to_spread
                await supabase
                  .from("invoices")
                  .update({ months_to_spread: input.new_recognition.months_to_spread })
                  .eq("id", input.invoice_id);

                result = `Successfully updated invoice recognition: £${invoice.total_value} spread over ${input.new_recognition.months_to_spread} months starting ${input.new_recognition.start_month} (£${monthlyAmount.toFixed(2)}/month)`;
              } else {
                result = `Invoice updated successfully`;
              }
            }
          } else if (toolUse.name === "get_monthly_pl") {
            const input = toolUse.input as { month: string };
            const monthStart = `${input.month}-01`;
            const monthEnd = `${input.month}-31`;

            // Fetch revenue recognition for the month
            const { data: revenue } = await supabase
              .from("revenue_recognition")
              .select(`
                amount,
                invoice:invoices(
                  client:clients(name)
                )
              `)
              .gte("recognition_month", monthStart)
              .lte("recognition_month", monthEnd);

            // Fetch HR costs for the month
            const { data: hrCostsData } = await supabase
              .from("hr_costs")
              .select(`
                actual_cost,
                bonus,
                team_member:team_members(name, default_monthly_cost)
              `)
              .gte("cost_month", monthStart)
              .lte("cost_month", monthEnd);

            // Fetch other costs for the month
            const { data: costs } = await supabase
              .from("operating_costs")
              .select("*")
              .eq("cost_month", monthStart)
              .single();

            // Fetch CogniScale activities
            const { data: activities } = await supabase
              .from("cogniscale_activities")
              .select("*")
              .eq("activity_month", monthStart)
              .single();

            // Fetch fee config
            const { data: feeConfig } = await supabase
              .from("cogniscale_fee_config")
              .select("*")
              .order("effective_from", { ascending: false })
              .limit(1)
              .single();

            // Calculate revenue by client
            const revenueByClient: Record<string, number> = {};
            let totalRevenue = 0;
            revenue?.forEach((r) => {
              const clientName = r.invoice?.client?.name || "Unknown";
              revenueByClient[clientName] = (revenueByClient[clientName] || 0) + Number(r.amount);
              totalRevenue += Number(r.amount);
            });

            // Add CogniScale fees
            const cogniScaleFixed = feeConfig?.fixed_monthly_fee || 4236;
            const surveyFee = feeConfig?.survey_fee || 1000;
            const meetingFee = feeConfig?.meeting_fee || 700;

            const surveys = (activities?.surveys_from_interviews || 0) +
              (activities?.surveys_from_roundtables || 0);
            const meetings = (activities?.clevel_meetings_completed || 0) +
              (activities?.surveys_from_clevel || 0);

            const cogniScaleVariable = (surveys * surveyFee) + (meetings * meetingFee);
            totalRevenue += cogniScaleFixed + cogniScaleVariable;
            revenueByClient["CogniScale Fixed"] = cogniScaleFixed;
            if (cogniScaleVariable > 0) {
              revenueByClient["CogniScale Variable"] = cogniScaleVariable;
            }

            // Calculate HR costs from hr_costs table
            let totalHRCosts = 0;
            const hrCostsByMember: Record<string, { base: number; bonus: number }> = {};
            hrCostsData?.forEach((hc) => {
              const member = hc.team_member as { name: string; default_monthly_cost: number } | null;
              const baseCost = hc.actual_cost !== null ? Number(hc.actual_cost) : Number(member?.default_monthly_cost || 0);
              const bonus = Number(hc.bonus || 0);
              totalHRCosts += baseCost + bonus;
              if (member) {
                hrCostsByMember[member.name] = { base: baseCost, bonus };
              }
            });

            const totalCosts = totalHRCosts +
              (costs?.software_technology || 0) +
              (costs?.travel_expenses || 0);

            const grossProfit = totalRevenue - totalCosts;
            const centralOverhead = costs?.central_overhead || 4200;
            const profitPool = grossProfit - centralOverhead;
            const tarynShare = profitPool * 0.12;

            result = JSON.stringify({
              month: input.month,
              revenue: {
                byClient: revenueByClient,
                total: totalRevenue,
              },
              costs: {
                hr: { total: totalHRCosts, byMember: hrCostsByMember },
                software: costs?.software_technology || 0,
                travel: costs?.travel_expenses || 0,
                total: totalCosts,
              },
              grossProfit,
              centralOverhead,
              profitPool,
              tarynShare,
            }, null, 2);
          } else if (toolUse.name === "record_hr_cost") {
            const input = toolUse.input as {
              team_member_name: string;
              month: string;
              actual_cost?: number;
              bonus?: number;
              notes?: string;
            };

            // Find team member
            const { data: teamMember, error: memberError } = await supabase
              .from("team_members")
              .select("*")
              .ilike("name", `%${input.team_member_name}%`)
              .single();

            if (memberError || !teamMember) {
              result = `Error: Team member "${input.team_member_name}" not found`;
            } else {
              const costMonth = `${input.month}-01`;

              // Check for existing entry
              const { data: existing } = await supabase
                .from("hr_costs")
                .select("id")
                .eq("team_member_id", teamMember.id)
                .eq("cost_month", costMonth)
                .single();

              if (existing) {
                // Update existing
                const { error: updateError } = await supabase
                  .from("hr_costs")
                  .update({
                    actual_cost: input.actual_cost,
                    bonus: input.bonus || 0,
                    notes: input.notes,
                  })
                  .eq("id", existing.id);

                if (updateError) {
                  result = `Error updating HR cost: ${updateError.message}`;
                } else {
                  result = `Updated HR cost for ${teamMember.name} in ${input.month}: Base £${input.actual_cost ?? teamMember.default_monthly_cost}${input.bonus ? `, Bonus £${input.bonus}` : ""}`;
                }
              } else {
                // Insert new
                const { error: insertError } = await supabase
                  .from("hr_costs")
                  .insert({
                    team_member_id: teamMember.id,
                    cost_month: costMonth,
                    actual_cost: input.actual_cost,
                    bonus: input.bonus || 0,
                    notes: input.notes,
                  });

                if (insertError) {
                  result = `Error recording HR cost: ${insertError.message}`;
                } else {
                  result = `Recorded HR cost for ${teamMember.name} in ${input.month}: Base £${input.actual_cost ?? teamMember.default_monthly_cost}${input.bonus ? `, Bonus £${input.bonus}` : ""}`;
                }
              }
            }
          } else if (toolUse.name === "get_team_members") {
            const { data: members, error: membersError } = await supabase
              .from("team_members")
              .select("*")
              .order("name");

            if (membersError) {
              result = `Error fetching team members: ${membersError.message}`;
            } else {
              result = JSON.stringify(
                members?.map((m) => ({
                  name: m.name,
                  role: m.role,
                  type: m.employment_type,
                  default_monthly_cost: m.default_monthly_cost,
                  is_active: m.is_active,
                })),
                null,
                2
              );
            }
          } else if (toolUse.name === "get_hr_costs_for_month") {
            const input = toolUse.input as { month: string };
            const monthStart = `${input.month}-01`;
            const monthEnd = `${input.month}-31`;

            const { data: hrCostsData, error: hrError } = await supabase
              .from("hr_costs")
              .select(`
                actual_cost,
                bonus,
                notes,
                team_member:team_members(name, default_monthly_cost, employment_type)
              `)
              .gte("cost_month", monthStart)
              .lte("cost_month", monthEnd);

            if (hrError) {
              result = `Error fetching HR costs: ${hrError.message}`;
            } else {
              const formatted = hrCostsData?.map((hc) => {
                const member = hc.team_member as { name: string; default_monthly_cost: number; employment_type: string } | null;
                const baseCost = hc.actual_cost !== null ? hc.actual_cost : member?.default_monthly_cost || 0;
                return {
                  team_member: member?.name || "Unknown",
                  type: member?.employment_type,
                  base_cost: baseCost,
                  bonus: hc.bonus || 0,
                  total: Number(baseCost) + Number(hc.bonus || 0),
                  notes: hc.notes,
                };
              });

              const total = formatted?.reduce((sum, f) => sum + f.total, 0) || 0;

              result = JSON.stringify({ month: input.month, entries: formatted, total }, null, 2);
            }
          } else if (toolUse.name === "get_software_items") {
            const { data: items, error: itemsError } = await supabase
              .from("software_items")
              .select("*")
              .eq("is_active", true)
              .order("name");

            if (itemsError) {
              result = `Error fetching software items: ${itemsError.message}`;
            } else {
              result = JSON.stringify(
                items?.map((i) => ({
                  name: i.name,
                  vendor: i.vendor,
                  vendor_aliases: i.vendor_aliases || [],
                  default_monthly_cost: i.default_monthly_cost,
                  allocation_percent: i.techpros_allocation_percent,
                })),
                null,
                2
              );
            }
          } else if (toolUse.name === "match_software_transaction") {
            const input = toolUse.input as { description: string };
            const normalizedDesc = input.description.toUpperCase().trim();

            const { data: items } = await supabase
              .from("software_items")
              .select("*")
              .eq("is_active", true);

            const matches: { name: string; vendor: string | null; default_cost: number; confidence: string }[] = [];

            items?.forEach((item) => {
              let confidence = "none";

              // Check name match
              if (normalizedDesc.includes(item.name.toUpperCase())) {
                confidence = "high";
              }
              // Check vendor match
              else if (item.vendor && normalizedDesc.includes(item.vendor.toUpperCase())) {
                confidence = "high";
              }
              // Check vendor aliases
              else if (item.vendor_aliases) {
                for (const alias of item.vendor_aliases) {
                  if (normalizedDesc.includes(alias.toUpperCase())) {
                    confidence = "medium";
                    break;
                  }
                }
              }

              if (confidence !== "none") {
                matches.push({
                  name: item.name,
                  vendor: item.vendor,
                  default_cost: Number(item.default_monthly_cost),
                  confidence,
                });
              }
            });

            // Sort by confidence (high first)
            matches.sort((a, b) => (a.confidence === "high" ? -1 : 1));

            result = JSON.stringify({
              description: input.description,
              matches: matches.length > 0 ? matches : "No matches found",
            }, null, 2);
          } else if (toolUse.name === "record_software_cost") {
            const input = toolUse.input as {
              software_name: string;
              month: string;
              actual_cost?: number;
              notes?: string;
            };

            // Find software item
            const { data: softwareItem, error: itemError } = await supabase
              .from("software_items")
              .select("*")
              .ilike("name", `%${input.software_name}%`)
              .single();

            if (itemError || !softwareItem) {
              result = `Error: Software item "${input.software_name}" not found`;
            } else {
              const costMonth = `${input.month}-01`;

              // Check for existing entry
              const { data: existing } = await supabase
                .from("software_costs")
                .select("id")
                .eq("software_item_id", softwareItem.id)
                .eq("cost_month", costMonth)
                .single();

              // Determine if we need to store an override
              const isOverride = input.actual_cost !== undefined &&
                Math.abs(input.actual_cost - Number(softwareItem.default_monthly_cost)) > 0.01;

              if (existing) {
                if (!isOverride && !input.notes) {
                  // Remove override if cost matches default and no notes
                  const { error: deleteError } = await supabase
                    .from("software_costs")
                    .delete()
                    .eq("id", existing.id);

                  if (deleteError) {
                    result = `Error removing override: ${deleteError.message}`;
                  } else {
                    result = `Removed override for ${softwareItem.name} in ${input.month} - will use default £${softwareItem.default_monthly_cost}`;
                  }
                } else {
                  // Update existing
                  const { error: updateError } = await supabase
                    .from("software_costs")
                    .update({
                      actual_cost: isOverride ? input.actual_cost : null,
                      notes: input.notes || null,
                    })
                    .eq("id", existing.id);

                  if (updateError) {
                    result = `Error updating software cost: ${updateError.message}`;
                  } else {
                    result = `Updated ${softwareItem.name} for ${input.month}: £${input.actual_cost ?? softwareItem.default_monthly_cost}${input.notes ? ` (${input.notes})` : ""}`;
                  }
                }
              } else if (isOverride || input.notes) {
                // Insert new override
                const { error: insertError } = await supabase
                  .from("software_costs")
                  .insert({
                    software_item_id: softwareItem.id,
                    cost_month: costMonth,
                    actual_cost: isOverride ? input.actual_cost : null,
                    notes: input.notes || null,
                  });

                if (insertError) {
                  result = `Error recording software cost: ${insertError.message}`;
                } else {
                  result = `Recorded ${softwareItem.name} for ${input.month}: £${input.actual_cost ?? softwareItem.default_monthly_cost}${input.notes ? ` (${input.notes})` : ""}`;
                }
              } else {
                // No override needed, default will be used
                result = `${softwareItem.name} for ${input.month}: Using default £${softwareItem.default_monthly_cost} (no override needed)`;
              }
            }
          } else if (toolUse.name === "get_software_costs_for_month") {
            const input = toolUse.input as { month: string };
            const costMonth = `${input.month}-01`;

            // Get all active software items
            const { data: items } = await supabase
              .from("software_items")
              .select("*")
              .eq("is_active", true)
              .order("name");

            // Get overrides for this month
            const { data: overrides } = await supabase
              .from("software_costs")
              .select("*")
              .eq("cost_month", costMonth);

            // Build override lookup
            const overrideLookup: Record<string, { actual_cost: number | null; notes: string | null }> = {};
            overrides?.forEach((o) => {
              overrideLookup[o.software_item_id] = { actual_cost: o.actual_cost, notes: o.notes };
            });

            const formatted = items?.map((item) => {
              const override = overrideLookup[item.id];
              const effectiveCost = override?.actual_cost !== undefined && override?.actual_cost !== null
                ? override.actual_cost
                : Number(item.default_monthly_cost);
              return {
                name: item.name,
                default_cost: Number(item.default_monthly_cost),
                actual_cost: effectiveCost,
                is_override: override?.actual_cost !== undefined && override?.actual_cost !== null,
                notes: override?.notes || null,
              };
            });

            const total = formatted?.reduce((sum, f) => sum + f.actual_cost, 0) || 0;

            result = JSON.stringify({ month: input.month, items: formatted, total }, null, 2);
          } else if (toolUse.name === "match_bank_transactions") {
            const input = toolUse.input as {
              transactions: Array<{ description: string; amount: number; date?: string }>;
            };

            // Get all software items with their aliases
            const { data: softwareItems } = await supabase
              .from("software_items")
              .select("id, name, vendor, vendor_aliases, default_monthly_cost")
              .eq("is_active", true);

            const matches = input.transactions.map((txn) => {
              const desc = txn.description.toUpperCase();

              // Try to match against vendor name and aliases
              const match = softwareItems?.find((item) => {
                // Check name
                if (item.name && desc.includes(item.name.toUpperCase())) return true;
                // Check vendor
                if (item.vendor && desc.includes(item.vendor.toUpperCase())) return true;
                // Check aliases
                if (item.vendor_aliases) {
                  return item.vendor_aliases.some((alias: string) =>
                    desc.includes(alias.toUpperCase())
                  );
                }
                return false;
              });

              if (match) {
                const defaultCost = Number(match.default_monthly_cost);
                const variance = txn.amount - defaultCost;
                return {
                  description: txn.description,
                  amount: txn.amount,
                  date: txn.date,
                  matched: true,
                  software_id: match.id,
                  software_name: match.name,
                  default_cost: defaultCost,
                  variance: Math.abs(variance) < 0.01 ? 0 : variance,
                  status: Math.abs(variance) < 0.01 ? "exact_match" : variance > 0 ? "over_budget" : "under_budget",
                };
              } else {
                return {
                  description: txn.description,
                  amount: txn.amount,
                  date: txn.date,
                  matched: false,
                  software_name: null,
                  status: "no_match",
                };
              }
            });

            const summary = {
              total_transactions: matches.length,
              matched: matches.filter((m) => m.matched).length,
              unmatched: matches.filter((m) => !m.matched).length,
              exact_matches: matches.filter((m) => m.status === "exact_match").length,
              with_variance: matches.filter((m) => m.status === "over_budget" || m.status === "under_budget").length,
              total_amount: matches.reduce((sum, m) => sum + m.amount, 0),
            };

            result = JSON.stringify({ summary, transactions: matches }, null, 2);
          } else if (toolUse.name === "batch_record_software_costs") {
            const input = toolUse.input as {
              month: string;
              costs: Array<{ software_name: string; actual_cost: number; notes?: string }>;
            };

            const results: Array<{ software_name: string; status: string; error?: string }> = [];
            const costMonth = `${input.month}-01`;

            for (const cost of input.costs) {
              // Find software item by name (case-insensitive)
              const { data: item, error: findError } = await supabase
                .from("software_items")
                .select("id, name, default_monthly_cost")
                .ilike("name", `%${cost.software_name}%`)
                .limit(1)
                .single();

              if (findError || !item) {
                results.push({
                  software_name: cost.software_name,
                  status: "not_found",
                  error: `Software item "${cost.software_name}" not found`,
                });
                continue;
              }

              // Check if cost is different from default
              const isOverride = Math.abs(cost.actual_cost - Number(item.default_monthly_cost)) > 0.01;

              // Upsert the cost
              const { error: upsertError } = await supabase
                .from("software_costs")
                .upsert(
                  {
                    software_item_id: item.id,
                    cost_month: costMonth,
                    actual_cost: isOverride ? cost.actual_cost : null,
                    notes: cost.notes || "Imported from bank statement",
                  },
                  { onConflict: "software_item_id,cost_month" }
                );

              if (upsertError) {
                results.push({
                  software_name: item.name,
                  status: "error",
                  error: upsertError.message,
                });
              } else {
                results.push({
                  software_name: item.name,
                  status: isOverride ? "recorded_override" : "recorded_default",
                });
              }
            }

            const recorded = results.filter((r) => r.status.startsWith("recorded")).length;
            const failed = results.filter((r) => r.status === "error" || r.status === "not_found").length;

            result = JSON.stringify({
              month: input.month,
              recorded,
              failed,
              details: results,
            }, null, 2);
          } else {
            result = `Unknown tool: ${toolUse.name}`;
          }
        } catch (err) {
          result = `Error: ${err instanceof Error ? err.message : "Unknown error"}`;
        }

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: result,
        });
      }

      // Continue conversation with tool results
      response = await anthropic.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 4096,
        system: systemPromptWithContext,
        tools,
        messages: [
          ...messages,
          { role: "assistant", content: response.content },
          { role: "user", content: toolResults },
        ],
      });
    }

    // Extract text response
    const textContent = response.content.find((c) => c.type === "text");
    const assistantMessage = textContent?.type === "text" ? textContent.text : "I couldn't generate a response.";

    return new Response(
      JSON.stringify({
        success: true,
        message: assistantMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
