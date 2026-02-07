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
    scope: 'https://www.googleapis.com/auth/drive',
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

async function findFolder(token, name, parentId) {
  const query = "name = '" + name + "' and mimeType = 'application/vnd.google-apps.folder' and trashed = false" +
    (parentId ? " and '" + parentId + "' in parents" : "");
  const url = 'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(query) + '&fields=files(id,name)';
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
  const data = await res.json();
  return data.files && data.files[0] ? data.files[0].id : null;
}

async function listFiles(token, folderId) {
  const query = "'" + folderId + "' in parents and trashed = false";
  const url = 'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(query) + '&fields=files(id,name,mimeType)';
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
  const data = await res.json();
  return data.files || [];
}

async function renameFolder(token, folderId, newName) {
  const res = await fetch('https://www.googleapis.com/drive/v3/files/' + folderId, {
    method: 'PATCH',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: newName }),
  });
  if (!res.ok) {
    throw new Error('Failed to rename folder: ' + await res.text());
  }
  return await res.json();
}

async function createFolder(token, name, parentId) {
  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  });
  if (!res.ok) {
    throw new Error('Failed to create folder: ' + await res.text());
  }
  const data = await res.json();
  return data.id;
}

async function moveFile(token, fileId, newParentId, oldParentId) {
  const url = 'https://www.googleapis.com/drive/v3/files/' + fileId +
    '?addParents=' + newParentId + '&removeParents=' + oldParentId;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer ' + token },
  });
  if (!res.ok) {
    throw new Error('Failed to move file: ' + await res.text());
  }
  return await res.json();
}

async function main() {
  console.log('Reorganizing Google Drive folders...\n');

  const token = await getToken();

  // Find TechPros Shared
  const sharedId = await findFolder(token, 'TechPros Shared');
  if (!sharedId) {
    console.error('TechPros Shared folder not found');
    return;
  }
  console.log('✓ Found TechPros Shared\n');

  // Find inbox and processed folders
  const inboxId = await findFolder(token, 'inbox', sharedId);
  const processedId = await findFolder(token, 'processed', sharedId);

  if (!inboxId) {
    console.error('inbox folder not found');
    return;
  }

  // Process inbox/2026-01
  console.log('Processing inbox/2026-01...');
  const inbox202601Id = await findFolder(token, '2026-01', inboxId);

  if (inbox202601Id) {
    // 1. Rename income to sales
    const incomeId = await findFolder(token, 'income', inbox202601Id);
    if (incomeId) {
      await renameFolder(token, incomeId, 'sales');
      console.log('  ✓ Renamed income/ → sales/');
    } else {
      // Check if sales already exists
      const salesId = await findFolder(token, 'sales', inbox202601Id);
      if (salesId) {
        console.log('  ✓ sales/ already exists');
      } else {
        // Create sales folder
        await createFolder(token, 'sales', inbox202601Id);
        console.log('  + Created sales/');
      }
    }

    // 2. Create bank_statements folder
    let bankStatementsId = await findFolder(token, 'bank_statements', inbox202601Id);
    if (!bankStatementsId) {
      bankStatementsId = await createFolder(token, 'bank_statements', inbox202601Id);
      console.log('  + Created bank_statements/');
    } else {
      console.log('  ✓ bank_statements/ already exists');
    }

    // 3. Move bank statement files from costs to bank_statements
    const costsId = await findFolder(token, 'costs', inbox202601Id);
    if (costsId) {
      const costsFiles = await listFiles(token, costsId);
      let movedCount = 0;

      for (const file of costsFiles) {
        const nameLower = file.name.toLowerCase();
        // Identify bank statement files
        if (nameLower.includes('bank statement') ||
            nameLower.includes('bank-statement') ||
            (nameLower.includes('.csv') && (nameLower.includes('bank') || nameLower.includes('statement')))) {
          await moveFile(token, file.id, bankStatementsId, costsId);
          console.log('  → Moved: ' + file.name);
          movedCount++;
        }
      }

      if (movedCount === 0) {
        console.log('  (No bank statement files found in costs/ to move)');
      }
    }
  }

  // Process processed/2026-01
  console.log('\nProcessing processed/2026-01...');
  const processed202601Id = await findFolder(token, '2026-01', processedId);

  if (processed202601Id) {
    // 1. Rename income to sales
    const incomeId = await findFolder(token, 'income', processed202601Id);
    if (incomeId) {
      await renameFolder(token, incomeId, 'sales');
      console.log('  ✓ Renamed income/ → sales/');
    } else {
      const salesId = await findFolder(token, 'sales', processed202601Id);
      if (salesId) {
        console.log('  ✓ sales/ already exists');
      }
    }

    // 2. Create bank_statements folder for future use
    let bankStatementsId = await findFolder(token, 'bank_statements', processed202601Id);
    if (!bankStatementsId) {
      bankStatementsId = await createFolder(token, 'bank_statements', processed202601Id);
      console.log('  + Created bank_statements/');
    } else {
      console.log('  ✓ bank_statements/ already exists');
    }
  }

  console.log('\n✅ Reorganization complete!');
  console.log('\nNew structure:');
  console.log('TechPros Shared/');
  console.log('├── inbox/');
  console.log('│   └── 2026-01/');
  console.log('│       ├── sales/           ← Client invoices');
  console.log('│       ├── costs/           ← Contractor invoices');
  console.log('│       └── bank_statements/ ← Bank CSVs');
  console.log('├── processed/');
  console.log('│   └── 2026-01/');
  console.log('│       ├── sales/');
  console.log('│       ├── costs/');
  console.log('│       └── bank_statements/');
  console.log('├── contracts/');
  console.log('└── context/');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
