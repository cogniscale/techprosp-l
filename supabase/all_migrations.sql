-- TechPros Admin Database Schema
-- Initial migration

-- User profiles (extends Supabase auth.users)
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'director')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  contract_start_date DATE,
  contract_end_date DATE,
  monthly_retainer DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents (for AI processing)
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('invoice', 'bank_statement', 'contract', 'harvest_export', 'cogniscale_log')),
  file_size INTEGER,
  mime_type TEXT,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'manual_review')),
  processing_error TEXT,
  extracted_data JSONB,
  extraction_confidence DECIMAL(3,2),
  uploaded_by UUID REFERENCES public.user_profiles(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  invoice_date DATE NOT NULL,
  total_value DECIMAL(10,2) NOT NULL,
  months_to_spread INTEGER NOT NULL DEFAULT 1,
  currency TEXT DEFAULT 'GBP',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'paid', 'overdue')),
  payment_received_date DATE,
  notes TEXT,
  source_document_id UUID REFERENCES public.documents(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.user_profiles(id)
);

-- Revenue Recognition (monthly spread)
CREATE TABLE public.revenue_recognition (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  recognition_month DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(invoice_id, recognition_month)
);

-- CogniScale Fee Configuration
CREATE TABLE public.cogniscale_fee_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  effective_from DATE NOT NULL,
  effective_to DATE,
  fixed_monthly_fee DECIMAL(10,2) NOT NULL DEFAULT 4236.00,
  survey_fee DECIMAL(10,2) NOT NULL DEFAULT 1000.00,
  meeting_fee DECIMAL(10,2) NOT NULL DEFAULT 700.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CogniScale Activities
CREATE TABLE public.cogniscale_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_date DATE NOT NULL,
  activity_month DATE NOT NULL,
  interviews_conducted INTEGER DEFAULT 0,
  roundtables_held INTEGER DEFAULT 0,
  event_participants INTEGER DEFAULT 0,
  mql3s_generated INTEGER DEFAULT 0,
  clevel_meetings_completed INTEGER DEFAULT 0,
  surveys_from_interviews INTEGER DEFAULT 0,
  surveys_from_roundtables INTEGER DEFAULT 0,
  surveys_from_clevel INTEGER DEFAULT 0,
  notes TEXT,
  source_document_id UUID REFERENCES public.documents(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.user_profiles(id)
);

-- Profit Share Configuration
CREATE TABLE public.profit_share_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  effective_from DATE NOT NULL,
  effective_to DATE,
  taryn_share_percentage DECIMAL(5,2) NOT NULL DEFAULT 12.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Operating Costs
CREATE TABLE public.operating_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_month DATE NOT NULL,
  hr_base_costs DECIMAL(10,2) DEFAULT 0,
  hr_bonus_percentage DECIMAL(5,2) DEFAULT 10.00,
  software_technology DECIMAL(10,2) DEFAULT 0,
  travel_expenses DECIMAL(10,2) DEFAULT 0,
  central_overhead DECIMAL(10,2) DEFAULT 4200.00,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.user_profiles(id),
  UNIQUE(cost_month)
);

-- Contracts
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  contract_number TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  total_value DECIMAL(12,2),
  monthly_value DECIMAL(10,2),
  renewal_date DATE,
  auto_renews BOOLEAN DEFAULT false,
  notes TEXT,
  source_document_id UUID REFERENCES public.documents(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- KPI Targets
CREATE TABLE public.kpi_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_month DATE NOT NULL,
  metric_name TEXT NOT NULL,
  target_value DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(target_month, metric_name)
);

-- Bank Transactions (Phase 2)
CREATE TABLE public.bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_date DATE NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  transaction_type TEXT CHECK (transaction_type IN ('credit', 'debit')),
  matched_invoice_id UUID REFERENCES public.invoices(id),
  match_confidence DECIMAL(3,2),
  is_manually_matched BOOLEAN DEFAULT false,
  source_document_id UUID REFERENCES public.documents(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts (Phase 2)
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  related_entity_type TEXT,
  related_entity_id UUID,
  is_acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES public.user_profiles(id),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Harvest Time Entries (for reference)
CREATE TABLE public.harvest_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id UUID,
  entry_date DATE NOT NULL,
  person_name TEXT NOT NULL,
  client_name TEXT,
  client_id UUID REFERENCES public.clients(id),
  project_name TEXT,
  task_name TEXT,
  hours DECIMAL(6,2) NOT NULL,
  billable BOOLEAN DEFAULT true,
  notes TEXT,
  source_document_id UUID REFERENCES public.documents(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX idx_invoices_invoice_date ON public.invoices(invoice_date);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_revenue_recognition_month ON public.revenue_recognition(recognition_month);
CREATE INDEX idx_cogniscale_activities_month ON public.cogniscale_activities(activity_month);
CREATE INDEX idx_operating_costs_month ON public.operating_costs(cost_month);
CREATE INDEX idx_documents_processing_status ON public.documents(processing_status);
CREATE INDEX idx_documents_file_type ON public.documents(file_type);
CREATE INDEX idx_bank_transactions_date ON public.bank_transactions(transaction_date);
CREATE INDEX idx_alerts_type_acknowledged ON public.alerts(alert_type, is_acknowledged);
CREATE INDEX idx_contracts_client_id ON public.contracts(client_id);
CREATE INDEX idx_contracts_renewal_date ON public.contracts(renewal_date);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cogniscale_activities_updated_at
  BEFORE UPDATE ON public.cogniscale_activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_operating_costs_updated_at
  BEFORE UPDATE ON public.operating_costs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_transactions_updated_at
  BEFORE UPDATE ON public.bank_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_recognition ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cogniscale_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cogniscale_fee_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profit_share_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operating_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.harvest_time_entries ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- User Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Clients policies
CREATE POLICY "Authenticated users can view clients"
  ON public.clients FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Owner can insert clients"
  ON public.clients FOR INSERT
  WITH CHECK (public.get_user_role() = 'owner');

CREATE POLICY "Owner can update clients"
  ON public.clients FOR UPDATE
  USING (public.get_user_role() = 'owner');

CREATE POLICY "Owner can delete clients"
  ON public.clients FOR DELETE
  USING (public.get_user_role() = 'owner');

-- Invoices policies
CREATE POLICY "Authenticated users can view invoices"
  ON public.invoices FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update invoices"
  ON public.invoices FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Owner can delete invoices"
  ON public.invoices FOR DELETE
  USING (public.get_user_role() = 'owner');

-- Revenue Recognition policies
CREATE POLICY "Authenticated users can view revenue recognition"
  ON public.revenue_recognition FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage revenue recognition"
  ON public.revenue_recognition FOR ALL
  USING (auth.uid() IS NOT NULL);

-- CogniScale Activities policies
CREATE POLICY "Authenticated users can view activities"
  ON public.cogniscale_activities FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage activities"
  ON public.cogniscale_activities FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Fee Config policies
CREATE POLICY "Authenticated users can view fee config"
  ON public.cogniscale_fee_config FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Owner can manage fee config"
  ON public.cogniscale_fee_config FOR ALL
  USING (public.get_user_role() = 'owner');

-- Profit Share Config policies
CREATE POLICY "Authenticated users can view profit share config"
  ON public.profit_share_config FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Owner can manage profit share config"
  ON public.profit_share_config FOR ALL
  USING (public.get_user_role() = 'owner');

-- Operating Costs policies
CREATE POLICY "Authenticated users can view costs"
  ON public.operating_costs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert costs"
  ON public.operating_costs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update costs"
  ON public.operating_costs FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Owner can delete costs"
  ON public.operating_costs FOR DELETE
  USING (public.get_user_role() = 'owner');

-- Documents policies
CREATE POLICY "Authenticated users can view documents"
  ON public.documents FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload documents"
  ON public.documents FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update documents"
  ON public.documents FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Owner can delete documents"
  ON public.documents FOR DELETE
  USING (public.get_user_role() = 'owner');

-- Bank Transactions policies
CREATE POLICY "Authenticated users can view bank transactions"
  ON public.bank_transactions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage bank transactions"
  ON public.bank_transactions FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Contracts policies
CREATE POLICY "Authenticated users can view contracts"
  ON public.contracts FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage contracts"
  ON public.contracts FOR ALL
  USING (auth.uid() IS NOT NULL);

-- KPI Targets policies
CREATE POLICY "Authenticated users can view KPI targets"
  ON public.kpi_targets FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Owner can manage KPI targets"
  ON public.kpi_targets FOR ALL
  USING (public.get_user_role() = 'owner');

-- Alerts policies
CREATE POLICY "Authenticated users can view alerts"
  ON public.alerts FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can acknowledge alerts"
  ON public.alerts FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can create alerts"
  ON public.alerts FOR INSERT
  WITH CHECK (true);

-- Harvest Time Entries policies
CREATE POLICY "Authenticated users can view time entries"
  ON public.harvest_time_entries FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage time entries"
  ON public.harvest_time_entries FOR ALL
  USING (auth.uid() IS NOT NULL);
-- Seed data for TechPros Admin

-- Insert known clients
INSERT INTO public.clients (name, slug, is_active) VALUES
  ('6sense', '6sense', true),
  ('Enate', 'enate', true),
  ('Gilroy', 'gilroy', true),
  ('HubbubHR', 'hubbubhr', true),
  ('Amphora', 'amphora', true);

-- Insert CogniScale as a client (for tracking purposes)
INSERT INTO public.clients (name, slug, is_active) VALUES
  ('CogniScale', 'cogniscale', true);

-- Insert default fee configuration
INSERT INTO public.cogniscale_fee_config (effective_from, fixed_monthly_fee, survey_fee, meeting_fee) VALUES
  ('2026-01-01', 4236.00, 1000.00, 700.00);

-- Insert default profit share configuration
INSERT INTO public.profit_share_config (effective_from, taryn_share_percentage) VALUES
  ('2026-01-01', 12.00);

-- Insert default KPI targets for 2026
INSERT INTO public.kpi_targets (target_month, metric_name, target_value) VALUES
  -- January
  ('2026-01-01', 'client_retention', 100),
  ('2026-01-01', 'client_escalations', 0),
  ('2026-01-01', 'interviews_conducted', 10),
  ('2026-01-01', 'roundtables_held', 2),
  ('2026-01-01', 'surveys_completed', 8),
  -- February
  ('2026-02-01', 'client_retention', 100),
  ('2026-02-01', 'client_escalations', 0),
  ('2026-02-01', 'interviews_conducted', 10),
  ('2026-02-01', 'roundtables_held', 2),
  ('2026-02-01', 'surveys_completed', 8),
  -- March
  ('2026-03-01', 'client_retention', 100),
  ('2026-03-01', 'client_escalations', 0),
  ('2026-03-01', 'interviews_conducted', 10),
  ('2026-03-01', 'roundtables_held', 2),
  ('2026-03-01', 'surveys_completed', 8);

-- Note: User profiles will be created when users sign up through Supabase Auth
-- You'll need to manually create user_profiles entries after creating auth users
-- Example (run after creating auth users):
-- INSERT INTO public.user_profiles (id, email, full_name, role) VALUES
--   ('auth-user-uuid-tim', 'tim@techpros.io', 'Tim', 'owner'),
--   ('auth-user-uuid-taryn', 'taryn@techpros.io', 'Taryn', 'director');
