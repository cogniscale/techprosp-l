#!/usr/bin/env npx ts-node

/**
 * Fetch emails from Gmail using service account with domain-wide delegation
 * Usage: npx ts-node scripts/fetch-gmail.ts <search-query> [user-email]
 * Example: npx ts-node scripts/fetch-gmail.ts "from:invoices@zoom.us" tim.bond@networksunday.com
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
    sub: userEmail, // Impersonate this user
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

async function searchEmails(accessToken: string, query: string, maxResults = 10) {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gmail API error: ${error}`);
  }

  return response.json();
}

async function getEmail(accessToken: string, messageId: string) {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gmail API error: ${error}`);
  }

  return response.json();
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

function getHeader(headers: Array<{name: string, value: string}>, name: string): string {
  const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return header?.value || '';
}

async function main() {
  const query = process.argv[2];
  const userEmail = process.argv[3] || 'tim.bond@networksunday.com';

  if (!query) {
    console.error('Usage: npx ts-node scripts/fetch-gmail.ts <search-query> [user-email]');
    console.error('Examples:');
    console.error('  npx ts-node scripts/fetch-gmail.ts "invoice" tim.bond@networksunday.com');
    console.error('  npx ts-node scripts/fetch-gmail.ts "from:billing@zoom.us"');
    console.error('  npx ts-node scripts/fetch-gmail.ts "subject:invoice has:attachment after:2026/01/01"');
    process.exit(1);
  }

  console.error(`Searching emails for: ${userEmail}`);
  console.error(`Query: ${query}`);

  const serviceAccount: ServiceAccount = JSON.parse(
    fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8')
  );

  const accessToken = await createAuthToken(serviceAccount, userEmail);
  const searchResults = await searchEmails(accessToken, query);

  if (!searchResults.messages || searchResults.messages.length === 0) {
    console.log('No emails found');
    return;
  }

  console.error(`Found ${searchResults.messages.length} emails\n`);

  const emails = [];
  for (const msg of searchResults.messages.slice(0, 10)) {
    const email = await getEmail(accessToken, msg.id);
    const headers = email.payload?.headers || [];

    const emailData: any = {
      id: msg.id,
      date: getHeader(headers, 'Date'),
      from: getHeader(headers, 'From'),
      subject: getHeader(headers, 'Subject'),
      attachments: []
    };

    // Check for attachments
    const parts = email.payload?.parts || [];
    for (const part of parts) {
      if (part.filename && part.body?.attachmentId) {
        emailData.attachments.push({
          filename: part.filename,
          mimeType: part.mimeType,
          attachmentId: part.body.attachmentId
        });
      }
    }

    emails.push(emailData);
  }

  console.log(JSON.stringify(emails, null, 2));
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
