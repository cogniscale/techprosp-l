#!/usr/bin/env npx ts-node

/**
 * Download email attachment and save to a folder
 * Usage: npx ts-node scripts/download-attachment.ts <message-id> <attachment-id> <filename> <output-folder> [user-email]
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

async function createAuthToken(serviceAccount: ServiceAccount, userEmail: string): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: serviceAccount.client_email,
    sub: userEmail,
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
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

async function getAttachment(accessToken: string, messageId: string, attachmentId: string) {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gmail API error: ${error}`);
  }

  return response.json();
}

async function main() {
  const messageId = process.argv[2];
  const attachmentId = process.argv[3];
  const filename = process.argv[4];
  const outputFolder = process.argv[5];
  const userEmail = process.argv[6] || 'tim.bond@networksunday.com';

  if (!messageId || !attachmentId || !filename || !outputFolder) {
    console.error('Usage: npx ts-node scripts/download-attachment.ts <message-id> <attachment-id> <filename> <output-folder> [user-email]');
    process.exit(1);
  }

  const serviceAccount: ServiceAccount = JSON.parse(
    fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8')
  );

  const accessToken = await createAuthToken(serviceAccount, userEmail);
  const attachment = await getAttachment(accessToken, messageId, attachmentId);

  // Gmail returns base64url encoded data
  const data = attachment.data.replace(/-/g, '+').replace(/_/g, '/');
  const buffer = Buffer.from(data, 'base64');

  const outputPath = path.join(outputFolder, filename);
  fs.writeFileSync(outputPath, buffer);

  console.log(`Saved: ${outputPath}`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
