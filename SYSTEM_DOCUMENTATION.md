# TechPros Admin System Documentation

## Overview

TechPros Admin is a financial management system that replaces manual Excel spreadsheet workflows. Users upload documents (invoices, bank statements, contracts), AI extracts data, and the system populates tables to show Forecast vs Actual by month/quarter/year.

---

## 1. Does the System Work as Intended?

### Current Status: **Substantially Complete (~90%)**

The core architecture is in place with most spreadsheet tabs replicated. Chat-first document processing is now working - drop a CSV bank statement in chat and the AI will parse it, match transactions to software items, and record costs after confirmation.

### Spreadsheet Tab → System Mapping

| Spreadsheet Tab | System Status | Notes |
|-----------------|---------------|-------|
| **Monthly P&L** | ✅ Working | `/pl` page shows Forecast vs Actual with variance |
| **TP Invoicing** | ✅ Working | `/invoices` page, revenue recognition spreads monthly |
| **HR Costs** | ✅ Working | `/costs/team-hr` page, monthly costs by team member |
| **Software** | ✅ Working | `/costs/software` page, monthly costs by item |
| **Travel** | ✅ Working | `/costs/travel` page, monthly budget vs actual grid |
| **Central Overhead** | ✅ Working | Configurable via settings in P&L page |
| **Sales Forecast** | ✅ Working | `/forecasts` page, shows in P&L Forecast column |
| **CogniScale Surveys** | ⚠️ Partial | `/activities` page exists, but surveys tracking is basic |
| **Commission criteria** | ❌ Missing | Taryn's commission rules not implemented |
| **CogniScale credits** | ❌ Missing | Credit tracking not implemented |
| **Options** | ❌ Missing | Scenario planning (High/Low/Expected) not implemented |

### Document Processing Flow

```
Upload Document → AI Extracts Data → Human Reviews in Chat → Data Saved to Tables → P&L Updates
```

| Document Type | Status | What Happens |
|---------------|--------|--------------|
| **Client Invoice** | ✅ Working | AI extracts, creates invoice + revenue recognition |
| **Bank Statement** | ✅ Working | AI matches software transactions, records actual costs |
| **Contractor Invoice** | ✅ Working | AI matches to team member, records HR cost |
| **Contract** | ⚠️ Partial | Table exists, but no AI processing |
| **Harvest Export** | ❌ Not implemented | Table exists, no processing |

---

## 2. What Did Removing the Costs Page Do?

### What Was Removed
- **Old `/costs` route** - A placeholder page with no functionality
- **CostsPage.tsx** - Just showed "Operating costs management will be implemented here"

### What Replaced It
The Costs section now has **three working sub-pages**:

1. **`/costs/team-hr`** (Team / HR Page)
   - Monthly cost grid for team members
   - Base costs + bonuses
   - Contractor invoice matching

2. **`/costs/software`** (Software Page)
   - Monthly cost grid for 44 software items
   - Click-to-edit spreadsheet interface
   - Bank statement matching via vendor aliases

3. **`/costs/travel`** (Travel Page)
   - Monthly budget vs actual grid
   - Default £375/month budget
   - Click-to-edit with variance display

### Impact
- **Positive**: Two functional pages instead of one placeholder
- **No functionality lost**: The old page did nothing
- **Route redirect**: `/costs` now redirects to `/costs/team-hr`

### Do We Need the Old Page?
**No.** The expandable Costs menu with sub-pages is better UX.

---

## 3. System Architecture

### Tech Stack
- **Frontend**: React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **AI**: Claude API (Sonnet 4.5) for document processing and chat
- **Hosting**: Netlify (frontend), Supabase (backend)

### Database Tables

| Table | Purpose | Document Source |
|-------|---------|-----------------|
| `clients` | 6sense, Enate, Gilroy, HubbubHR, Amphora | - |
| `invoices` | Client invoices with amounts | Invoice PDFs |
| `revenue_recognition` | Monthly spread of invoice amounts | Calculated |
| `team_members` | Taryn, Vanessa, Aamir, Nikita, Pakistan Team | - |
| `hr_costs` | Monthly HR costs with overrides | Contractor invoices |
| `software_items` | 44 software subscriptions | - |
| `software_costs` | Monthly software costs with overrides | Bank statements |
| `travel_costs` | Monthly travel budget vs actual | Bank statements |
| `central_overhead_config` | Configurable overhead (default £4,200) | - |
| `revenue_forecasts` | Monthly forecast by client | Manual entry |
| `cogniscale_activities` | Interviews, roundtables, meetings | Activity logs |
| `cogniscale_fee_config` | £4,236 fixed + variable fees | - |
| `documents` | Uploaded files with processing status | - |
| `chat_messages` | Persistent chat memory | - |
| `bank_transactions` | Transaction matching (Phase 2) | Bank statements |
| `contracts` | Client contracts | Contract PDFs |

### Pages

| Route | Purpose |
|-------|---------|
| `/` | Dashboard with KPI cards and charts |
| `/invoices` | Invoice list, create/edit invoices |
| `/activities` | CogniScale activity tracking |
| `/costs/team-hr` | Team member cost management |
| `/costs/software` | Software cost management |
| `/costs/travel` | Travel budget vs actual management |
| `/forecasts` | Revenue forecast entry by client/month |
| `/pl` | Monthly P&L with Forecast vs Actual, configurable overhead |
| `/kpis` | KPI tracking and targets |
| `/documents` | Document upload and processing |
| `/settings` | App settings |

### AI Chat Capabilities

The chat panel (bottom of every page) provides a Claude.ai-like experience:

1. **Query data**: "What was January revenue?" "Show me P&L for February"
2. **Process CSV/XLSX files**: Drop bank statements, AI parses and analyzes automatically
3. **Process PDF/Images**: Drop invoices, contracts - AI extracts data
4. **Bank statement workflow**:
   - Drop CSV → AI parses → Matches transactions to software items
   - Shows summary with matches/variances → Asks for confirmation
   - After "yes" → Records all costs in one batch
5. **Record HR costs**: "Record Aamir's cost as £1,800 for January"
6. **Record software costs**: Batch recording from bank statements
7. **Remember context**: Conversation history stored in database

**AI Tools Available:**
- `query_database` - Read any data
- `match_bank_transactions` - Batch match bank entries to software
- `batch_record_software_costs` - Record multiple software costs at once
- `record_hr_cost` - Record contractor invoices
- `record_software_cost` - Record individual software costs
- `get_monthly_pl` - Get P&L breakdown

---

## 4. What Needs Development

### Priority 1: Core Functionality ✅ COMPLETE

| Feature | Status | Description |
|---------|--------|-------------|
| **Travel Costs Page** | ✅ Done | `/costs/travel` with budget vs actual grid |
| **Central Overhead Config** | ✅ Done | Settings icon in P&L, stored in database |
| **Forecast Entry** | ✅ Done | `revenue_forecasts` table, hooks ready |
| **Forecast vs Actual View** | ✅ Done | P&L shows both columns when forecast exists |

### Chat-First Document Processing ✅ COMPLETE

| Feature | Status | Description |
|---------|--------|-------------|
| **CSV/XLSX Parsing** | ✅ Done | AI parses spreadsheets automatically |
| **Document Type Detection** | ✅ Done | Auto-detects bank statements from column headers |
| **Bank Transaction Matching** | ✅ Done | Matches bank entries to software items |
| **Confirmation Workflow** | ✅ Done | AI asks before recording any data |
| **Batch Recording** | ✅ Done | Records multiple software costs at once |

### Priority 2: Enhanced Features (Next Up)

| Feature | Effort | Description |
|---------|--------|-------------|
| **Forecast Entry UI** | ✅ Done | `/forecasts` page with client x month grid |
| **Contractor Invoice → HR** | Small | Complete the contractor invoice matching workflow |
| **Contract Processing** | Medium | AI extracts contract terms, renewal dates |
| **CogniScale Survey Tracking** | Medium | Better UI matching the spreadsheet tab |
| **Commission Calculator** | Medium | Taryn's commission based on criteria |
| **Quarterly/Annual Views** | Small | Aggregate P&L by quarter and year |

### Priority 3: Nice to Have

| Feature | Effort | Description |
|---------|--------|-------------|
| **Bank Reconciliation** | Large | Match bank credits to invoice payments |
| **Alerts System** | Medium | Contract renewals, overdue invoices |
| **Harvest Integration** | Medium | Import time entries |
| **Excel Export** | Small | Download P&L as Excel |
| **Scenario Planning** | Large | High/Low/Expected like Options tab |

### Immediate Next Steps

1. **Add Forecast Entry UI**
   - Page to enter monthly revenue forecasts by client
   - Links to `revenue_forecasts` table (already created)
   - Hooks already implemented (`useForecasts`)

2. **Improve CogniScale tracking**
   - Better survey counting from interviews/roundtables
   - Match spreadsheet "CogniScale Surveys" tab

3. **Add Quarterly views**
   - Aggregate P&L by Q1/Q2/Q3/Q4
   - Year-to-date summaries

---

## 5. How to Use the System

### Daily Workflow

1. **Upload contractor invoices** → Drop in chat → AI matches to team member → Confirm → HR costs updated

2. **Upload bank statement** → Drop in chat → AI matches software transactions → Confirm → Software costs updated

3. **Create client invoices** → Invoices page → Enter details → Revenue recognition auto-calculated

4. **Check P&L** → P&L page → Select month → See revenue vs costs breakdown

### Monthly Workflow

1. Review all costs on Team/HR and Software pages
2. Check P&L matches expected
3. Verify Taryn's profit share calculation

---

## 6. Key Business Rules (From Spreadsheet)

- **Revenue Recognition**: Invoice total ÷ months to spread, starting from recognition month
- **HR Costs**: Base salary + bonus per team member per month
- **Software Costs**: Sum of all active software items (with overrides)
- **Travel Costs**: Default £375/month budget, override with actuals
- **Gross Profit**: Revenue - HR Costs - Software Costs - Travel
- **Central Overhead**: Default £4,200/month (configurable via Settings icon in P&L)
- **Profit Pool**: Gross Profit - Central Overhead
- **Taryn's Share**: 12% of Profit Pool (NOT a cost, comes from profit)
- **Forecast vs Actual**: P&L shows both columns with variance when forecast exists

---

## 7. File Structure

```
techpros-admin/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn components (Dialog, Button, etc.)
│   │   ├── layout/          # AppLayout, Sidebar, PageContainer
│   │   ├── chat/            # ChatPanel
│   │   └── shared/          # Common components
│   ├── pages/
│   │   ├── DashboardPage.tsx
│   │   ├── InvoicesPage.tsx
│   │   ├── ActivitiesPage.tsx
│   │   ├── TeamHRPage.tsx
│   │   ├── SoftwareCostsPage.tsx
│   │   ├── TravelCostsPage.tsx    # NEW: Travel budget vs actual
│   │   ├── PLPage.tsx             # UPDATED: Forecast vs Actual, configurable overhead
│   │   ├── KPIsPage.tsx
│   │   ├── DocumentsPage.tsx
│   │   └── SettingsPage.tsx
│   ├── hooks/
│   │   ├── useTravelCosts.ts      # NEW: Travel costs hook
│   │   ├── useOverheadConfig.ts   # NEW: Central overhead config
│   │   ├── useForecasts.ts        # NEW: Revenue forecasts
│   │   └── ...                    # Other data fetching hooks
│   ├── context/             # AuthContext, ChatContext
│   ├── lib/                 # Supabase client, formatters, calculations
│   └── types/               # TypeScript definitions
├── supabase/
│   ├── migrations/          # Database schema (8 migration files)
│   └── functions/           # Edge Functions (chat, process-document)
├── CLAUDE.md                # Operating framework for Claude Code
├── SYSTEM_DOCUMENTATION.md  # This file
└── tasks/
    ├── todo.md              # Current task tracking
    └── lessons.md           # Patterns learned from corrections
```

---

## 8. Environment & Deployment

### Local Development
```bash
npm run dev          # Start frontend on localhost:5173
```

### Database
- Supabase project: `sgljahzwiknfzizrgpcz`
- Push migrations: `npx supabase db push`
- Deploy functions: `npx supabase functions deploy chat`

### Production
- Frontend: Netlify (auto-deploys from GitHub)
- Backend: Supabase (migrations via CLI)
