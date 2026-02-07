# Ready-to-Use Prompts for Claude.ai

Copy and paste these prompts when uploading bank statements to Claude.ai.

---

## Software Costs Extraction

```
Analyze this bank statement and extract all software/SaaS subscription payments.

Look for these vendors (and similar names):
Slack, GitHub, Zoom, Microsoft 365, Google Workspace, Anthropic/Claude, OpenAI, AWS, Notion, Figma, Linear, Vercel, Netlify, Supabase, Airtable, Calendly, Loom, Miro, 1Password, Dropbox, HubSpot, Mailchimp, Stripe, Xero

Output a CSV with columns: Name, Month, Amount
- Name: Normalized vendor name (e.g., "SLACK TECH" → "Slack")
- Month: YYYY-MM format (e.g., 2026-01)
- Amount: Positive number in GBP

Prefix uncertain matches with "?"

After the CSV, summarize:
1. Total found
2. Uncertain transactions
3. Excluded transactions and why
```

---

## HR/Contractor Costs Extraction

```
Analyze this bank statement and extract all contractor/freelancer payments.

Known team members:
- Vanessa (~£1,650/month)
- Aamir (~£1,800/month + bonuses)
- Nikita (~£500/month)
- Pakistan Team (variable)

Output a CSV with columns: Name, Month, Amount, Type
- Type should be "base" or "bonus"

Prefix uncertain matches with "?"
```

---

## Full Monthly Reconciliation

```
Analyze this bank statement for January 2026 and extract:

1. SOFTWARE COSTS - SaaS subscriptions
2. CONTRACTOR PAYMENTS - Freelancer/contractor fees

Output TWO separate CSVs:

**Software CSV** (columns: Name, Month, Amount):
[software transactions here]

**HR CSV** (columns: Name, Month, Amount, Type):
[contractor transactions here]

Then provide:
- Summary totals for each category
- List of uncertain transactions
- Any transactions that might be miscategorized
```

---

## Invoice Data Extraction (from PDF invoices)

```
Extract invoice details from this document:

Output format:
- Invoice Number:
- Client Name:
- Invoice Date:
- Total Amount (GBP):
- Suggested spread (months): [1 if one-off, or suggest 3/6/12 for retainers]
- Notes:

If multiple invoices, output as a table.
```
