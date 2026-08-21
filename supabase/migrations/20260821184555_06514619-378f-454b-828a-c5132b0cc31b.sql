ALTER TYPE public.op_app_role ADD VALUE IF NOT EXISTS 'super_admin';
CREATE POLICY "Authenticated users can view op_establishments"
  ON public.op_establishments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Manager can manage op_establishments"
  ON public.op_establishments FOR ALL TO authenticated USING (op_is_admin_or_manager(auth.uid()));