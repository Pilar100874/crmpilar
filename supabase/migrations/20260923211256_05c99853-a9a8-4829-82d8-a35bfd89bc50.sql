GRANT SELECT, INSERT ON TABLE public.atendimento_registros TO authenticated;
GRANT ALL ON TABLE public.atendimento_registros TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.calendario_tarefas TO authenticated;
GRANT ALL ON TABLE public.calendario_tarefas TO service_role;