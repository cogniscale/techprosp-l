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
