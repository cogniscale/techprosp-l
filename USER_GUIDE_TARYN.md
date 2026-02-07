# TechPros Admin - User Guide for Taryn

This guide covers everything you need to know to use the TechPros Admin system for managing finances, tracking costs, and viewing reports.

---

## Getting Started

### Logging In
1. Go to the app URL (e.g., `https://techpros-admin.netlify.app`)
2. Enter your email and password
3. Click **Sign in**

### Navigation
The left sidebar contains all main sections:
- **Dashboard** - Financial overview and KPIs
- **Document Inbox** - Process invoices and bank statements from Google Drive
- **Sales Revenue** - Invoices and revenue tracking
- **Activities** - CogniScale activities
- **Costs** - HR, Software, and Travel costs
- **P&L** - Profit & Loss statement
- **Forecasts** - Revenue forecasting
- **Scenarios** - Business planning scenarios
- **KPIs** - Key Performance Indicators
- **Quarterly** - Quarterly summaries
- **Scorecard** - Success criteria tracking
- **CogniScale Fees** - Fee structure reference
- **Documents** - Uploaded documents
- **Settings** - Your profile (bottom of sidebar)

---

## Dashboard

The Dashboard gives you an instant snapshot of business performance.

### KPI Cards (Top Row)
- **Total Revenue** - Monthly revenue total
- **Gross Profit** - Revenue minus all costs, with margin %
- **CogniScale Activities** - Activity count + completed surveys
- **Pending Invoices** - Invoices awaiting payment

### Revenue by Client
Bar chart showing monthly revenue breakdown by client (6sense, Enate, Gilroy, HubbubHR, Amphora, CogniScale).

### Profit Pool Card
Shows the profit calculation:
- **Gross Profit** = Revenue - All Costs
- **Profit Pool** = Gross Profit - Central Overhead (£4,200)
- **Taryn's Share** = 12% of Profit Pool

### Operating Costs
Breakdown of HR, Software, and Travel costs.

---

## Document Inbox (Main Workflow)

The Document Inbox is the primary way to import financial documents into the system. Documents are synced from Google Drive.

### Google Drive Folder Structure

All documents go into the shared Google Drive, organised by month:
```
TechPros Shared/
├── inbox/
│   └── 2026-01/              ← One folder per month
│       ├── sales/            ← Client invoices (PDFs from Xero)
│       ├── costs/            ← Contractor invoices
│       └── bank_statements/  ← Monthly bank statements (CSV)
├── processed/
│   └── 2026-01/              ← Mirrors inbox structure
│       ├── sales/
│       ├── costs/
│       └── bank_statements/
├── contracts/                ← Active SOWs and contracts (reference)
└── context/                  ← Other reference documents
```

### Monthly Workflow

1. **Save documents to Google Drive** - Put invoices and statements in the appropriate inbox folder
2. **Go to Document Inbox** in the app
3. **Click "Scan Drive"** - System finds new documents
4. **Review each document**:
   - For **Sales Invoices**: Set how many months to spread the revenue
   - For **Cost Invoices**: Confirm the team member
   - For **Bank Statements**: Review matched software transactions
5. **Click Import** - Data is recorded in the system
6. **Files automatically move** to the `processed/` folder

### Processing Sales Invoices

When you review a sales invoice:
1. System extracts: Client, Amount, Invoice Date, Invoice Number
2. **You decide**: How many months to spread the revenue
3. **You set**: Which month to start recognition
4. **Preview**: See the monthly amount (e.g., £12,000 ÷ 12 = £1,000/month)
5. Click **Import Invoice** → Revenue recognition entries are created

### Processing Cost Invoices (Contractors)

When you review a contractor invoice:
1. System extracts: Supplier name, Amount, Period
2. System suggests: Which team member this matches
3. **You confirm**: The team member and amount
4. Click **Import Cost** → HR cost is recorded

### Processing Bank Statements

When you review a bank statement:
1. System parses all transactions
2. System matches transactions to software subscriptions
3. Shows: ✓ Matched items, ⚠ Variances from default, ? Unmatched
4. **You review**: Confirm matches are correct
5. Click **Import** → Software costs are recorded for the month

### Reference Contracts

The sidebar shows active contracts and SOWs for reference. Use these to:
- Check contract terms when setting revenue spread
- Verify monthly values match the agreement
- Link invoices to their parent contract

---

## Sales Revenue (Invoices)

Manage client invoices and track how revenue is recognized over time.

### Creating an Invoice
1. Click the **+** button
2. Fill in:
   - **Invoice Number** - Your reference number
   - **Client** - Select from dropdown
   - **Invoice Date** - When the invoice was issued
   - **Total Value** - Full invoice amount
   - **Months to Spread** - How many months to recognize revenue (e.g., 12 for annual contracts)
   - **Recognition Start Month** - When revenue recognition begins
   - **Status** - Pending, Sent, Paid, or Overdue
3. Click **Create Invoice**

### How Revenue Recognition Works
When you create an invoice, the system automatically spreads the revenue across the months you specify.

**Example:** A £12,000 invoice spread over 12 months starting January will show £1,000 revenue each month from January to December.

### Viewing Invoices
- **List View** - See all invoices with status filters
- **Revenue Tracker** - Grid view showing monthly revenue recognition

---

## Costs Management

### Team / HR Costs

Track salaries and contractor payments.

**Monthly Cost Grid:**
- Each row is a team member (Taryn, Vanessa, Aamir, Nikita, Pakistan Team)
- Columns show each month (Jan-Dec)
- Click any cell to edit the cost for that month
- **Base** = Salary/contractor fee
- **Bonus** = Additional payments (typically 10%)

**Adding a Team Member:**
1. Click **Add Team Member**
2. Enter name, default monthly cost, and type (FTE or Contractor)
3. For contractors, add supplier name for invoice matching

### Software Costs

Track all 44 software subscriptions.

**Monthly Grid:**
- Each row is a software item
- Click cells to override the default monthly cost
- **TechPros %** shows allocation if the cost is shared with other companies

**Recording Software Costs from Bank Statement:**
1. Open the chat panel (bottom of screen)
2. Drop your bank statement CSV into the chat
3. The AI will match transactions to software items
4. Review the matches
5. Type "Yes" to confirm and record all costs

### Travel Costs

Track travel and expense budgets.

**Monthly Grid:**
- **Budget** - Planned spending (default £375/month)
- **Actual** - What was actually spent
- Click cells to update either value

---

## P&L (Profit & Loss)

View the monthly financial performance.

### Selecting a Period
- Use the **Year** dropdown to select the year
- Use the **Month** dropdown to select the month
- Use **<** and **>** arrows to move between months

### Understanding the P&L

**Revenue Section:**
- **Actual** - Revenue from invoices (based on recognition schedule)
- **Forecast** - What you predicted (entered in Forecasts page)
- **Variance** - Difference between actual and forecast

**Costs Section:**
- **HR Costs** - Team salaries + bonuses
- **Software Costs** - All subscriptions
- **Travel Costs** - Travel and expenses
- **Total Costs** - Sum of all costs

**Profit Section:**
- **Gross Profit** = Revenue - Total Costs
- **Central Overhead** = £4,200 (configurable via settings icon)
- **Profit Pool** = Gross Profit - Central Overhead
- **Taryn's Share** = 12% of Profit Pool

### Changing Central Overhead
Click the settings/gear icon to update the monthly overhead amount.

---

## Forecasts

Enter revenue predictions for planning and comparison.

### Entering Forecasts
1. Go to **Forecasts** page
2. Click any cell to enter a monthly forecast for that client
3. Or enter an **Annual** total and click **Distribute Evenly** to spread it across 12 months

### Using Forecasts
Once entered, forecasts appear in the P&L page alongside actuals, showing variance.

---

## Scenarios

Plan for different business outcomes.

### Three Scenarios
- **Pessimistic** - Worst case
- **Realistic** - Expected outcome
- **Optimistic** - Best case

### Using Scenarios
1. Add revenue or cost items
2. Enter values for each scenario
3. Use this for "what if" planning (e.g., "What if we lose a client?")

---

## KPIs

Track Key Performance Indicators and activities.

### KPI View
- Set **Target** values for each month
- Enter **Actual** values as they occur
- System calculates variance

### Activity View
Track CogniScale activities:
- Interviews conducted
- Roundtables held
- Event participants
- MQL3s generated
- C-level meetings
- Surveys completed

---

## Quarterly Summary

View financial data aggregated by quarter:
- **Q1** (Jan-Mar)
- **Q2** (Apr-Jun)
- **Q3** (Jul-Sep)
- **Q4** (Oct-Dec)

Use this for quarterly business reviews.

---

## Scorecard

Track success criteria with RAG (Red/Amber/Green) status.

### Review Periods
- H1 (Jan-Jun)
- H2 (Jul-Dec)
- Full Year

### Tracking Success
- Set targets for each metric
- Enter actuals as they happen
- System shows variance and status

---

## CogniScale Fees

Reference page showing the fee structure:

### Fixed Fees
- Monthly fixed fee: £353 (~£4,236/year)
- Includes listed billable services

### Variable Fees
- £1,000 per survey
- £700 per C-level meeting

---

## Documents

Upload and process business documents.

### Supported Documents
- **Client Invoices** (PDF) - Creates invoice records
- **Contractor Invoices** (PDF) - Records HR costs
- **Bank Statements** (CSV) - Matches to software costs
- **Contracts** (PDF) - Extracts terms and dates

### Processing Documents
1. Upload a document or drop it in the chat
2. AI extracts the relevant data
3. Review the extraction in chat
4. Confirm to save to the database

---

## Using the Chat Panel

The chat panel (bottom of every page) is your AI assistant for data entry and queries.

### Asking Questions
- "What was January revenue?"
- "Show me P&L for February"
- "What are software costs for Q1?"

### Processing Documents
1. Drop a file into the chat
2. AI extracts information automatically
3. Review what was extracted
4. Type **Yes** to confirm and save

### Recording Costs
- Drop a contractor invoice → AI matches to team member → Confirm to record
- Drop a bank statement → AI matches transactions → Confirm to record all

---

## Common Workflows

### Month-End Process (Recommended Order)

1. **Gather Documents**
   - Save all client invoices (from Xero) to `inbox/sales/`
   - Save all contractor invoices to `inbox/costs/`
   - Download bank statement and save to `inbox/bank_statements/`

2. **Process in Document Inbox**
   - Go to **Document Inbox**
   - Click **Scan Drive** to find new documents
   - Process each document type:

3. **Import Sales Invoices**
   - Review each invoice
   - Set months to spread (check contract for terms)
   - Set recognition start month
   - Click **Import**

4. **Import Cost Invoices**
   - Review contractor invoices
   - Confirm team member match
   - Verify amount
   - Click **Import**

5. **Import Bank Statement**
   - Review matched software transactions
   - Verify matches are correct
   - Handle any unmatched items
   - Click **Import**

6. **Verify in P&L**
   - Go to **P&L** page
   - Check the month's figures
   - Confirm revenue and costs are correct
   - Review Profit Pool and your share

### Alternative: Quick Entry via Chat

For quick one-off entries, you can still use the chat panel:
- Drop a contractor invoice → AI extracts and records
- Drop a bank statement → AI matches and records
- Type "Yes" to confirm

### Weekly: Check Dashboard

- Review KPIs and pending invoices
- Check for any outstanding items
- Monitor Profit Pool status

---

## Key Business Rules

### Your Share (Taryn's Share)
- **12% of Profit Pool** (not gross profit)
- Profit Pool = Gross Profit - £4,200 Central Overhead
- This is NOT a cost - it comes from profit after overhead

### Revenue Recognition
- Invoice amount is spread across the months you specify
- Revenue appears in P&L during those months
- Example: £12,000 over 12 months = £1,000/month

### HR Costs
- Base cost + Bonus per person per month
- Default costs apply unless you override for a specific month

### Software Costs
- Default monthly costs unless overridden
- TechPros % allocation for shared costs

---

## Tips

1. **Use Document Inbox** for month-end processing - it's the most efficient way to import all documents
2. **Save documents to the right folder** - sales invoices go to `inbox/sales/`, costs to `inbox/costs/`
3. **Name files with the month** - e.g., `Aamir-Jan-2026.pdf` helps auto-detect the period
4. **Check contracts** when setting revenue spread - make sure it matches the agreement
5. **Review P&L after importing** - verify all figures before month-end close
6. **Use the chat** for quick one-off entries or questions
7. **Set forecasts early** so you can track variance throughout the year

---

## Getting Help

If you encounter issues:
1. Check this guide first
2. Try refreshing the page
3. Contact Tim for technical support

---

*Last updated: February 2026*
