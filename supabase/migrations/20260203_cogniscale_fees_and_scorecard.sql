-- CogniScale Fee Structure table
-- Reference table for billable and non-billable services

CREATE TABLE IF NOT EXISTS cogniscale_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type TEXT NOT NULL CHECK (service_type IN ('billable', 'variable')),
  service_name TEXT NOT NULL,
  harvest_code TEXT,
  time_allocation TEXT,
  rate DECIMAL(10,2),
  annual_value DECIMAL(10,2),
  fee_trigger TEXT,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE cogniscale_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read" ON cogniscale_services FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON cogniscale_services FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON cogniscale_services FOR UPDATE TO authenticated USING (true);

-- Seed billable services data from spreadsheet
INSERT INTO cogniscale_services (service_type, service_name, harvest_code, time_allocation, rate, annual_value, notes, sort_order) VALUES
('billable', 'Vanessa coordination (surveys, interviews, reports)', 'CB1', '12 hrs/week × 49 weeks', 20, 13720, 'Survey coordination and interview scheduling', 1),
('billable', 'Social LinkedIn posts + analytics', 'CB2', '4 hrs/month', 45, 2160, 'Monthly social media management', 2),
('billable', 'PM of Podcast, social, reports', 'CB3', '5 hrs/month', 125, 7500, 'Project management oversight', 3),
('billable', 'Podcast production (30 episodes)', 'CB4', '4 hrs/episode', 45, 5400, '30 episodes per year', 4),
('billable', 'Aamir CogniScale support (Pune)', 'CB6', '10 hrs/week', 45, 22050, 'Technical and operational support', 5);

-- Seed variable fee services
INSERT INTO cogniscale_services (service_type, service_name, harvest_code, rate, fee_trigger, notes, sort_order) VALUES
('variable', 'Survey completed', 'CNB', 1000, 'All surveys received, report completed', 'Includes interview surveys, roundtable surveys, C-level surveys', 1),
('variable', 'C-level meeting', 'CNB', 700, 'Meeting approved by sales and completed', 'Paid on completion of qualified meeting', 2);


-- Success Criteria / Weighted Scorecard tables

CREATE TABLE IF NOT EXISTS scorecard_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  weight DECIMAL(5,2) NOT NULL, -- e.g., 0.30 for 30%
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scorecard_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES scorecard_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  target_type TEXT NOT NULL CHECK (target_type IN ('number', 'percentage', 'currency', 'boolean')),
  target_value DECIMAL(12,2),
  measurement_period TEXT DEFAULT 'monthly', -- monthly, quarterly, h1 (half-year)
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scorecard_actuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_id UUID REFERENCES scorecard_metrics(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  actual_value DECIMAL(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(metric_id, period_start, period_end)
);

-- Enable RLS
ALTER TABLE scorecard_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecard_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecard_actuals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read" ON scorecard_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON scorecard_categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON scorecard_categories FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON scorecard_metrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON scorecard_metrics FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON scorecard_metrics FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON scorecard_actuals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON scorecard_actuals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON scorecard_actuals FOR UPDATE TO authenticated USING (true);

-- Seed scorecard categories (from spreadsheet Success Criteria tab)
INSERT INTO scorecard_categories (name, weight, sort_order) VALUES
('Client Performance', 0.30, 1),
('Operational Performance', 0.25, 2),
('Pipeline Performance', 0.30, 3),
('Financial Performance', 0.15, 4);

-- Seed scorecard metrics
-- Client Performance (30%)
INSERT INTO scorecard_metrics (category_id, name, description, target_type, target_value, measurement_period, sort_order)
SELECT id, 'Client Retention', 'No payment pauses or contract exits', 'percentage', 100, 'monthly', 1
FROM scorecard_categories WHERE name = 'Client Performance';

INSERT INTO scorecard_metrics (category_id, name, description, target_type, target_value, measurement_period, sort_order)
SELECT id, 'Client Escalations to Tim', 'Number of escalations requiring Tim intervention', 'number', 0, 'monthly', 2
FROM scorecard_categories WHERE name = 'Client Performance';

INSERT INTO scorecard_metrics (category_id, name, description, target_type, target_value, measurement_period, sort_order)
SELECT id, 'Renewals Initiated 45+ Days Early', 'Percentage of renewals started on time', 'percentage', 100, 'monthly', 3
FROM scorecard_categories WHERE name = 'Client Performance';

-- Operational Performance (25%)
INSERT INTO scorecard_metrics (category_id, name, description, target_type, target_value, measurement_period, sort_order)
SELECT id, 'Client Reports & Calls Completed', 'All scheduled reports and calls delivered', 'percentage', 100, 'monthly', 1
FROM scorecard_categories WHERE name = 'Operational Performance';

INSERT INTO scorecard_metrics (category_id, name, description, target_type, target_value, measurement_period, sort_order)
SELECT id, 'Team Billable Utilisation', 'Team utilisation against target', 'percentage', 65, 'monthly', 2
FROM scorecard_categories WHERE name = 'Operational Performance';

-- Pipeline Performance (30%)
INSERT INTO scorecard_metrics (category_id, name, description, target_type, target_value, measurement_period, sort_order)
SELECT id, 'Interviews Conducted', 'Number of interviews completed', 'number', 70, 'h1', 1
FROM scorecard_categories WHERE name = 'Pipeline Performance';

INSERT INTO scorecard_metrics (category_id, name, description, target_type, target_value, measurement_period, sort_order)
SELECT id, 'Surveys Completed', 'Number of surveys delivered', 'number', 31, 'h1', 2
FROM scorecard_categories WHERE name = 'Pipeline Performance';

INSERT INTO scorecard_metrics (category_id, name, description, target_type, target_value, measurement_period, sort_order)
SELECT id, 'C-Level Meetings', 'Qualified C-level meetings completed', 'number', 13, 'h1', 3
FROM scorecard_categories WHERE name = 'Pipeline Performance';

-- Financial Performance (15%)
INSERT INTO scorecard_metrics (category_id, name, description, target_type, target_value, measurement_period, sort_order)
SELECT id, 'Survey Revenue', 'Revenue from completed surveys', 'currency', 31000, 'h1', 1
FROM scorecard_categories WHERE name = 'Financial Performance';

INSERT INTO scorecard_metrics (category_id, name, description, target_type, target_value, measurement_period, sort_order)
SELECT id, 'Meeting Revenue', 'Revenue from C-level meetings', 'currency', 9100, 'h1', 2
FROM scorecard_categories WHERE name = 'Financial Performance';
