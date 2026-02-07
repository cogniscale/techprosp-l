-- Update team member costs to match v5 spreadsheet
-- Taryn: £3,800/month (was £4,560)
-- Vanessa & Manila team: £3,500/month (was £1,650 for just Vanessa)
-- Aamir: £1,500/month (was £1,800)
-- Nikita: £450/month (was £500)
-- Felix: £250/month (new)

UPDATE public.team_members
SET default_monthly_cost = 3800.00,
    name = 'Taryn'
WHERE name ILIKE '%taryn%';

UPDATE public.team_members
SET default_monthly_cost = 3500.00,
    name = 'Vanessa & Manila team'
WHERE name ILIKE '%vanessa%';

UPDATE public.team_members
SET default_monthly_cost = 1500.00,
    name = 'Aamir (Pune)'
WHERE name ILIKE '%aamir%';

UPDATE public.team_members
SET default_monthly_cost = 450.00,
    name = 'Nikita (Pune)'
WHERE name ILIKE '%nikita%';

-- Add Felix if not exists
INSERT INTO public.team_members (name, role, employment_type, default_monthly_cost, is_active, supplier_names)
SELECT 'Felix (50% - AI automations)', 'Contractor', 'contractor', 250.00, true, ARRAY['Felix']
WHERE NOT EXISTS (SELECT 1 FROM public.team_members WHERE name ILIKE '%felix%');

-- Remove Pakistan Team if exists (replaced by Manila in Vanessa's row)
UPDATE public.team_members
SET is_active = false
WHERE name ILIKE '%pakistan%';
