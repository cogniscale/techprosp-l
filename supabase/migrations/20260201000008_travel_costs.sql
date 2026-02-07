-- Travel Costs table
-- Monthly travel expense tracking with defaults and overrides

CREATE TABLE public.travel_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_month DATE NOT NULL, -- First of month, e.g., 2026-01-01
  budgeted_amount DECIMAL(10,2) DEFAULT 375.00, -- Default monthly budget
  actual_amount DECIMAL(10,2), -- NULL means use budgeted_amount
  description TEXT, -- What the travel was for
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cost_month)
);

-- Index for quick lookups
CREATE INDEX idx_travel_costs_month ON public.travel_costs(cost_month);

-- RLS Policies
ALTER TABLE public.travel_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view travel costs"
  ON public.travel_costs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage travel costs"
  ON public.travel_costs FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_travel_costs_updated_at
  BEFORE UPDATE ON public.travel_costs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Central Overhead Configuration table
-- Allows changing the central overhead amount
CREATE TABLE public.central_overhead_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  effective_from DATE NOT NULL,
  effective_to DATE,
  monthly_amount DECIMAL(10,2) NOT NULL DEFAULT 4200.00,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for overhead config
ALTER TABLE public.central_overhead_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view overhead config"
  ON public.central_overhead_config FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage overhead config"
  ON public.central_overhead_config FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Seed default overhead
INSERT INTO public.central_overhead_config (effective_from, monthly_amount, notes)
VALUES ('2025-01-01', 4200.00, 'Default central overhead - includes loans, director salaries, professional services, bank fees');

-- Revenue Forecasts table
-- Monthly revenue forecasts by client for comparison with actuals
CREATE TABLE public.revenue_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  forecast_month DATE NOT NULL, -- First of month
  forecast_amount DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, forecast_month)
);

-- Indexes
CREATE INDEX idx_revenue_forecasts_month ON public.revenue_forecasts(forecast_month);
CREATE INDEX idx_revenue_forecasts_client ON public.revenue_forecasts(client_id);

-- RLS for forecasts
ALTER TABLE public.revenue_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view forecasts"
  ON public.revenue_forecasts FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage forecasts"
  ON public.revenue_forecasts FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_revenue_forecasts_updated_at
  BEFORE UPDATE ON public.revenue_forecasts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get monthly travel cost
CREATE OR REPLACE FUNCTION get_travel_cost(target_month DATE)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  cost DECIMAL(10,2);
BEGIN
  SELECT COALESCE(actual_amount, budgeted_amount, 375.00)
  INTO cost
  FROM public.travel_costs
  WHERE cost_month = target_month;

  -- Return default if no entry exists
  RETURN COALESCE(cost, 375.00);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current central overhead
CREATE OR REPLACE FUNCTION get_central_overhead(target_month DATE)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  amount DECIMAL(10,2);
BEGIN
  SELECT monthly_amount
  INTO amount
  FROM public.central_overhead_config
  WHERE effective_from <= target_month
    AND (effective_to IS NULL OR effective_to >= target_month)
  ORDER BY effective_from DESC
  LIMIT 1;

  RETURN COALESCE(amount, 4200.00);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
