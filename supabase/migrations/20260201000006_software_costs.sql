-- Software Items and Monthly Costs tables
-- Tracks software subscriptions with monthly overrideable costs

-- Software items master table
CREATE TABLE public.software_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  vendor TEXT, -- Optional vendor/provider name
  default_monthly_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  techpros_allocation_percent INTEGER DEFAULT 100, -- % allocated to TechPros (vs personal)
  currency TEXT DEFAULT 'GBP',
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Monthly software costs (allows overriding default costs per month)
CREATE TABLE public.software_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  software_item_id UUID NOT NULL REFERENCES public.software_items(id) ON DELETE CASCADE,
  cost_month DATE NOT NULL, -- First of month, e.g., 2026-01-01
  actual_cost DECIMAL(10,2), -- NULL means use default_monthly_cost
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(software_item_id, cost_month)
);

-- Indexes
CREATE INDEX idx_software_items_active ON public.software_items(is_active);
CREATE INDEX idx_software_costs_month ON public.software_costs(cost_month);
CREATE INDEX idx_software_costs_item ON public.software_costs(software_item_id);

-- RLS Policies
ALTER TABLE public.software_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.software_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view software items"
  ON public.software_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage software items"
  ON public.software_items FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view software costs"
  ON public.software_costs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage software costs"
  ON public.software_costs FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Seed data from TechPros Commercial Model
INSERT INTO public.software_items (name, vendor, default_monthly_cost, techpros_allocation_percent, notes) VALUES
  ('Acrobat Pro', 'Adobe', 17.00, 100, NULL),
  ('Allday PA', 'Allday PA', 8.00, 100, NULL),
  ('Apple Subscriptions – NSL', 'Apple', 10.00, 100, 'Network Sunday Ltd'),
  ('Apple Subscriptions – NSG', 'Apple', 9.00, 100, 'Network Sunday Group'),
  ('Asana', 'Asana', 46.00, 100, NULL),
  ('Axa Insurance', 'Axa', 30.00, 100, 'Business insurance'),
  ('Bolt.new', 'StackBlitz', 231.00, 100, 'AI development'),
  ('Calendly (1)', 'Calendly', 77.00, 100, 'Main account'),
  ('Calendly (2)', 'Calendly', 9.00, 100, 'Secondary account'),
  ('ChatGPT', 'OpenAI', 151.00, 100, NULL),
  ('Claude (CogniScale / SimCorp)', 'Anthropic', 583.00, 100, 'AI for client work'),
  ('Claude NS', 'Anthropic', 30.00, 100, 'Network Sunday'),
  ('Clay.com', 'Clay', 268.00, 100, 'Lead enrichment'),
  ('Descript NS', 'Descript', 69.00, 100, 'Video editing'),
  ('Descript SimCorp', 'Descript', 53.00, 100, 'SimCorp project'),
  ('Flock (NS)', 'Flock', 85.00, 100, 'Network Sunday'),
  ('Flock (SimCorp)', 'Flock', 5.00, 100, 'SimCorp'),
  ('Foleon', 'Foleon', 1208.00, 100, 'Content creation'),
  ('Freshworks', 'Freshworks', 70.00, 100, 'CRM'),
  ('Google YouTube Premium', 'Google', 13.00, 100, NULL),
  ('GSuite – cogniscale.info', 'Google', 21.00, 100, NULL),
  ('GSuite – cogniscale.pro', 'Google', 28.00, 100, NULL),
  ('GSuite – Standard Gas', 'Google', 35.00, 100, NULL),
  ('GSuite – networksunday.info', 'Google', 21.00, 100, NULL),
  ('GSuite – tech-pros.io', 'Google', 28.00, 100, NULL),
  ('Harvest', 'Harvest', 74.00, 100, 'Time tracking'),
  ('LinkedIn (2)', 'LinkedIn', 58.00, 100, 'Premium/Sales Navigator'),
  ('Mobile', 'Various', 79.00, 100, 'Mobile phone costs'),
  ('Multilogin', 'Multilogin', 85.00, 100, 'Browser management'),
  ('Netlify', 'Netlify', 15.00, 100, 'Hosting'),
  ('Ninja Proxys', 'Ninja Proxys', 82.00, 100, NULL),
  ('Pandadoc', 'Pandadoc', 50.00, 100, 'Document signing'),
  ('Phantom Buster', 'Phantom Buster', 52.00, 100, 'Automation'),
  ('Premium Inboxes – 1', 'Premium Inboxes', 8.06, 100, NULL),
  ('Premium Inboxes – 2', 'Premium Inboxes', 24.13, 100, NULL),
  ('Proxycurl', 'Proxycurl', 227.22, 100, 'LinkedIn API'),
  ('Slack – CogniScale', 'Slack', 26.00, 100, NULL),
  ('Slack – TechPros.io', 'Slack', 29.00, 100, NULL),
  ('SmartLead', 'SmartLead', 71.00, 100, 'Email outreach'),
  ('Soho House', 'Soho House', 125.00, 100, 'Membership'),
  ('SoundCloud', 'SoundCloud', 10.00, 100, NULL),
  ('Supabase', 'Supabase', 35.00, 100, 'Database hosting'),
  ('Wistia', 'Wistia', 19.00, 100, 'Video hosting'),
  ('Zoom', 'Zoom', 159.00, 100, 'Video conferencing');

-- Function to get monthly software costs (for P&L)
CREATE OR REPLACE FUNCTION get_monthly_software_costs(target_month DATE)
RETURNS TABLE (
  item_name TEXT,
  effective_cost DECIMAL(10,2),
  is_override BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    si.name as item_name,
    COALESCE(sc.actual_cost, si.default_monthly_cost) as effective_cost,
    sc.actual_cost IS NOT NULL as is_override
  FROM public.software_items si
  LEFT JOIN public.software_costs sc ON si.id = sc.software_item_id
    AND sc.cost_month = target_month
  WHERE si.is_active = true
  ORDER BY si.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get total software cost for a month
CREATE OR REPLACE FUNCTION get_software_total(target_month DATE)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  total DECIMAL(10,2);
BEGIN
  SELECT COALESCE(SUM(
    COALESCE(sc.actual_cost, si.default_monthly_cost) * (si.techpros_allocation_percent::DECIMAL / 100)
  ), 0)
  INTO total
  FROM public.software_items si
  LEFT JOIN public.software_costs sc ON si.id = sc.software_item_id
    AND sc.cost_month = target_month
  WHERE si.is_active = true;

  RETURN total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
