#!/usr/bin/env npx ts-node

/**
 * Setup Google Drive folder structure for Document Inbox
 * Creates: inbox/{sales,costs,bank_statements}, contracts, processed, context
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
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const claimB64 = Buffer.from(JSON.stringify(claim)).toString('base64url');

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(`${headerB64}.${claimB64}`);
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

async function findFolder(accessToken: string, name: string, parentId?: string): Promise<string | null> {
  let query = `name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }

  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    console.error('Error searching for folder:', await response.text());
    return null;
  }

  const data = await response.json();
  return data.files?.[0]?.id || null;
}

async function createFolder(accessToken: string, name: string, parentId?: string): Promise<string> {
  const metadata: Record<string, unknown> = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
  };

  if (parentId) {
    metadata.parents = [parentId];
  }

  const response = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create folder '${name}': ${error}`);
  }

  const data = await response.json();
  return data.id;
}

async function ensureFolder(accessToken: string, name: string, parentId?: string): Promise<string> {
  // Check if folder exists
  const existingId = await findFolder(accessToken, name, parentId);
  if (existingId) {
    console.log(`  ✓ ${name} (exists)`);
    return existingId;
  }

  // Create it
  const newId = await createFolder(accessToken, name, parentId);
  console.log(`  + ${name} (created)`);
  return newId;
}

async function main() {
  console.log('Setting up Google Drive folders for TechPros Admin...\n');

  // Check for service account file
  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error(`Service account file not found at: ${SERVICE_ACCOUNT_PATH}`);
    console.error('Please ensure the service account JSON file is in your Downloads folder.');
    process.exit(1);
  }

  const serviceAccount: ServiceAccount = JSON.parse(
    fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8')
  );

  console.log(`Using service account: ${serviceAccount.client_email}\n`);

  const accessToken = await createAuthToken(serviceAccount);

  // Find or create TechPros Shared folder
  console.log('Looking for TechPros Shared folder...');
  let sharedFolderId = await findFolder(accessToken, 'TechPros Shared');

  if (!sharedFolderId) {
    console.log('TechPros Shared folder not found. Creating it...');
    sharedFolderId = await createFolder(accessToken, 'TechPros Shared');
    console.log('  + TechPros Shared (created)\n');
  } else {
    console.log('  ✓ TechPros Shared (exists)\n');
  }

  // Create folder structure
  console.log('Creating folder structure:');
  console.log('TechPros Shared/');

  // inbox folder and subfolders
  const inboxId = await ensureFolder(accessToken, 'inbox', sharedFolderId);
  console.log('  inbox/');
  await ensureFolder(accessToken, 'sales', inboxId);
  await ensureFolder(accessToken, 'costs', inboxId);
  await ensureFolder(accessToken, 'bank_statements', inboxId);

  // contracts folder
  await ensureFolder(accessToken, 'contracts', sharedFolderId);

  // processed folder
  await ensureFolder(accessToken, 'processed', sharedFolderId);

  // context folder
  await ensureFolder(accessToken, 'context', sharedFolderId);

  console.log('\n✅ Folder structure created successfully!');
  console.log('\nFolder structure:');
  console.log('TechPros Shared/');
  console.log('├── inbox/');
  console.log('│   ├── sales/           ← Client invoices (from Xero)');
  console.log('│   ├── costs/           ← Contractor invoices');
  console.log('│   └── bank_statements/ ← Monthly bank CSVs');
  console.log('├── contracts/           ← SOWs, MSAs (reference)');
  console.log('├── processed/           ← Auto-moved after import');
  console.log('└── context/             ← Other reference docs');
  console.log('\nNote: Make sure the folder is shared with both you and Taryn!');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
