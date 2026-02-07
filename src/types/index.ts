// User types
export type UserRole = "owner" | "director";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

// Client types
export interface Client {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  contract_start_date: string | null;
  contract_end_date: string | null;
  monthly_retainer: number | null;
  created_at: string;
  updated_at: string;
}

// Invoice types
export type InvoiceStatus = "pending" | "sent" | "paid" | "overdue";

export interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  client?: Client;
  invoice_date: string;
  total_value: number;
  months_to_spread: number;
  currency: string;
  status: InvoiceStatus;
  payment_received_date: string | null;
  notes: string | null;
  source_document_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface RevenueRecognition {
  id: string;
  invoice_id: string;
  recognition_month: string;
  amount: number;
  created_at: string;
}

// CogniScale Activity types
export interface CogniScaleActivity {
  id: string;
  activity_date: string;
  activity_month: string;
  interviews_conducted: number;
  roundtables_held: number;
  event_participants: number;
  mql3s_generated: number;
  clevel_meetings_completed: number;
  surveys_from_interviews: number;
  surveys_from_roundtables: number;
  surveys_from_clevel: number;
  notes: string | null;
  source_document_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CogniScaleFeeConfig {
  id: string;
  effective_from: string;
  effective_to: string | null;
  fixed_monthly_fee: number;
  survey_fee: number;
  meeting_fee: number;
  created_at: string;
}

// Operating costs
export interface OperatingCosts {
  id: string;
  cost_month: string;
  hr_base_costs: number;
  hr_bonus_percentage: number;
  software_technology: number;
  travel_expenses: number;
  central_overhead: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// Document types
export type DocumentType =
  | "invoice"
  | "bank_statement"
  | "contract"
  | "harvest_export"
  | "cogniscale_log"
  | "contractor_invoice";

export type ProcessingStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "manual_review";

export interface Document {
  id: string;
  file_name: string;
  file_path: string;
  file_type: DocumentType;
  file_size: number | null;
  mime_type: string | null;
  processing_status: ProcessingStatus;
  processing_error: string | null;
  extracted_data: Record<string, unknown> | null;
  extraction_confidence: number | null;
  uploaded_by: string | null;
  processed_at: string | null;
  created_at: string;
}

// Contracts
export interface Contract {
  id: string;
  client_id: string;
  client?: Client;
  contract_number: string | null;
  start_date: string;
  end_date: string | null;
  total_value: number | null;
  monthly_value: number | null;
  renewal_date: string | null;
  auto_renews: boolean;
  notes: string | null;
  source_document_id: string | null;
  created_at: string;
  updated_at: string;
}

// KPI types
export interface KPITarget {
  id: string;
  target_month: string;
  metric_name: string;
  target_value: number;
  created_at: string;
}

// P&L types
export interface MonthlyPL {
  month: string;
  revenue: {
    byClient: Record<string, number>;
    cogniscaleFixed: number;
    cogniscaleSurveys: number;
    cogniscaleMeetings: number;
    total: number;
  };
  costs: {
    hrCosts: number;
    softwareTechnology: number;
    travelExpenses: number;
    total: number;
  };
  grossProfit: number;
  centralOverhead: number;
  profitPool: number;
  tarynProfitShare: number;
}

// Form types
export interface InvoiceFormData {
  invoice_number: string;
  client_id: string;
  invoice_date: string;
  total_value: number;
  months_to_spread: number;
  notes?: string;
}

export interface ActivityFormData {
  activity_date: string;
  interviews_conducted: number;
  roundtables_held: number;
  event_participants: number;
  mql3s_generated: number;
  clevel_meetings_completed: number;
  surveys_from_interviews: number;
  surveys_from_roundtables: number;
  surveys_from_clevel: number;
  notes?: string;
}

export interface CostFormData {
  cost_month: string;
  hr_base_costs: number;
  software_technology: number;
  travel_expenses: number;
  notes?: string;
}

// Team Members / HR Costs
export type EmploymentType = "fte" | "contractor";

export interface TeamMember {
  id: string;
  name: string;
  role: string | null;
  employment_type: EmploymentType;
  default_monthly_cost: number;
  currency: string;
  supplier_names: string[] | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface HRCost {
  id: string;
  team_member_id: string;
  team_member?: TeamMember;
  cost_month: string;
  actual_cost: number | null; // If null, use team_member.default_monthly_cost
  bonus: number;
  source_document_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface MonthlyHRSummary {
  month: string;
  entries: (HRCost & { team_member: TeamMember })[];
  totalBaseCost: number;
  totalBonus: number;
  totalCost: number;
}

// Software Costs
export interface SoftwareItem {
  id: string;
  name: string;
  vendor: string | null;
  vendor_aliases: string[] | null;
  default_monthly_cost: number;
  techpros_allocation_percent: number;
  category: string; // P&L grouping: "Software etc", "6sense Foleon", etc.
  currency: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SoftwareCost {
  id: string;
  software_item_id: string;
  software_item?: SoftwareItem;
  cost_month: string;
  actual_cost: number | null; // If null, use software_item.default_monthly_cost
  techpros_allocation_percent: number | null; // If null, use software_item.techpros_allocation_percent
  notes: string | null;
  created_at: string;
}

// Scenarios for revenue/cost planning
export type ScenarioCategory = "revenue" | "cost";

export interface Scenario {
  id: string;
  year: number;
  category: ScenarioCategory;
  item_name: string;
  pessimistic: number;
  realistic: number;
  optimistic: number;
  notes: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// CogniScale Services
export type CogniScaleServiceType = "billable" | "variable";

export interface CogniScaleService {
  id: string;
  service_type: CogniScaleServiceType;
  service_name: string;
  harvest_code: string | null;
  time_allocation: string | null;
  rate: number | null;
  annual_value: number | null;
  fee_trigger: string | null;
  notes: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

// Scorecard types
export interface ScorecardCategory {
  id: string;
  name: string;
  weight: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface ScorecardMetric {
  id: string;
  category_id: string;
  category?: ScorecardCategory;
  name: string;
  description: string | null;
  target_type: "number" | "percentage" | "currency" | "boolean";
  target_value: number | null;
  measurement_period: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface ScorecardActual {
  id: string;
  metric_id: string;
  period_start: string;
  period_end: string;
  actual_value: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
