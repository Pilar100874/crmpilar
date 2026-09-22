-- Corrige políticas de calendario_tarefas: user_id referencia usuarios.id, não auth.uid()
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias tarefas" ON public.calendario_tarefas;
DROP POLICY IF EXISTS "Usuários podem deletar suas próprias tarefas" ON public.calendario_tarefas;
DROP POLICY IF EXISTS "Usuários podem ver suas próprias tarefas" ON public.calendario_tarefas;
DROP POLICY IF EXISTS "Usuários podem criar suas próprias tarefas" ON public.calendario_tarefas;

CREATE POLICY "Usuarios podem ver suas tarefas"
ON public.calendario_tarefas FOR SELECT TO authenticated
USING (user_id = public.get_current_usuario_id());

CREATE POLICY "Usuarios podem criar tarefas do seu estabelecimento"
ON public.calendario_tarefas FOR INSERT TO authenticated
WITH CHECK (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()));

CREATE POLICY "Usuarios podem atualizar tarefas do seu estabelecimento"
ON public.calendario_tarefas FOR UPDATE TO authenticated
USING (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()))
WITH CHECK (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()));

CREATE POLICY "Usuarios podem deletar tarefas do seu estabelecimento"
ON public.calendario_tarefas FOR DELETE TO authenticated
USING (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendario_tarefas TO authenticated;
GRANT ALL ON public.calendario_tarefas TO service_role;