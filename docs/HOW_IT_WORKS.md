# TechPros Admin - How It Works

A simple guide to understanding the system, where things are stored, and how to use it.

---

## What Is This System?

TechPros Admin is a web application that replaces the Excel spreadsheet for tracking:
- **Sales Revenue** - Invoices and how revenue is spread across months
- **Costs** - HR/contractors, software subscriptions, travel
- **KPIs** - Performance metrics and targets
- **P&L** - Profit & Loss, automatically calculated
- **Scenarios** - Pessimistic/Realistic/Optimistic planning
- **Scorecard** - Performance review tracking for July 2026

The app runs in your web browser and stores all data securely in the cloud.

---

## Where Is Everything Stored?

### 1. The Application Code (GitHub)
- **What:** The actual software that runs the app
- **Where:** GitHub (a code sharing platform)
- **Who can access:** Tim and Taryn (with Claude Code)
- **Why:** So both of us can make improvements and use AI assistance

### 2. The Data (Supabase Cloud Database)
- **What:** All the numbers - invoices, costs, KPIs, everything you enter
- **Where:** Supabase (a secure cloud database)
- **Who can access:** Anyone logged into the app
- **Why:** One source of truth, accessible from anywhere, automatically backed up

### 3. Documents for Processing (Shared Google Drive)
- **What:** All source documents - invoices, contracts, bank statements, SOWs, emails, receipts
- **Where:** Google Drive folder shared between Tim and Taryn
- **Folder structure:**
  ```
  TechPros Shared/
  ├── invoices/        ← Client invoices we've raised
  ├── bank-statements/ ← Monthly CSV exports
  ├── contracts/       ← Client contracts and SOWs
  ├── receipts/        ← Software and travel receipts
  └── correspondence/  ← Relevant emails and notes
  ```
- **Who can access:** Tim, Taryn, and Claude Code (via local sync)
- **How it works:**
  1. Drop files in the appropriate folder
  2. Google Drive syncs to your machine
  3. Claude Code reads from your local sync
  4. You confirm what Claude found
  5. Database updates automatically

---

## How Does the AI (Claude) Fit In?

Claude Code is the primary way we interact with the system for document processing and updates.

### What Claude Code Does
- **Reads documents** - Invoices, bank statements, contracts, SOWs, emails
- **Extracts data** - Parses amounts, dates, clients, line items automatically
- **Shows what it found** - Presents extracted data for your review
- **Asks for confirmation** - Nothing is saved until you say "yes"
- **Updates the database** - Records data directly to Supabase
- **Answers questions** - "What's our January P&L?", "Which invoices are overdue?"
- **Builds and improves the app** - Makes changes to the codebase when needed

### What You Do
1. Drop documents in the shared Google Drive folder
2. Open Claude Code and say "Please process the new documents"
3. Review what Claude found
4. Confirm or correct
5. Done - the app updates automatically

### In-App Chat (Future Enhancement)
- Quick queries without opening Claude Code
- Mobile-friendly access
- Not needed for document processing

---

## The Data Flow

### Document Processing Flow
```
You drop documents in the shared Google Drive folder
(invoices, bank statements, contracts, SOWs, emails)
                    ↓
Google Drive syncs to your local machine automatically
                    ↓
You open Claude Code and say:
"Please process the new documents in the shared folder"
                    ↓
Claude Code reads and analyses everything:
  • Invoices → client, amount, dates, payment terms
  • Bank statements → matches to software/contractors
  • Contracts/SOWs → value, dates, deliverables
  • Emails → context about changes or agreements
                    ↓
Claude Code shows what it found:
"I found 3 invoices totalling £15,000 and 8 software payments"
                    ↓
You review and confirm: "Yes, that's correct"
(or clarify: "The £500 is for GitHub not GitLab")
                    ↓
Claude Code updates the database directly
                    ↓
App reflects the changes immediately
P&L, forecasts, and reports update automatically
```

### Why This Works Well
- **Conversational** - You can ask questions, clarify, correct
- **Flexible** - Any document type, any format
- **Safe** - Nothing changes until you confirm
- **Shared** - Tim or Taryn can process documents
- **Context-aware** - Claude knows the system and your data

---

## What Each Page Does

| Page | Purpose | What You Do |
|------|---------|-------------|
| **Dashboard** | Overview of the business | View key metrics at a glance |
| **Sales Revenue** | Track invoices & revenue recognition | Add invoices, set how many months to spread |
| **Activities** | CogniScale pipeline activities | Log interviews, roundtables, meetings |
| **Team/HR** | Contractor costs | Enter monthly actual costs per person |
| **Software** | Software subscriptions | Enter monthly actual costs per tool |
| **Travel** | Travel expenses | Enter monthly travel costs |
| **P&L** | Profit & Loss statement | View only - calculates automatically |
| **Forecasts** | Monthly revenue projections | Adjust expected revenue per client |
| **Scenarios** | Annual planning (3 scenarios) | Model pessimistic/realistic/optimistic |
| **KPIs** | Key Performance Indicators | Enter targets and actuals monthly |
| **Quarterly** | Q1-Q4 summary view | View only - aggregates from monthly |
| **Scorecard** | Performance review tracking | Enter actuals against review criteria |
| **CogniScale Fees** | Fee structure reference | View only - shows billable rates |

---

## Revenue Recognition Explained

When you raise an invoice, the money isn't always "earned" in that month. For example:

**Invoice:** £12,000 for 6 months of service (Jan-Jun)
**How it works:**
- Invoice date: January 2026
- Total value: £12,000
- Months to spread: 6
- Recognition start: January 2026

**Result:** £2,000 appears as revenue in each month (Jan, Feb, Mar, Apr, May, Jun)

This is called "revenue recognition" and it's how accountants properly match income to the period it's earned.

---

## The Key Business Calculations

### Gross Profit
```
Revenue (from invoices)
- HR Costs
- Software Costs
- Travel Costs
= Gross Profit
```

### Profit Pool
```
Gross Profit
- Central Overhead (£4,200/month)
= Profit Pool
```

### Taryn's Profit Share
```
Profit Pool × 12% = Taryn's Share
(Paid quarterly in arrears)
```

---

## How Tim & Taryn Both Use It

### Shared Setup
1. **Same codebase** - Both clone from GitHub
2. **Same database** - Both connect to the same Supabase (single source of truth)
3. **Same documents** - Both access the shared Google Drive folder
4. **Same Claude Code** - Both have Claude Code with access to the project

### Day-to-Day Usage

**Option A: Use the App Directly**
- Log into the app at `https://techpros-admin.vercel.app`
- View dashboards, P&L, KPIs
- Manually enter data if needed
- Good for quick lookups and simple updates

**Option B: Use Claude Code (Recommended for Documents)**
- Open Claude Code in the project folder
- Drop documents in the shared Google Drive
- Say "Please process the new documents"
- Review and confirm
- Much faster for bulk updates

### Typical Workflows

**Processing a Bank Statement:**
1. Download CSV from bank
2. Drop in `TechPros Shared/bank-statements/`
3. Open Claude Code: "Process the January bank statement"
4. Claude shows matched transactions
5. Confirm: "Yes, record those"
6. Software costs updated

**Recording a New Invoice:**
1. Save invoice PDF to `TechPros Shared/invoices/`
2. Open Claude Code: "Process the new invoice"
3. Claude extracts: client, amount, dates, terms
4. Confirm revenue recognition spread
5. Invoice and revenue records created

**Quick Questions:**
- "What's our January gross profit?"
- "Which software costs are over budget?"
- "Show me Taryn's profit share for Q1"

---

## Document Types You Can Drop

| Document | What Claude Extracts | Updates |
|----------|---------------------|---------|
| **Invoice PDF** | Client, amount, date, payment terms | Sales Revenue, Revenue Recognition |
| **Bank Statement (CSV)** | Software subscriptions, contractor payments | Software Costs, HR Costs |
| **Contract PDF** | Client, value, dates, terms | Client records, Forecasts |
| **Statement of Work** | Project scope, value, timeline, deliverables | Revenue recognition |
| **Emails** | Context, agreements, changes | Informs other updates |
| **Receipts** | Vendor, amount, date, category | Software/Travel Costs |

### Supported Formats
- **PDFs** - Invoices, contracts, statements of work
- **CSV/Excel** - Bank statements, expense reports
- **Images** - Receipts, screenshots
- **Text/Email** - Correspondence, agreements

Claude Code can read and understand all of these formats.

---

## Security & Access

- **Login required** - You must sign in with email/password
- **Data encrypted** - All data is encrypted in transit and at rest
- **Cloud hosted** - Supabase (database) and Vercel (app) are enterprise-grade
- **Audit trail** - Changes are timestamped with who made them

---

## Getting Started Checklist

### For Taryn (One-Time Setup)

**1. GitHub Access**
- [ ] Get repository access from Tim
- [ ] Clone: `git clone [repo-url]`
- [ ] Run `npm install` in the project folder

**2. Google Drive**
- [ ] Accept invite to "TechPros Shared" folder
- [ ] Install Google Drive for Desktop (if not already)
- [ ] Enable sync - folder appears in your file system

**3. Claude Code**
- [ ] Install Claude Code (you have Claude Team, so this works)
- [ ] Open Claude Code in the techpros-admin folder
- [ ] Copy `.env` file from Tim (contains Supabase keys)

**4. Test It**
- [ ] Run `npm run dev` to start local app
- [ ] Access at `http://localhost:5173`
- [ ] Ask Claude Code: "What invoices do we have?"

### Day-to-Day
- Drop documents in Google Drive shared folder
- Open Claude Code when you want to process them
- Use the app for viewing reports and dashboards

---

## Questions?

Ask Tim or ask Claude Code directly - just describe what you want to do in plain English and it will help!

---

*Document created: February 2026*
*System version: 1.0*
