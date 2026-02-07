-- Add missing software items found in January 2026 bank statement

INSERT INTO public.software_items (name, vendor, default_monthly_cost, techpros_allocation_percent, notes, vendor_aliases) VALUES
  ('GoDaddy', 'GoDaddy', 60.67, 100, 'Domain registration', ARRAY['GODADDY', 'DNH*GODADDY']),
  ('N8N', 'N8N', 72.00, 100, 'Automation tool', ARRAY['N8N', 'PADDLE.NET* N8N']),
  ('PDFE.com', 'PDFE', 51.78, 100, 'PDF tool', ARRAY['PDFE.COM', 'PDFE'])
ON CONFLICT DO NOTHING;
