-- Criar nova constraint que aponta para public.usuarios
ALTER TABLE public.calendario_tarefas 
ADD CONSTRAINT calendario_tarefas_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.usuarios(id) ON DELETE CASCADE