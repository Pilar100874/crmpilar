-- Apenas remover a constraint antiga
ALTER TABLE public.calendario_tarefas 
DROP CONSTRAINT IF EXISTS calendario_tarefas_user_id_fkey