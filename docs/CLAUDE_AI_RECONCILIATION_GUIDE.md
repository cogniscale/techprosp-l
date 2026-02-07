# Claude AI Reconciliation Guide

This guide provides instructions for using Claude.ai to analyze bank statements and produce CSV files for import into TechPros Admin.

---

## Overview

**Workflow:**
1. Export bank statement (CSV or PDF) from your bank
2. Upload to Claude.ai with the prompts below
3. Claude analyzes and produces a formatted CSV
4. Review and edit the CSV as needed
5. Download the CSV
6. Import into TechPros Admin (Software Costs → Import CSV)

---

## Software Costs Import

### Required CSV Format

```csv
Name,Month,Amount
Slack,2026-01,29.00
GitHub,2026-01,79.00
Zoom,2026-01,159.00
```

**Columns:**
- **Name**: Software/vendor name (will be matched to existing items in the app)
- **Month**: Format `YYYY-MM` (e.g., `2026-01` for January 2026)
- **Amount**: Cost in GBP (no currency symbol, use decimals)

### Prompt for Claude.ai

Copy and paste this prompt when uploading your bank statement:

---

**PROMPT START**

I'm uploading a bank statement. Please analyze it and extract all software/SaaS subscription payments.

**Known software vendors to look for:**
- Slack (SLACK TECHNOLOGIES, SLACK.COM)
- GitHub (GITHUB INC, GITHUB.COM)
- Zoom (ZOOM.US, ZOOM VIDEO)
- Microsoft 365 (MICROSOFT, MSFT)
- Google Workspace (GOOGLE, GOOGLE.COM)
- Anthropic/Claude (ANTHROPIC)
- OpenAI/ChatGPT (OPENAI)
- AWS (AMAZON WEB SERVICES, AWS)
- Notion (NOTION LABS)
- Figma (FIGMA INC)
- Linear (LINEAR)
- Vercel (VERCEL INC)
- Netlify (NETLIFY)
- Supabase (SUPABASE)
- Airtable (AIRTABLE)
- Calendly (CALENDLY)
- Loom (LOOM INC)
- Miro (MIRO, REALTIMEBOARD)
- 1Password (AGILEBITS)
- LastPass (LASTPASS)
- Dropbox (DROPBOX)
- HubSpot (HUBSPOT)
- Mailchimp (MAILCHIMP, INTUIT MAILCHIMP)
- Stripe (STRIPE PAYMENTS)
- Xero (XERO)

**Instructions:**
1. Find all transactions that match software/SaaS subscriptions
2. Identify the vendor name (normalize to the common name, e.g., "SLACK TECHNOLOGIES" → "Slack")
3. Extract the date and determine the month (YYYY-MM format)
4. Extract the amount (convert to positive number if shown as debit/negative)
5. Flag any uncertain matches with a "?" prefix

**Output format:**
Provide a CSV with columns: Name, Month, Amount

Also provide a summary of:
- Total software costs found
- Any transactions you're uncertain about
- Any potential software payments you excluded and why

**PROMPT END**

---

### Example Output from Claude.ai

```
I found 12 software subscription payments in your January 2026 bank statement:

**CSV Output:**
```csv
Name,Month,Amount
Slack,2026-01,29.00
GitHub,2026-01,79.00
Zoom,2026-01,159.00
Microsoft 365,2026-01,99.00
Anthropic,2026-01,583.00
AWS,2026-01,127.43
Notion,2026-01,15.00
Figma,2026-01,45.00
1Password,2026-01,7.99
Xero,2026-01,42.00
?ACME SAAS,2026-01,50.00
?UNKNOWN TECH,2026-01,25.00
```

**Summary:**
- Total: £1,261.42
- 10 confident matches
- 2 uncertain (prefixed with ?)

**Uncertain transactions:**
- "ACME SAAS LTD" - £50.00 - Appears to be software but not in known list
- "UNKNOWN TECH" - £25.00 - Could be software or hardware

**Excluded:**
- "AMAZON.CO.UK" - £45.99 - Likely retail purchase, not AWS
- "APPLE.COM" - £0.99 - App store purchase, not subscription
```

---

## HR/Contractor Costs Import

### Required CSV Format

```csv
Name,Month,Amount,Type
Vanessa,2026-01,1650.00,base
Aamir,2026-01,1800.00,base
Aamir,2026-01,500.00,bonus
```

**Columns:**
- **Name**: Team member name
- **Month**: Format `YYYY-MM`
- **Amount**: Cost in GBP
- **Type**: `base` or `bonus`

### Prompt for Claude.ai

---

**PROMPT START**

I'm uploading a bank statement. Please analyze it and extract all contractor/freelancer payments.

**Known team members:**
- Taryn (Sales Director, FTE)
- Vanessa (Contractor, ~£1,650/month)
- Aamir (Contractor, ~£1,800/month base + variable bonus)
- Nikita (Contractor, ~£500/month)
- Pakistan Team (Variable monthly overhead)

**Instructions:**
1. Find all payments to contractors/freelancers
2. Match to known team members where possible
3. Separate base payments from bonus payments if identifiable
4. Flag uncertain matches with "?" prefix

**Output format:**
Provide a CSV with columns: Name, Month, Amount, Type

Where Type is either "base" or "bonus"

**PROMPT END**

---

## Tips for Better Results

### 1. Clean Bank Statement Data
Before uploading, ensure your bank statement export:
- Includes transaction descriptions
- Has clear date formatting
- Shows amounts (debit/credit clearly marked)

### 2. Multiple Months
If processing multiple months, either:
- Upload each month separately
- Ask Claude to group by month in the output

### 3. Review Before Import
Always review Claude's output before importing:
- Check uncertain matches (? prefix)
- Verify amounts are correct
- Ensure months are accurate
- Remove any false positives

### 4. New Vendors
If you have new software not in the known list:
- Add them to the prompt
- Or let Claude flag them as uncertain
- The import will offer to create new items

### 5. Currency Conversion
If your bank statement has foreign currency:
- Ask Claude to note the original currency
- Provide the exchange rate to use
- Or convert manually before import

---

## Troubleshooting

### "No matches found"
- Check the bank statement format is readable
- Ensure transaction descriptions are included
- Try a different export format (CSV vs PDF)

### Wrong amounts
- Check if amounts include VAT
- Verify currency (USD vs GBP)
- Check for refunds that should be excluded

### Missing transactions
- Some subscriptions may use parent company names
- Annual subscriptions may only appear once
- Check for payments via PayPal or other processors

---

## Import Process in TechPros Admin

1. **Software Costs Page** → Click "Import CSV"
2. Select your CSV file
3. Review the preview:
   - Green checkmark = exact match to existing software
   - Yellow "Review" = fuzzy match, verify correct
   - "Create new" = no match, will add new software item
4. Click "Import X rows"
5. Costs appear in the monthly spreadsheet

---

## Example Bank Statement Formats

### Natwest/RBS CSV
```
Date,Description,Amount,Balance
02/01/2026,SLACK TECHNOLOGIES,-29.00,1234.56
03/01/2026,GITHUB INC,-79.00,1155.56
```

### Barclays CSV
```
Number,Date,Account,Amount,Subcategory,Memo
1,02-Jan-26,Current,-29.00,Direct Debit,SLACK TECHNOLOGIES
```

### Starling CSV
```
Date,Counter Party,Reference,Type,Amount (GBP),Balance (GBP)
02/01/2026,Slack Technologies,SUBSCRIPTION,FASTER PAYMENT,-29.00,1234.56
```

Claude.ai can handle all these formats - just upload and use the prompt above.

---

## Quick Reference Card

| Task | CSV Columns | Example |
|------|------------|---------|
| Software Costs | Name, Month, Amount | `Slack,2026-01,29.00` |
| HR Base Costs | Name, Month, Amount, Type | `Aamir,2026-01,1800.00,base` |
| HR Bonuses | Name, Month, Amount, Type | `Aamir,2026-01,500.00,bonus` |

**Month format:** `YYYY-MM` (e.g., `2026-01`)
**Amount format:** Numbers only, no currency symbols (e.g., `29.00`)
