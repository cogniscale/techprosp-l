-- Scenarios table for revenue/cost planning
-- Stores Pessimistic, Realistic, Optimistic projections

CREATE TABLE IF NOT EXISTS scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL DEFAULT 2026,
  category TEXT NOT NULL CHECK (category IN ('revenue', 'cost')),
  item_name TEXT NOT NULL,
  pessimistic DECIMAL(12,2) NOT NULL DEFAULT 0,
  realistic DECIMAL(12,2) NOT NULL DEFAULT 0,
  optimistic DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(year, category, item_name)
);

-- Enable RLS
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow authenticated read" ON scenarios
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert" ON scenarios
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update" ON scenarios
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated delete" ON scenarios
  FOR DELETE TO authenticated USING (true);

-- Seed with data from spreadsheet (2026)
INSERT INTO scenarios (year, category, item_name, pessimistic, realistic, optimistic, notes, sort_order) VALUES
-- Revenue items
(2026, 'revenue', '6sense', 40000, 55000, 65000, 'Pessimistic assumes reduced scope', 1),
(2026, 'revenue', 'Enate', 65000, 65000, 65000, 'Solid - should continue', 2),
(2026, 'revenue', 'Gilroy', 25000, 50000, 60000, 'New - promising but unproven', 3),
(2026, 'revenue', 'HubbubHR', 20000, 36000, 40000, 'Relationship variable', 4),
(2026, 'revenue', 'Amphora', 13000, 13000, 13000, 'Solid - long-term', 5),
(2026, 'revenue', 'CogniScale (Fixed)', 50830, 50830, 50830, '£5,000/month guaranteed', 6),
(2026, 'revenue', 'CogniScale (Surveys)', 35000, 52000, 65000, '£1,000 × surveys completed', 7),
(2026, 'revenue', 'CogniScale (Meetings)', 14000, 19600, 25000, '£700 × meetings completed', 8),
-- Cost items
(2026, 'cost', 'HR Costs (incl. 10% bonus)', 125400, 125400, 125400, 'Fixed', 1),
(2026, 'cost', 'Software & Technology', 42240, 42240, 42240, 'Fixed', 2),
(2026, 'cost', 'Travel & Expenses', 4500, 4500, 4500, 'Fixed', 3);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_scenarios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scenarios_updated_at
  BEFORE UPDATE ON scenarios
  FOR EACH ROW
  EXECUTE FUNCTION update_scenarios_updated_at();
