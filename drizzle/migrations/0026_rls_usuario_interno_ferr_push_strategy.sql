DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ferr_loan_renewals','ferr_user_warehouses','ferr_loan_request_items','ferr_kit_tools'] LOOP
    EXECUTE format('ALTER POLICY ferr_select_auth ON public.%I USING (public.is_usuario_interno(auth.uid()))', t);
    EXECUTE format('ALTER POLICY ferr_write_auth ON public.%I WITH CHECK (public.is_usuario_interno(auth.uid()))', t);
  END LOOP;
END $$;
DROP POLICY IF EXISTS "Update own subscription" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Delete own subscription" ON public.push_subscriptions;
CREATE POLICY "Delete own subscription" ON public.push_subscriptions FOR DELETE TO authenticated
  USING (usuario_id = (SELECT u.id FROM public.usuarios u WHERE u.auth_user_id = auth.uid()));
ALTER POLICY "Usuarios atualizam suas proprias subscriptions" ON public.push_subscriptions
  WITH CHECK (usuario_id = (SELECT u.id FROM public.usuarios u WHERE u.auth_user_id = auth.uid()));
ALTER POLICY "Users can view artifact versions" ON public.strategy_artifact_versions
  USING (public.is_usuario_interno(auth.uid()));