-- Fix infinite recursion in bot_flows RLS policies
DROP POLICY IF EXISTS "Admins and gestores can manage bot flows" ON public.bot_flows;

-- Create simpler policy without recursion
CREATE POLICY "Authenticated users can manage bot flows"
  ON public.bot_flows FOR ALL
  USING (auth.uid() IS NOT NULL);