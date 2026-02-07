-- Team Members table
-- Tracks team members/contractors with their default costs

CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT,
  employment_type TEXT NOT NULL CHECK (employment_type IN ('fte', 'contractor')),
  default_monthly_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'GBP',
  supplier_names TEXT[], -- Array of supplier names for invoice matching (e.g. ["Aamir Khan", "A Khan Ltd"])
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- HR Costs table
-- Monthly cost entries per team member

CREATE TABLE public.hr_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  cost_month DATE NOT NULL,
  actual_cost DECIMAL(10,2), -- If null, use team_member.default_monthly_cost
  bonus DECIMAL(10,2) DEFAULT 0,
  source_document_id UUID REFERENCES public.documents(id), -- Link to contractor invoice if applicable
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.user_profiles(id),
  UNIQUE(team_member_id, cost_month)
);

-- Indexes
CREATE INDEX idx_team_members_active ON public.team_members(is_active);
CREATE INDEX idx_hr_costs_month ON public.hr_costs(cost_month);
CREATE INDEX idx_hr_costs_team_member ON public.hr_costs(team_member_id);

-- Update document file_type to include contractor_invoice
ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_file_type_check;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_file_type_check
  CHECK (file_type IN ('invoice', 'bank_statement', 'contract', 'harvest_export', 'cogniscale_log', 'contractor_invoice'));

-- RLS Policies
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_costs ENABLE ROW LEVEL SECURITY;

-- Team Members policies
CREATE POLICY "Authenticated users can view team members"
  ON public.team_members FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Owner can manage team members"
  ON public.team_members FOR INSERT
  WITH CHECK (public.get_user_role() = 'owner');

CREATE POLICY "Owner can update team members"
  ON public.team_members FOR UPDATE
  USING (public.get_user_role() = 'owner');

CREATE POLICY "Owner can delete team members"
  ON public.team_members FOR DELETE
  USING (public.get_user_role() = 'owner');

-- HR Costs policies
CREATE POLICY "Authenticated users can view hr costs"
  ON public.hr_costs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage hr costs"
  ON public.hr_costs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update hr costs"
  ON public.hr_costs FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Owner can delete hr costs"
  ON public.hr_costs FOR DELETE
  USING (public.get_user_role() = 'owner');

-- Updated_at trigger for team_members
CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Updated_at trigger for hr_costs
CREATE TRIGGER update_hr_costs_updated_at
  BEFORE UPDATE ON public.hr_costs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed initial team members
INSERT INTO public.team_members (name, role, employment_type, default_monthly_cost, currency, supplier_names, notes) VALUES
  ('Taryn', 'Sales Director', 'fte', 4560.00, 'GBP', ARRAY['Taryn Breetzke'], 'Base: R85,000/month (approx £4,560 at current rate). Fixed salary - does NOT include profit share.'),
  ('Vanessa', 'Operations', 'contractor', 1650.00, 'GBP', ARRAY['Vanessa', 'V Consulting'], 'Contractor - paid via invoice'),
  ('Aamir', 'Technology', 'contractor', 1800.00, 'GBP', ARRAY['Aamir Khan', 'Aamir', 'A Khan'], 'Contractor - paid via invoice. May have bonuses.'),
  ('Nikita', 'Support', 'contractor', 500.00, 'GBP', ARRAY['Nikita', 'N Consulting'], 'Contractor - paid via invoice'),
  ('Pakistan Team', 'Development Team', 'contractor', 0.00, 'GBP', ARRAY['Pakistan', 'PK Team', 'Offshore'], 'Monthly overhead - varies by project. Contractor - paid via invoice.');
