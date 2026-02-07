# Current Tasks

## Priority 1: Core Functionality for Daily Use ✅ COMPLETE

### 1. Travel Costs Page ✅
- [x] Create `travel_costs` database table (like software_costs)
- [x] Create `useTravelCosts` hook
- [x] Create `TravelCostsPage.tsx` with monthly grid
- [x] Add route `/costs/travel`
- [x] Add to Sidebar under Costs menu
- [x] Update P&L to pull from travel_costs table
- [x] Deploy migration
- [x] Verify build passes

### 2. Central Overhead Configuration ✅
- [x] Add overhead config inline on P&L (Settings icon)
- [x] Create `central_overhead_config` database table
- [x] Create `useOverheadConfig` hook
- [x] Update P&L to use configured value instead of hardcoded £4,200
- [x] Verify calculation still works

### 3. Forecast Entry ✅
- [x] Create `revenue_forecasts` table (separate from invoices)
- [x] Create `useForecasts` hook
- [ ] **TODO**: Create UI for entering monthly revenue forecasts by client

### 4. Forecast vs Actual P&L View ✅
- [x] Update PLPage to show two columns per metric: Forecast | Actual
- [x] Calculate variance (Actual - Forecast)
- [x] Color code: green if actual >= forecast, red if under

## Chat-First Document Processing ✅ COMPLETE

### 5. CSV/XLSX Parsing ✅
- [x] Add xlsx library to chat Edge Function
- [x] Create parseSpreadsheet helper function
- [x] Add CSV/XLSX handling in attachment loop
- [x] Detect document type from column headers

### 6. Bank Statement Workflow ✅
- [x] Create match_bank_transactions tool
- [x] Create batch_record_software_costs tool
- [x] Update system prompt with confirmation workflow
- [x] Deploy chat function

---

## Priority 2: Next Up

### 7. Forecast Entry UI (Remaining)
- [ ] Create page or dialog to enter forecasts by client/month
- [ ] Link to existing `revenue_forecasts` table and `useForecasts` hook
- [ ] Show in P&L Forecast column

### 8. Contractor Invoice → HR Matching
- [ ] Complete the workflow from contractor invoice to HR cost recording
- [ ] Match supplier names to team members
- [ ] Show confirmation before recording

### 9. CogniScale Survey Tracking
- [ ] Improve survey counting logic
- [ ] Better UI matching spreadsheet tab

### 10. Quarterly/Annual Views
- [ ] Aggregate P&L by quarter
- [ ] Year-to-date summaries

---

## Review Section

### Completed 2026-02-02:
- Travel Costs page with monthly budget vs actual grid
- Central overhead now configurable (Settings icon in P&L)
- P&L shows Forecast vs Actual columns with variance
- Database tables: `travel_costs`, `central_overhead_config`, `revenue_forecasts`
- Hooks: `useTravelCosts`, `useOverheadConfig`, `useForecasts`
- **Chat-first document processing**:
  - CSV/XLSX parsing in chat Edge Function
  - Auto-detection of bank statements
  - `match_bank_transactions` tool for batch matching
  - `batch_record_software_costs` tool for batch recording
  - Confirmation workflow before recording

---

## Notes
- Travel default: £375/month (from spreadsheet)
- Central Overhead: Default £4,200/month (now configurable)
- Forecast entry UI still needed - hooks and table ready
- Chat now works like Claude.ai - drop CSV, AI parses and asks for confirmation
