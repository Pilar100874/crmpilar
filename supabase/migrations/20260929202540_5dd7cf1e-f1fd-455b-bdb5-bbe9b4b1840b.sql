ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_bot_atendimento_id_fkey;
UPDATE public.usuarios SET bot_atendimento_id = NULL, bot_atendimento_ativo = false WHERE bot_atendimento_id IS NOT NULL;
ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_bot_atendimento_id_fkey FOREIGN KEY (bot_atendimento_id) REFERENCES public.bot_flows(id) ON DELETE SET NULL;