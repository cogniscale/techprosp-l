#!/usr/bin/env npx ts-node

/**
 * Fetch a Google Sheet as JSON data
 * Usage: npx ts-node scripts/fetch-gsheet.ts <sheet-id-or-gsheet-file-path>
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const SERVICE_ACCOUNT_PATH = path.join(
  process.env.HOME || '',
  'Downloads/gen-lang-client-0090907693-e66e5b9e90f0.json'
);

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

async function createAuthToken(serviceAccount: ServiceAccount): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const claimB64 = Buffer.from(JSON.stringify(claim)).toString('base64url');

  const signatureInput = `${headerB64}.${claimB64}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signatureInput);
  const signature = sign.sign(serviceAccount.private_key, 'base64url');

  const jwt = `${headerB64}.${claimB64}.${signature}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error(`Failed to get token: ${JSON.stringify(tokenData)}`);
  }
  return tokenData.access_token;
}

async function fetchSheet(sheetId: string): Promise<Record<string, unknown>[]> {
  const serviceAccount: ServiceAccount = JSON.parse(
    fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8')
  );

  const accessToken = await createAuthToken(serviceAccount);

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
    return [];
  }

  const headers = rows[0] as string[];
  return rows.slice(1).map((row: unknown[]) => {
    const obj: Record<string, unknown> = {};
    headers.forEach((header, i) => {
      obj[header] = row[i] ?? null;
    });
    return obj;
  });
}

function extractSheetId(input: string): string | null {
  // From URL
  const urlMatch = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch) return urlMatch[1];

  // From .gsheet file
  if (input.endsWith('.gsheet') && fs.existsSync(input)) {
    const content = fs.readFileSync(input, 'utf-8');
    try {
      const json = JSON.parse(content);
      if (json.doc_id) return json.doc_id;
    } catch {}
  }

  // Direct ID
  if (/^[a-zA-Z0-9-_]{20,50}$/.test(input.trim())) {
    return input.trim();
  }

  return null;
}

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error('Usage: npx ts-node scripts/fetch-gsheet.ts <sheet-id-or-url-or-gsheet-file>');
    process.exit(1);
  }

  const sheetId = extractSheetId(input);
  if (!sheetId) {
    console.error('Could not extract sheet ID from input');
    process.exit(1);
  }

  console.error(`Fetching sheet: ${sheetId}`);
  const data = await fetchSheet(sheetId);
  console.log(JSON.stringify(data, null, 2));
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
