const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SERVICE_ACCOUNT_PATH = path.join(process.env.HOME, 'Downloads/gen-lang-client-0090907693-e66e5b9e90f0.json');
const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'));

async function getToken() {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const claimB64 = Buffer.from(JSON.stringify(claim)).toString('base64url');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(headerB64 + '.' + claimB64);
  const signature = sign.sign(serviceAccount.private_key, 'base64url');
  const jwt = headerB64 + '.' + claimB64 + '.' + signature;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + jwt,
  });
  const data = await res.json();
  return data.access_token;
}

async function listFolder(token, folderId, indent = '') {
  const query = "'" + folderId + "' in parents and trashed = false";
  const url = 'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(query) + '&fields=files(id,name,mimeType)&orderBy=name';
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
  const data = await res.json();

  for (const file of (data.files || [])) {
    const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
    console.log(indent + (isFolder ? '📁 ' : '📄 ') + file.name);
    if (isFolder) {
      await listFolder(token, file.id, indent + '  ');
    }
  }
}

async function main() {
  const token = await getToken();

  // Find TechPros Shared
  const query = "name = 'TechPros Shared' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
  const url = 'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(query) + '&fields=files(id,name)';
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
  const data = await res.json();

  if (!data.files || data.files.length === 0) {
    console.log('TechPros Shared folder not found');
    return;
  }

  console.log('📁 TechPros Shared');
  await listFolder(token, data.files[0].id, '  ');
}

main().catch(console.error);
