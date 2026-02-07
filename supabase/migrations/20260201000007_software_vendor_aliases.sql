-- Add vendor_aliases column to software_items for bank statement matching
-- This allows matching bank transaction descriptions to software items

ALTER TABLE public.software_items
ADD COLUMN vendor_aliases TEXT[] DEFAULT '{}';

-- Add comment explaining usage
COMMENT ON COLUMN public.software_items.vendor_aliases IS
'Array of strings to match against bank statement descriptions (e.g., ["ZOOM.US", "ZOOM VIDEO"])';

-- Seed common vendor aliases based on typical bank statement descriptions
UPDATE public.software_items SET vendor_aliases = ARRAY['ADOBE', 'ADOBE ACROPRO'] WHERE name = 'Acrobat Pro';
UPDATE public.software_items SET vendor_aliases = ARRAY['ALLDAY', 'ALLDAYPA'] WHERE name = 'Allday PA';
UPDATE public.software_items SET vendor_aliases = ARRAY['APPLE.COM', 'APPLE SERVICES'] WHERE name LIKE 'Apple Subscriptions%';
UPDATE public.software_items SET vendor_aliases = ARRAY['ASANA.COM', 'ASANA INC'] WHERE name = 'Asana';
UPDATE public.software_items SET vendor_aliases = ARRAY['AXA', 'AXA INSURANCE'] WHERE name = 'Axa Insurance';
UPDATE public.software_items SET vendor_aliases = ARRAY['BOLT.NEW', 'STACKBLITZ'] WHERE name = 'Bolt.new';
UPDATE public.software_items SET vendor_aliases = ARRAY['CALENDLY.COM', 'CALENDLY'] WHERE name LIKE 'Calendly%';
UPDATE public.software_items SET vendor_aliases = ARRAY['OPENAI', 'CHATGPT', 'CHAT GPT'] WHERE name = 'ChatGPT';
UPDATE public.software_items SET vendor_aliases = ARRAY['ANTHROPIC', 'CLAUDE.AI', 'CLAUDE'] WHERE name LIKE 'Claude%';
UPDATE public.software_items SET vendor_aliases = ARRAY['CLAY.COM', 'CLAY'] WHERE name = 'Clay.com';
UPDATE public.software_items SET vendor_aliases = ARRAY['DESCRIPT.COM', 'DESCRIPT'] WHERE name LIKE 'Descript%';
UPDATE public.software_items SET vendor_aliases = ARRAY['FLOCK', 'FLOCK SAFETY'] WHERE name LIKE 'Flock%';
UPDATE public.software_items SET vendor_aliases = ARRAY['FOLEON.COM', 'FOLEON'] WHERE name = 'Foleon';
UPDATE public.software_items SET vendor_aliases = ARRAY['FRESHWORKS', 'FRESHDESK'] WHERE name = 'Freshworks';
UPDATE public.software_items SET vendor_aliases = ARRAY['GOOGLE', 'YOUTUBE PREMIUM'] WHERE name = 'Google YouTube Premium';
UPDATE public.software_items SET vendor_aliases = ARRAY['GOOGLE', 'GSUITE', 'GOOGLE WORKSPACE'] WHERE name LIKE 'GSuite%';
UPDATE public.software_items SET vendor_aliases = ARRAY['GETHARVEST', 'HARVEST'] WHERE name = 'Harvest';
UPDATE public.software_items SET vendor_aliases = ARRAY['LINKEDIN', 'LNKD'] WHERE name LIKE 'LinkedIn%';
UPDATE public.software_items SET vendor_aliases = ARRAY['MULTILOGIN'] WHERE name = 'Multilogin';
UPDATE public.software_items SET vendor_aliases = ARRAY['NETLIFY.COM', 'NETLIFY'] WHERE name = 'Netlify';
UPDATE public.software_items SET vendor_aliases = ARRAY['PANDADOC.COM', 'PANDADOC'] WHERE name = 'Pandadoc';
UPDATE public.software_items SET vendor_aliases = ARRAY['PHANTOMBUSTER', 'PHANTOM'] WHERE name = 'Phantom Buster';
UPDATE public.software_items SET vendor_aliases = ARRAY['PROXYCURL'] WHERE name = 'Proxycurl';
UPDATE public.software_items SET vendor_aliases = ARRAY['SLACK.COM', 'SLACK TECHNOLOGIES'] WHERE name LIKE 'Slack%';
UPDATE public.software_items SET vendor_aliases = ARRAY['SMARTLEAD', 'SMARTLEAD.AI'] WHERE name = 'SmartLead';
UPDATE public.software_items SET vendor_aliases = ARRAY['SOHO HOUSE', 'SOHOHOUSE'] WHERE name = 'Soho House';
UPDATE public.software_items SET vendor_aliases = ARRAY['SOUNDCLOUD'] WHERE name = 'SoundCloud';
UPDATE public.software_items SET vendor_aliases = ARRAY['SUPABASE.COM', 'SUPABASE'] WHERE name = 'Supabase';
UPDATE public.software_items SET vendor_aliases = ARRAY['WISTIA.COM', 'WISTIA'] WHERE name = 'Wistia';
UPDATE public.software_items SET vendor_aliases = ARRAY['ZOOM.US', 'ZOOM VIDEO', 'ZOOM'] WHERE name = 'Zoom';

-- Function to match a bank transaction description to a software item
CREATE OR REPLACE FUNCTION match_software_from_description(description TEXT)
RETURNS TABLE (
  software_item_id UUID,
  software_name TEXT,
  default_cost DECIMAL(10,2),
  match_confidence TEXT
) AS $$
DECLARE
  normalized_desc TEXT;
BEGIN
  -- Normalize the description (uppercase, remove common prefixes)
  normalized_desc := UPPER(TRIM(description));

  RETURN QUERY
  SELECT
    si.id as software_item_id,
    si.name as software_name,
    si.default_monthly_cost as default_cost,
    CASE
      WHEN normalized_desc ILIKE '%' || si.name || '%' THEN 'high'
      WHEN normalized_desc ILIKE '%' || si.vendor || '%' THEN 'high'
      WHEN EXISTS (
        SELECT 1 FROM unnest(si.vendor_aliases) alias
        WHERE normalized_desc ILIKE '%' || alias || '%'
      ) THEN 'medium'
      ELSE 'low'
    END as match_confidence
  FROM public.software_items si
  WHERE si.is_active = true
    AND (
      normalized_desc ILIKE '%' || si.name || '%'
      OR normalized_desc ILIKE '%' || si.vendor || '%'
      OR EXISTS (
        SELECT 1 FROM unnest(si.vendor_aliases) alias
        WHERE normalized_desc ILIKE '%' || alias || '%'
      )
    )
  ORDER BY
    CASE
      WHEN normalized_desc ILIKE '%' || si.name || '%' THEN 1
      WHEN normalized_desc ILIKE '%' || si.vendor || '%' THEN 2
      ELSE 3
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
