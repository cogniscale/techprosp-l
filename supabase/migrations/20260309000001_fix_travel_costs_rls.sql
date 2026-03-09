-- Fix travel_costs RLS policy: add WITH CHECK for INSERT support
-- The original FOR ALL policy only had USING, which doesn't cover INSERT operations

DROP POLICY IF EXISTS "Authenticated users can manage travel costs" ON public.travel_costs;

CREATE POLICY "Authenticated users can manage travel costs"
  ON public.travel_costs FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
