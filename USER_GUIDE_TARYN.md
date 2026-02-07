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

### Monthly: Recording Contractor Costs
1. Receive contractor invoice (PDF)
2. Drop it in the chat
3. AI extracts: supplier, amount, period
4. AI matches supplier to team member
5. Confirm: "Yes, record as [Name]'s cost for [Month]"
6. Cost appears in HR Costs and P&L

### Monthly: Recording Software Costs
1. Download bank statement (CSV)
2. Drop in chat
3. AI parses and matches transactions
4. Review the matches shown
5. Confirm: "Yes, record all"
6. Costs appear in Software Costs and P&L

### Monthly: Creating Client Invoice
1. Go to **Sales Revenue**
2. Click **+** to add invoice
3. Enter details and spread period
4. Invoice creates revenue recognition entries
5. Revenue appears in P&L for those months

### Monthly: Financial Review
1. Go to **P&L**
2. Select the month
3. Review:
   - Actual vs Forecast revenue
   - All costs
   - Gross Profit and Profit Pool
   - Your 12% share
4. Identify any variances to investigate

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

1. **Use the chat** for quick data entry - it's faster than clicking through forms
2. **Check the P&L monthly** to ensure costs are recorded correctly
3. **Drop bank statements in chat** to bulk-record software costs
4. **Set forecasts early** so you can track variance throughout the year
5. **Review the Dashboard** for a quick health check of the business

---

## Getting Help

If you encounter issues:
1. Check this guide first
2. Try refreshing the page
3. Contact Tim for technical support

---

*Last updated: February 2026*
