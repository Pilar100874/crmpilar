
CREATE TABLE public.relatorios_voz (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  grupo TEXT NOT NULL DEFAULT 'Geral',
  descricao TEXT,
  prompt_geracao TEXT NOT NULL,
  tipo_saida TEXT NOT NULL DEFAULT 'texto' CHECK (tipo_saida IN ('texto','tabela','grafico','misto')),
  aliases TEXT[] NOT NULL DEFAULT '{}',
  parametros JSONB NOT NULL DEFAULT '[]'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_relatorios_voz_estab ON public.relatorios_voz(estabelecimento_id);
CREATE INDEX idx_relatorios_voz_grupo ON public.relatorios_voz(estabelecimento_id, grupo);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.relatorios_voz TO authenticated;
GRANT ALL ON public.relatorios_voz TO service_role;

ALTER TABLE public.relatorios_voz ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios veem relatorios voz do seu estabelecimento"
  ON public.relatorios_voz FOR SELECT TO authenticated
  USING (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Usuarios criam relatorios voz no seu estabelecimento"
  ON public.relatorios_voz FOR INSERT TO authenticated
  WITH CHECK (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Usuarios editam relatorios voz do seu estabelecimento"
  ON public.relatorios_voz FOR UPDATE TO authenticated
  USING (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Usuarios excluem relatorios voz do seu estabelecimento"
  ON public.relatorios_voz FOR DELETE TO authenticated
  USING (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
    )
  );

CREATE TRIGGER trg_relatorios_voz_updated_at
  BEFORE UPDATE ON public.relatorios_voz
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
