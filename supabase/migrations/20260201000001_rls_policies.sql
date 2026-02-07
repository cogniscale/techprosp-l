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
