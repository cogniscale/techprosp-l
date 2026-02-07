import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.30.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GoogleServiceAccount {
  client_email: string;
  private_key: string;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  createdTime: string;
  modifiedTime: string;
  size?: string;
}

// Folder IDs for the inbox structure (will need to be configured)
const FOLDER_STRUCTURE = {
  inbox: {
    sales: null as string | null, // Will be looked up by name
    costs: null as string | null,
    bank_statements: null as string | null,
  },
  processed: null as string | null,
};

async function createGoogleAuthToken(serviceAccount: GoogleServiceAccount): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const pemContents = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\\n/g, "")
    .replace(/\s/g, "");

  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const claimB64 = btoa(JSON.stringify(claim)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const signatureInput = encoder.encode(`${headerB64}.${claimB64}`);

  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, signatureInput);
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${headerB64}.${claimB64}.${signatureB64}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

async function listFilesInFolder(
  accessToken: string,
  folderId: string
): Promise<DriveFile[]> {
  const query = `'${folderId}' in parents and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,parents,createdTime,modifiedTime,size)`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Drive API error: ${error}`);
  }

  const data = await response.json();
  return data.files || [];
}

async function findFolderByName(
  accessToken: string,
  folderName: string,
  parentId?: string
): Promise<string | null> {
  let query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }

  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) return null;

  const data = await response.json();
  return data.files?.[0]?.id || null;
}

async function getFileContent(accessToken: string, fileId: string): Promise<string> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function detectDocumentCategory(fileName: string, folderPath: string): string {
  const lowerName = fileName.toLowerCase();
  const lowerPath = folderPath.toLowerCase();

  if (lowerPath.includes("sales") || lowerPath.includes("revenue")) {
    return "sales_invoice";
  }
  if (lowerPath.includes("cost") || lowerPath.includes("contractor")) {
    return "cost_invoice";
  }
  if (lowerPath.includes("bank") || lowerPath.includes("statement")) {
    return "bank_statement";
  }
  if (lowerPath.includes("contract") || lowerName.includes("sow") || lowerName.includes("contract")) {
    return "contract";
  }

  // Fallback based on file name
  if (lowerName.includes("invoice")) {
    return lowerName.includes("purchase") || lowerName.includes("cost") ? "cost_invoice" : "sales_invoice";
  }
  if (lowerName.includes("statement") || lowerName.includes("bank")) {
    return "bank_statement";
  }

  return "other";
}

function detectMonthFromFileName(fileName: string): string | null {
  // Try various date patterns
  const patterns = [
    /(\d{4})-(\d{2})/, // 2026-01
    /(\d{4})(\d{2})/, // 202601
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[-_\s]?(\d{4})/i, // Jan-2026, January2026
    /(\d{4})[-_\s]?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i, // 2026-Jan
  ];

  const monthNames: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };

  for (const pattern of patterns) {
    const match = fileName.match(pattern);
    if (match) {
      if (match[1].length === 4 && /^\d+$/.test(match[2])) {
        // YYYY-MM format
        return `${match[1]}-${match[2].padStart(2, "0")}`;
      }
      if (match[1].length === 4 && monthNames[match[2].toLowerCase().slice(0, 3)]) {
        // YYYY-Mon format
        return `${match[1]}-${monthNames[match[2].toLowerCase().slice(0, 3)]}`;
      }
      if (monthNames[match[1].toLowerCase().slice(0, 3)] && match[2].length === 4) {
        // Mon-YYYY format
        return `${match[2]}-${monthNames[match[1].toLowerCase().slice(0, 3)]}`;
      }
    }
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT");
    if (!serviceAccountJson) {
      throw new Error("Google service account not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { month } = await req.json();
    if (!month) {
      throw new Error("Month parameter required (format: YYYY-MM)");
    }

    const serviceAccount = JSON.parse(serviceAccountJson) as GoogleServiceAccount;
    const accessToken = await createGoogleAuthToken(serviceAccount);

    // Find the TechPros Shared folder
    const sharedFolderId = await findFolderByName(accessToken, "TechPros Shared");
    if (!sharedFolderId) {
      throw new Error("TechPros Shared folder not found in Google Drive");
    }

    // Find inbox folder
    const inboxFolderId = await findFolderByName(accessToken, "inbox", sharedFolderId);
    if (!inboxFolderId) {
      throw new Error("inbox folder not found in TechPros Shared");
    }

    // Find subfolders
    const salesFolderId = await findFolderByName(accessToken, "sales", inboxFolderId);
    const costsFolderId = await findFolderByName(accessToken, "costs", inboxFolderId);
    const bankFolderId = await findFolderByName(accessToken, "bank_statements", inboxFolderId);

    const foldersToScan = [
      { id: salesFolderId, path: "inbox/sales", category: "sales_invoice" },
      { id: costsFolderId, path: "inbox/costs", category: "cost_invoice" },
      { id: bankFolderId, path: "inbox/bank_statements", category: "bank_statement" },
    ].filter((f) => f.id);

    let newDocuments = 0;
    const errors: string[] = [];

    for (const folder of foldersToScan) {
      if (!folder.id) continue;

      try {
        const files = await listFilesInFolder(accessToken, folder.id);

        for (const file of files) {
          // Skip folders
          if (file.mimeType === "application/vnd.google-apps.folder") continue;

          // Check if already in database
          const { data: existing } = await supabase
            .from("documents")
            .select("id")
            .eq("google_drive_id", file.id)
            .single();

          if (existing) continue;

          // Detect document details
          const category = detectDocumentCategory(file.name, folder.path);
          const detectedMonth = detectMonthFromFileName(file.name);
          const appliesTo = detectedMonth || month;

          // Determine file type
          let fileType = "other";
          if (file.mimeType.includes("pdf") || file.name.endsWith(".pdf")) {
            fileType = "invoice";
          } else if (
            file.mimeType.includes("csv") ||
            file.mimeType.includes("spreadsheet") ||
            file.name.endsWith(".csv") ||
            file.name.endsWith(".xlsx")
          ) {
            fileType = "bank_statement";
          }

          // Insert new document
          const { error: insertError } = await supabase.from("documents").insert({
            file_name: file.name,
            file_path: `${folder.path}/${file.name}`,
            file_type: fileType,
            file_size: file.size ? parseInt(file.size) : null,
            mime_type: file.mimeType,
            processing_status: "pending",
            inbox_status: "pending",
            document_category: category,
            applies_to_month: `${appliesTo}-01`,
            google_drive_id: file.id,
            google_drive_path: `${folder.path}/${file.name}`,
          });

          if (insertError) {
            errors.push(`Failed to insert ${file.name}: ${insertError.message}`);
          } else {
            newDocuments++;
          }
        }
      } catch (folderError) {
        errors.push(`Error scanning ${folder.path}: ${folderError instanceof Error ? folderError.message : "Unknown error"}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        newDocuments,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Scan error:", error);
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
