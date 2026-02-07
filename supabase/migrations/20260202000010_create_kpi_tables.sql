-- Create KPI metrics table
CREATE TABLE IF NOT EXISTS public.kpi_metrics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL,
  name text NOT NULL,
  description text,
  target_type text NOT NULL DEFAULT 'number', -- 'number', 'percentage', 'currency'
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create KPI values table (monthly targets and actuals)
CREATE TABLE IF NOT EXISTS public.kpi_values (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_id uuid REFERENCES public.kpi_metrics(id) ON DELETE CASCADE,
  kpi_month date NOT NULL,
  target_value numeric(15,2),
  actual_value numeric(15,2),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(metric_id, kpi_month)
);

-- Create Activity Tracker table
CREATE TABLE IF NOT EXISTS public.activity_metrics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL,
  name text NOT NULL,
  description text,
  annual_target numeric(15,2),
  target_type text NOT NULL DEFAULT 'number', -- 'number', 'currency'
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create Activity values table
CREATE TABLE IF NOT EXISTS public.activity_values (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_id uuid REFERENCES public.activity_metrics(id) ON DELETE CASCADE,
  activity_month date NOT NULL,
  target_value numeric(15,2),
  actual_value numeric(15,2),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(metric_id, activity_month)
);

-- Enable RLS
ALTER TABLE public.kpi_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_values ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for authenticated users)
CREATE POLICY "Allow all for authenticated users" ON public.kpi_metrics FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON public.kpi_values FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON public.activity_metrics FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON public.activity_values FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed KPI metrics from spreadsheet
INSERT INTO public.kpi_metrics (category, name, description, target_type, sort_order) VALUES
-- CLIENT PERFORMANCE
('Client Performance', 'Client Retention', 'No attrition - keep all paying clients', 'percentage', 1),
('Client Performance', 'Client Escalations to Tim', 'Clients contact Taryn, not Tim', 'number', 2),
('Client Performance', 'Renewals Initiated on Time', '45+ days before expiry', 'percentage', 3),
-- OPERATIONAL PERFORMANCE
('Operational Performance', 'Client Reports & Calls on Schedule', 'All scheduled reports and calls delivered', 'percentage', 4),
('Operational Performance', 'Team Billable Utilisation', 'Billable hours / available hours', 'percentage', 5),
-- PIPELINE PERFORMANCE
('Pipeline Performance', 'Interviews Conducted', 'CogniScale interviews completed', 'number', 6),
('Pipeline Performance', 'Surveys Completed', 'Survey responses received', 'number', 7),
('Pipeline Performance', 'C-Level Meetings Booked', 'Meetings with C-suite executives', 'number', 8),
('Pipeline Performance', 'CogniScale Roundtables', 'Roundtable events held', 'number', 9),
('Pipeline Performance', 'Leadership Immersion Events', 'Leadership events delivered', 'number', 10);

-- Seed Activity metrics from spreadsheet
INSERT INTO public.activity_metrics (category, name, description, target_type, annual_target, sort_order) VALUES
-- INTERVIEWS & EVENTS
('Interviews & Events', 'Interviews Conducted', 'CogniScale interviews completed', 'number', 140, 1),
('Interviews & Events', 'CogniScale Roundtables', 'Roundtable events held', 'number', 11, 2),
('Interviews & Events', 'Event Participants', 'Total participants across events', 'number', 66, 3),
-- DIRECT OUTREACH
('Direct Outreach', 'MQL3s Generated', 'Marketing qualified leads (level 3)', 'number', 84, 4),
('Direct Outreach', 'C-Level Meetings Completed', 'Meetings with C-suite executives', 'number', 28, 5),
-- SURVEYS COMPLETED
('Surveys Completed', 'Surveys from Interviews', 'Surveys completed from interview pipeline', 'number', 42, 6),
('Surveys Completed', 'Surveys from Roundtables', 'Surveys completed from roundtable attendees', 'number', 20, 7),
-- REVENUE EARNED
('Revenue Earned', 'Survey Fees', 'Revenue from survey completions @ £1,000 each', 'currency', 52000, 8),
('Revenue Earned', 'Meeting Fees', 'Revenue from C-level meetings @ £700 each', 'currency', 19600, 9);

-- Seed default KPI targets for 2026
DO $$
DECLARE
  metric_rec RECORD;
  month_date DATE;
BEGIN
  FOR metric_rec IN SELECT id, name FROM public.kpi_metrics LOOP
    FOR i IN 1..12 LOOP
      month_date := ('2026-' || LPAD(i::text, 2, '0') || '-01')::date;

      INSERT INTO public.kpi_values (metric_id, kpi_month, target_value)
      VALUES (
        metric_rec.id,
        month_date,
        CASE metric_rec.name
          WHEN 'Client Retention' THEN 100
          WHEN 'Client Escalations to Tim' THEN 0
          WHEN 'Renewals Initiated on Time' THEN 100
          WHEN 'Client Reports & Calls on Schedule' THEN 100
          WHEN 'Team Billable Utilisation' THEN 65
          WHEN 'Interviews Conducted' THEN CASE WHEN i = 1 THEN 10 ELSE 12 END
          WHEN 'Surveys Completed' THEN CASE WHEN i <= 2 THEN 0 WHEN i = 3 THEN 3 ELSE 5 END
          WHEN 'C-Level Meetings Booked' THEN CASE WHEN i = 1 THEN 0 WHEN i = 2 THEN 1 ELSE 3 END
          WHEN 'CogniScale Roundtables' THEN CASE WHEN i = 1 THEN 0 ELSE 1 END
          WHEN 'Leadership Immersion Events' THEN 0
          ELSE 0
        END
      )
      ON CONFLICT (metric_id, kpi_month) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- Seed default Activity targets for 2026 (based on spreadsheet)
DO $$
DECLARE
  metric_rec RECORD;
  month_date DATE;
BEGIN
  FOR metric_rec IN SELECT id, name, annual_target FROM public.activity_metrics LOOP
    FOR i IN 1..12 LOOP
      month_date := ('2026-' || LPAD(i::text, 2, '0') || '-01')::date;

      INSERT INTO public.activity_values (metric_id, activity_month, target_value)
      VALUES (
        metric_rec.id,
        month_date,
        CASE metric_rec.name
          WHEN 'Interviews Conducted' THEN CASE WHEN i = 1 THEN 10 ELSE 12 END
          WHEN 'CogniScale Roundtables' THEN CASE WHEN i = 1 THEN 0 ELSE 1 END
          WHEN 'Event Participants' THEN CASE WHEN i = 1 THEN 0 ELSE 6 END
          WHEN 'MQL3s Generated' THEN CASE WHEN i = 1 THEN 0 WHEN i = 2 THEN 4 ELSE 8 END
          WHEN 'C-Level Meetings Completed' THEN CASE WHEN i = 1 THEN 0 WHEN i = 2 THEN 1 ELSE 3 END
          WHEN 'Surveys from Interviews' THEN CASE WHEN i <= 2 THEN 0 ELSE 4 END
          WHEN 'Surveys from Roundtables' THEN CASE WHEN i <= 2 THEN 0 ELSE 2 END
          WHEN 'Survey Fees' THEN CASE WHEN i <= 2 THEN 0 ELSE 5000 END
          WHEN 'Meeting Fees' THEN CASE WHEN i = 1 THEN 0 WHEN i = 2 THEN 700 ELSE 2100 END
          ELSE 0
        END
      )
      ON CONFLICT (metric_id, activity_month) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
