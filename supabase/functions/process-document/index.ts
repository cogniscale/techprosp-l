import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.30.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DocumentProcessRequest {
  documentId: string;
  documentType: "invoice" | "bank_statement" | "contract" | "contractor_invoice";
}

Deno.serve(async (req) => {
  // Handle CORS preflight
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

    const { documentId, documentType } = await req.json() as DocumentProcessRequest;

    // Fetch document record
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      throw new Error(`Document not found: ${docError?.message}`);
    }

    // Update status to processing
    await supabase
      .from("documents")
      .update({ processing_status: "processing" })
      .eq("id", documentId);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("documents")
      .download(document.file_path);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message}`);
    }

    // Convert to base64 for Claude
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Determine media type
    const fileExtension = document.file_path.split(".").pop()?.toLowerCase();
    let mediaType = "application/pdf";
    if (fileExtension === "png") mediaType = "image/png";
    if (fileExtension === "jpg" || fileExtension === "jpeg") mediaType = "image/jpeg";

    // Build prompt based on document type
    const prompts: Record<string, string> = {
      invoice: `Extract the following information from this invoice:
- Invoice number
- Client/Company name
- Invoice date
- Due date (if present)
- Line items (description, quantity, unit price, total)
- Subtotal
- VAT/Tax amount
- Total amount
- Currency

Return as JSON with this structure:
{
  "invoice_number": string,
  "client_name": string,
  "invoice_date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD" | null,
  "line_items": [{"description": string, "quantity": number, "unit_price": number, "total": number}],
  "subtotal": number,
  "vat_amount": number,
  "total_amount": number,
  "currency": "GBP" | "USD" | "EUR"
}`,
      bank_statement: `Extract all transactions from this bank statement:
- Statement period (start and end dates)
- Account details
- Opening balance
- Closing balance
- All transactions with: date, description, amount (positive for credits, negative for debits), running balance

Return as JSON with this structure:
{
  "account_name": string,
  "account_number": string (last 4 digits only),
  "statement_period": {"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"},
  "opening_balance": number,
  "closing_balance": number,
  "transactions": [{"date": "YYYY-MM-DD", "description": string, "amount": number, "balance": number}]
}`,
      contract: `Extract key information from this contract:
- Client/Party names
- Contract start date
- Contract end date or term
- Contract value/fees
- Payment terms
- Renewal terms
- Key obligations

Return as JSON with this structure:
{
  "client_name": string,
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD" | null,
  "term_months": number | null,
  "contract_value": number,
  "currency": "GBP" | "USD" | "EUR",
  "payment_terms": string,
  "renewal_terms": string,
  "auto_renewal": boolean
}`,
      contractor_invoice: `This is an invoice from a contractor/supplier for services rendered. Extract:
- Supplier/Contractor name (person or company who sent the invoice)
- Invoice number
- Invoice date
- Service period (if specified)
- Description of services
- Total amount
- Currency

This invoice is likely from one of our team contractors: Aamir Khan, Vanessa, Nikita, or Pakistan Team.

Return as JSON with this structure:
{
  "supplier_name": string,
  "invoice_number": string,
  "invoice_date": "YYYY-MM-DD",
  "service_period": {"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"} | null,
  "service_month": "YYYY-MM",
  "description": string,
  "total_amount": number,
  "currency": "GBP" | "USD" | "EUR"
}`
    };

    // Call Claude API
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: "text",
              text: prompts[documentType] || prompts.invoice,
            },
          ],
        },
      ],
    });

    // Extract JSON from response
    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude");
    }

    // Parse the JSON from Claude's response
    let extractedData;
    try {
      // Try to find JSON in the response (Claude sometimes wraps it in markdown)
      const jsonMatch = textContent.text.match(/```json\n?([\s\S]*?)\n?```/) ||
        textContent.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        extractedData = JSON.parse(textContent.text);
      }
    } catch {
      extractedData = { raw_text: textContent.text };
    }

    // Calculate confidence score based on how complete the extraction is
    const requiredFields = documentType === "invoice"
      ? ["invoice_number", "client_name", "total_amount"]
      : documentType === "bank_statement"
      ? ["transactions", "opening_balance", "closing_balance"]
      : documentType === "contractor_invoice"
      ? ["supplier_name", "total_amount", "service_month"]
      : ["client_name", "start_date", "contract_value"];

    const presentFields = requiredFields.filter(
      (f) => extractedData[f] !== undefined && extractedData[f] !== null
    );
    const confidenceScore = presentFields.length / requiredFields.length;

    // For contractor invoices, try to match supplier to a team member
    let matchedTeamMember = null;
    if (documentType === "contractor_invoice" && extractedData.supplier_name) {
      const { data: teamMembers } = await supabase
        .from("team_members")
        .select("id, name, supplier_names")
        .eq("is_active", true);

      if (teamMembers) {
        const supplierNameLower = extractedData.supplier_name.toLowerCase();
        for (const member of teamMembers) {
          // Check against supplier_names array
          const supplierNames = member.supplier_names || [];
          const matched = supplierNames.some((name: string) =>
            supplierNameLower.includes(name.toLowerCase()) ||
            name.toLowerCase().includes(supplierNameLower)
          ) || supplierNameLower.includes(member.name.toLowerCase());

          if (matched) {
            matchedTeamMember = { id: member.id, name: member.name };
            extractedData.matched_team_member = matchedTeamMember;
            break;
          }
        }
      }
    }

    // Update document with extracted data
    const { error: updateError } = await supabase
      .from("documents")
      .update({
        processing_status: confidenceScore >= 0.85 ? "completed" : "manual_review",
        extracted_data: extractedData,
        extraction_confidence: confidenceScore,
        processed_at: new Date().toISOString(),
      })
      .eq("id", documentId);

    if (updateError) {
      throw new Error(`Failed to update document: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        documentId,
        extractedData,
        confidenceScore,
        status: confidenceScore >= 0.85 ? "completed" : "review_required",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing document:", error);

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
