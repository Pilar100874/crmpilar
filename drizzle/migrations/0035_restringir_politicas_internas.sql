DROP POLICY IF EXISTS "Usuários autenticados podem inserir municipios_renda" ON public.municipios_renda;
CREATE POLICY "Usuários internos podem inserir municipios_renda" ON public.municipios_renda FOR INSERT TO authenticated WITH CHECK (public.is_usuario_interno(auth.uid()));
DROP POLICY IF EXISTS "Usuários autenticados podem inserir jobs" ON public.relatorio_jobs;
DROP POLICY IF EXISTS "Usuários autenticados podem ver seus jobs" ON public.relatorio_jobs;
CREATE POLICY "Usuários internos podem inserir jobs" ON public.relatorio_jobs FOR INSERT TO authenticated WITH CHECK (public.is_usuario_interno(auth.uid()));
CREATE POLICY "Usuários internos podem ver jobs" ON public.relatorio_jobs FOR SELECT TO authenticated USING (public.is_usuario_interno(auth.uid()));
DROP POLICY IF EXISTS "Sistema pode inserir respostas" ON public.pesquisas_respostas;
CREATE POLICY "Usuários internos podem inserir respostas" ON public.pesquisas_respostas FOR INSERT TO authenticated WITH CHECK (public.is_usuario_interno(auth.uid()));