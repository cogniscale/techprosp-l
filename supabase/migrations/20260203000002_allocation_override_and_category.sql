-- Add per-month allocation % override to software_costs
ALTER TABLE public.software_costs
ADD COLUMN IF NOT EXISTS techpros_allocation_percent INTEGER;

COMMENT ON COLUMN public.software_costs.techpros_allocation_percent IS
  'Per-month allocation % override. NULL uses default from software_items';

-- Add category column to software_items for P&L grouping
ALTER TABLE public.software_items
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Software etc';

-- Tag Foleon as separate category for P&L display
UPDATE public.software_items
SET category = '6sense Foleon'
WHERE name ILIKE '%foleon%';
