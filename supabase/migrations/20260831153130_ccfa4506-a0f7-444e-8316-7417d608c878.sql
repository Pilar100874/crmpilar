ALTER TABLE public.cv_vehicle_movements REPLICA IDENTITY FULL;
ALTER TABLE public.transp_movimentos REPLICA IDENTITY FULL;
ALTER TABLE public.vis_access_records REPLICA IDENTITY FULL;
ALTER TABLE public.livro_ocorrencias REPLICA IDENTITY FULL;
ALTER TABLE public.livro_encomendas REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.cv_vehicle_movements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transp_movimentos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vis_access_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.livro_ocorrencias;
ALTER PUBLICATION supabase_realtime ADD TABLE public.livro_encomendas;