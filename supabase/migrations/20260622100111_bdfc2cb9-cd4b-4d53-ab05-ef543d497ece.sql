ALTER PUBLICATION supabase_realtime ADD TABLE public.ponto_registros;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ponto_alertas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ponto_ajustes;
ALTER TABLE public.ponto_registros REPLICA IDENTITY FULL;
ALTER TABLE public.ponto_alertas REPLICA IDENTITY FULL;
ALTER TABLE public.ponto_ajustes REPLICA IDENTITY FULL;