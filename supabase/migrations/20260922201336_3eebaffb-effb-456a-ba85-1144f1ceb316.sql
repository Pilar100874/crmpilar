ALTER TABLE public.calendario_tarefas REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendario_tarefas;