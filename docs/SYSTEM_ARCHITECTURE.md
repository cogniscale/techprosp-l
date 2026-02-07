# TechPros Admin - System Architecture

Technical documentation covering the system design, components, data flow, and infrastructure.

---

## Purpose & Goals

TechPros Admin is a financial management and reporting system designed to:

1. **Replace Excel** - Move from spreadsheet-based tracking to a proper database-backed application
2. **Automate Calculations** - P&L, profit pool, and profit share calculate automatically
3. **Enable Collaboration** - Multiple users can access and update data simultaneously
4. **Support AI Processing** - Documents can be analysed by Claude to extract and record data
5. **Provide Audit Trail** - All changes are timestamped and traceable
6. **Scale with the Business** - Cloud infrastructure grows as needed

---

## Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | UI component framework |
| **TypeScript** | Type-safe JavaScript |
| **Vite** | Build tool and dev server |
| **Tailwind CSS** | Utility-first styling |
| **shadcn/ui** | Pre-built accessible components |
| **React Router** | Client-side routing |
| **TanStack Query** | Server state management and caching |
| **Lucide Icons** | Icon library |

### Backend
| Technology | Purpose |
|------------|---------|
| **Supabase** | Backend-as-a-Service platform |
| **PostgreSQL** | Relational database (hosted by Supabase) |
| **Supabase Auth** | Authentication and user management |
| **Supabase Edge Functions** | Serverless API endpoints (Deno runtime) |
| **Supabase Storage** | File storage for documents |
| **Row Level Security (RLS)** | Database-level access control |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| **Vercel** | Frontend hosting and deployment (planned) |
| **GitHub** | Source control and collaboration |
| **Google Drive** | Shared document storage (invoices, statements, contracts) |
| **Claude Code** | AI assistant for document processing and development |

### Claude Code Role
Claude Code is central to this system. It:
- Reads documents from the shared Google Drive folder
- Parses and extracts structured data
- Matches transactions to existing records
- Updates the database after user confirmation
- Answers questions about the data
- Builds and improves the application

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           USERS                                      │
│                        Tim & Taryn                                   │
└─────────────────────────────────────────────────────────────────────┘
          │                                        │
          │ Browser                                │ Terminal
          ▼                                        ▼
┌──────────────────────────────┐    ┌──────────────────────────────────┐
│    FRONTEND (React SPA)      │    │         CLAUDE CODE              │
│                              │    │    (AI Development Assistant)    │
│  • View dashboards & reports │    │                                  │
│  • Manual data entry         │    │  • Process documents             │
│  • P&L, KPIs, Scorecard      │    │  • Answer questions              │
│                              │    │  • Update database               │
│  localhost:5173 (dev)        │    │  • Build & improve app           │
│  techpros-admin.vercel.app   │    │                                  │
└──────────────────────────────┘    └──────────────────────────────────┘
          │                                        │
          │ HTTPS                                  │ Direct
          ▼                                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        SUPABASE CLOUD                                │
│                     (Single Source of Truth)                         │
│                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │   PostgreSQL    │  │  Edge Functions │  │    Storage      │     │
│  │   Database      │  │  (Deno)         │  │  (Future)       │     │
│  │                 │  │                 │  │                 │     │
│  │ • invoices      │  │ • /chat (future)│  │ • Attachments   │     │
│  │ • revenue_recog │  │                 │  │ • Exports       │     │
│  │ • clients       │  │                 │  │                 │     │
│  │ • team_members  │  │                 │  │                 │     │
│  │ • hr_costs      │  │                 │  │                 │     │
│  │ • software_items│  │                 │  │                 │     │
│  │ • software_costs│  │                 │  │                 │     │
│  │ • travel_costs  │  │                 │  │                 │     │
│  │ • scenarios     │  │                 │  │                 │     │
│  │ • kpi_*         │  │                 │  │                 │     │
│  │ • activity_*    │  │                 │  │                 │     │
│  │ • scorecard_*   │  │                 │  │                 │     │
│  │ • cogniscale_*  │  │                 │  │                 │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
│                                                                      │
│  Security: Row Level Security (RLS) + JWT Authentication            │
└─────────────────────────────────────────────────────────────────────┘
                                │
          ┌─────────────────────┴─────────────────────┐
          ▼                                           ▼
┌─────────────────────────┐            ┌─────────────────────────────┐
│   SHARED GOOGLE DRIVE   │            │         GITHUB              │
│                         │            │                             │
│  TechPros Shared/       │            │  • Source code repository   │
│  ├── invoices/          │            │  • Version control          │
│  ├── bank-statements/   │            │  • Collaboration            │
│  ├── contracts/         │            │  • CI/CD (future)           │
│  ├── receipts/          │            │                             │
│  └── correspondence/    │            │                             │
│                         │            │                             │
│  Synced to local machines│           │  Both Tim & Taryn clone     │
│  Claude Code reads from  │           │  and contribute             │
│  local sync              │           │                             │
└─────────────────────────┘            └─────────────────────────────┘
```

---

## Database Schema

### Core Business Tables

#### `clients`
Stores client/customer information.
```sql
- id (UUID, PK)
- name (TEXT)
- slug (TEXT, unique)
- is_active (BOOLEAN)
- contract_start_date (DATE)
- contract_end_date (DATE)
- monthly_retainer (DECIMAL)
- created_at, updated_at (TIMESTAMPTZ)
```

#### `invoices`
Tracks all invoices raised.
```sql
- id (UUID, PK)
- invoice_number (TEXT)
- client_id (UUID, FK → clients)
- invoice_date (DATE)
- total_value (DECIMAL)
- months_to_spread (INTEGER)
- currency (TEXT, default 'GBP')
- status (TEXT: pending/sent/paid/overdue)
- payment_received_date (DATE)
- notes (TEXT)
- created_at, updated_at (TIMESTAMPTZ)
```

#### `revenue_recognition`
Monthly revenue allocation from invoices.
```sql
- id (UUID, PK)
- invoice_id (UUID, FK → invoices)
- recognition_month (DATE)
- amount (DECIMAL)
- created_at (TIMESTAMPTZ)
```
*Auto-generated when invoice is created. If invoice = £12,000 over 6 months, creates 6 records of £2,000 each.*

### Cost Tables

#### `team_members`
People who work for TechPros (employees & contractors).
```sql
- id (UUID, PK)
- name (TEXT)
- role (TEXT)
- employment_type (TEXT: fte/contractor)
- default_monthly_cost (DECIMAL)
- currency (TEXT)
- is_active (BOOLEAN)
```

#### `hr_costs`
Monthly actual costs per team member.
```sql
- id (UUID, PK)
- team_member_id (UUID, FK → team_members)
- cost_month (DATE)
- actual_cost (DECIMAL, nullable - uses default if null)
- bonus (DECIMAL)
- notes (TEXT)
```

#### `software_items`
Software/SaaS subscriptions.
```sql
- id (UUID, PK)
- name (TEXT)
- vendor (TEXT)
- vendor_aliases (TEXT[]) -- for bank statement matching
- default_monthly_cost (DECIMAL)
- techpros_allocation_percent (DECIMAL) -- e.g., 0.5 for 50%
- is_active (BOOLEAN)
```

#### `software_costs`
Monthly actual costs per software item.
```sql
- id (UUID, PK)
- software_item_id (UUID, FK → software_items)
- cost_month (DATE)
- actual_cost (DECIMAL, nullable - uses default if null)
- notes (TEXT)
```

#### `travel_costs`
Monthly travel expenses.
```sql
- id (UUID, PK)
- cost_month (DATE)
- budgeted_cost (DECIMAL)
- actual_cost (DECIMAL)
- notes (TEXT)
```

### Planning & KPI Tables

#### `scenarios`
Annual scenario planning (Pessimistic/Realistic/Optimistic).
```sql
- id (UUID, PK)
- year (INTEGER)
- category (TEXT: revenue/cost)
- item_name (TEXT)
- pessimistic (DECIMAL)
- realistic (DECIMAL)
- optimistic (DECIMAL)
- notes (TEXT)
- sort_order (INTEGER)
```

#### `kpi_metrics` / `kpi_values`
KPI definitions and monthly values.
```sql
-- kpi_metrics
- id (UUID, PK)
- category (TEXT)
- name (TEXT)
- target_type (TEXT: number/percentage/currency)

-- kpi_values
- id (UUID, PK)
- metric_id (UUID, FK)
- kpi_month (DATE)
- target_value (DECIMAL)
- actual_value (DECIMAL)
```

#### `activity_metrics` / `activity_values`
CogniScale activity tracking (interviews, roundtables, meetings).
```sql
-- activity_metrics
- id (UUID, PK)
- name (TEXT)
- annual_target (INTEGER)

-- activity_values
- id (UUID, PK)
- metric_id (UUID, FK)
- activity_month (DATE)
- target_value (DECIMAL)
- actual_value (DECIMAL)
```

#### `scorecard_categories` / `scorecard_metrics` / `scorecard_actuals`
Performance review weighted scorecard.
```sql
-- Categories with weights (e.g., Client Performance 30%)
-- Metrics within categories (e.g., Client Retention, target 100%)
-- Actuals per review period (e.g., H1 2026)
```

### CogniScale Tables

#### `cogniscale_services`
Fee structure reference (billable and variable services).
```sql
- id (UUID, PK)
- service_type (TEXT: billable/variable)
- service_name (TEXT)
- harvest_code (TEXT)
- rate (DECIMAL)
- annual_value (DECIMAL)
- fee_trigger (TEXT)
```

#### `cogniscale_fee_config`
Monthly fee configuration.
```sql
- id (UUID, PK)
- effective_from (DATE)
- fixed_monthly_fee (DECIMAL)
- survey_fee (DECIMAL)
- meeting_fee (DECIMAL)
```

---

## Data Flow

### 1. Invoice → Revenue Recognition
```
User creates invoice
        ↓
System calculates: total_value ÷ months_to_spread = monthly_amount
        ↓
System creates N revenue_recognition records
        ↓
P&L page queries revenue_recognition for monthly totals
        ↓
Revenue appears in correct months
```

### 2. Costs → P&L
```
User enters actual costs (HR, Software, Travel)
        ↓
If actual is null, system uses default from parent table
        ↓
P&L page sums costs by month
        ↓
Gross Profit = Revenue - Costs
        ↓
Profit Pool = Gross Profit - Central Overhead (£4,200)
        ↓
Taryn's Share = Profit Pool × 12%
```

### 3. Document Processing (via Claude Code)

Claude Code is the primary interface for processing documents and updating data.

```
User drops documents in shared Google Drive folder
(invoices, bank statements, contracts, SOWs, emails)
                    ↓
Google Drive syncs to local machine
                    ↓
User opens Claude Code: "Process the new documents"
                    ↓
Claude Code reads files from local sync:
  • PDFs → text extraction and analysis
  • CSVs → parse rows and columns
  • Images → OCR and interpretation
  • Emails → extract key information
                    ↓
Claude Code analyses and matches:
  • Invoices → client lookup, revenue recognition calc
  • Bank txns → match to software_items.vendor_aliases
  • Contracts → extract terms, dates, values
                    ↓
Claude Code presents findings:
"Found 3 invoices (£45,000) and 12 software payments (£2,340)"
                    ↓
User reviews and confirms (or corrects)
                    ↓
Claude Code executes Supabase operations:
  • INSERT into invoices, revenue_recognition
  • UPSERT into software_costs, hr_costs
                    ↓
App reflects changes immediately (React Query refetches)
```

**Why Claude Code (not in-app upload)?**
- Full conversational interface for clarification
- Can read any file format (PDF, CSV, images, email)
- Has full context of the codebase and data model
- Both Tim and Taryn have Claude Code access
- No upload size limits or format restrictions

---

## Frontend Architecture

### Folder Structure
```
src/
├── components/
│   ├── ui/              # Base UI components (Button, Input, Card, etc.)
│   ├── layout/          # App layout (Sidebar, PageContainer, etc.)
│   ├── shared/          # Shared components (CSVImportDialog, etc.)
│   └── [feature]/       # Feature-specific components
├── pages/               # Route components (one per page)
├── hooks/               # Custom React hooks for data fetching
├── lib/                 # Utilities (formatters, Supabase client)
├── types/               # TypeScript type definitions
├── constants/           # Routes, config values
└── context/             # React context providers (Auth, etc.)
```

### Key Patterns

**Custom Hooks for Data**
Each data domain has a custom hook:
- `useInvoices()` - CRUD for invoices + revenue recognition
- `useHRCosts()` - CRUD for HR costs
- `useSoftwareCosts()` - CRUD for software costs
- `useScenarios()` - CRUD for scenario planning
- `useScorecard()` - CRUD for performance scorecard

**Page Structure**
Each page follows a consistent pattern:
```tsx
export function SomePage() {
  const { data, loading, create, update, delete } = useSomeData();
  const [uiState, setUiState] = useState();

  return (
    <PageContainer title="Page Title">
      {/* Summary cards */}
      {/* Filters/controls */}
      {/* Data table or grid */}
      {/* Dialogs for create/edit */}
    </PageContainer>
  );
}
```

---

## Authentication & Security

### Authentication Flow
```
User visits app
        ↓
Not logged in → Redirect to /login
        ↓
User enters email/password
        ↓
Supabase Auth validates credentials
        ↓
JWT token issued and stored in browser
        ↓
All API requests include JWT in Authorization header
        ↓
Supabase validates JWT and applies RLS policies
```

### Row Level Security (RLS)
Every table has RLS policies:
```sql
-- Example: All authenticated users can read
CREATE POLICY "Allow authenticated read" ON table_name
  FOR SELECT TO authenticated USING (true);

-- Example: Users can only update their own records
CREATE POLICY "Allow own update" ON table_name
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid());
```

---

## API Layer (Edge Functions)

### Current: Claude Code Direct Access
Claude Code connects directly to Supabase using the service role key stored in `.env`. This allows:
- Full database read/write access
- No Edge Function needed for document processing
- Conversational workflow with user confirmation

### Future Edge Functions (Optional Enhancements)
- `/chat` - In-app AI chat for quick queries
- `/generate-report` - Create PDF reports
- `/webhook` - Receive notifications from external services

---

## Deployment Architecture

### Development
```
localhost:5173 (Vite dev server)
        ↓
Supabase Cloud (dev project)
```

### Production (Planned)
```
Vercel (Frontend hosting)
        ↓
Supabase Cloud (production project)
        ↓
Custom domain: techpros-admin.vercel.app
```

### CI/CD Pipeline (Planned)
```
Push to GitHub main branch
        ↓
Vercel auto-deploys frontend
        ↓
Supabase migrations run automatically
```

---

## Key Business Logic

### Revenue Recognition
```typescript
// When invoice created:
const monthlyAmount = totalValue / monthsToSpread;
for (let i = 0; i < monthsToSpread; i++) {
  const month = addMonths(startMonth, i);
  createRevenueRecognition({ invoiceId, month, amount: monthlyAmount });
}
```

### P&L Calculation
```typescript
// Monthly P&L:
const revenue = sumRevenueRecognition(month);
const hrCosts = sumHRCosts(month);
const softwareCosts = sumSoftwareCosts(month);
const travelCosts = getTravelCost(month);

const grossProfit = revenue - hrCosts - softwareCosts - travelCosts;
const centralOverhead = 4200;
const profitPool = Math.max(0, grossProfit - centralOverhead);
const tarynShare = profitPool * 0.12;
```

### Scorecard Weighted Score
```typescript
// For each category:
const categoryScore = average(metricsAchievementPercent);
const weightedScore = categoryScore * categoryWeight;

// Overall:
const overallScore = sum(weightedScores) / sum(activeWeights);
const ragStatus = overallScore >= 100 ? 'green'
                : overallScore >= 85 ? 'amber'
                : 'red';
```

---

## Claude Code Integration

### How Claude Code Accesses Data

Claude Code uses the Supabase JavaScript client with credentials from `.env`:
```
SUPABASE_URL=https://[project].supabase.co
SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
```

The service role key bypasses RLS, allowing Claude Code to read/write all data. This is safe because:
- Claude Code only acts on user instructions
- User must confirm before any writes
- `.env` file is gitignored (not in repository)

### Document Processing Capabilities

| Document Type | What Claude Extracts | Database Updates |
|---------------|---------------------|------------------|
| **Invoice PDF** | Client, amount, date, terms, line items | `invoices`, `revenue_recognition` |
| **Bank Statement CSV** | Transactions, dates, amounts, descriptions | `software_costs`, `hr_costs` |
| **Contract PDF** | Client, value, dates, deliverables | `clients`, `invoices` (forecast) |
| **Statement of Work** | Scope, timeline, milestones, value | `revenue_recognition` |
| **Receipt/Image** | Vendor, amount, date, category | `software_costs`, `travel_costs` |
| **Email** | Context, agreements, changes | Informs other updates |

### Matching Logic

**Bank Statement → Software Costs:**
```
Transaction: "ZOOM.US 4582901"
        ↓
Match against software_items.vendor_aliases
        ↓
Found: Zoom (aliases: ["ZOOM.US", "ZOOM VIDEO"])
        ↓
Create/update software_costs record
```

**Invoice → Revenue Recognition:**
```
Invoice: £12,000 for 6 months starting Jan 2026
        ↓
Calculate: £12,000 ÷ 6 = £2,000/month
        ↓
Create 6 revenue_recognition records:
  Jan: £2,000, Feb: £2,000, ... Jun: £2,000
```

---

## Future Enhancements

1. **In-App Chat** - Quick queries without opening Claude Code
2. **Email Notifications** - Alert when invoices are overdue
3. **PDF Report Generation** - Export P&L and reports as PDF
4. **Mobile App** - React Native version for on-the-go access
5. **Multi-Currency** - Handle USD, EUR alongside GBP
6. **Budget vs Actual Variance** - Highlight deviations from plan
7. **Bank API Integration** - Direct connection to bank for auto-import
8. **Audit Log** - Track all changes with who/when/what

---

## Glossary

| Term | Definition |
|------|------------|
| **RLS** | Row Level Security - database-level access control |
| **JWT** | JSON Web Token - secure authentication token |
| **Edge Function** | Serverless function running close to users |
| **SPA** | Single Page Application - React app that runs in browser |
| **CRUD** | Create, Read, Update, Delete operations |
| **FK** | Foreign Key - database relationship |
| **PK** | Primary Key - unique identifier |

---

*Document created: February 2026*
*Last updated: February 2026*
