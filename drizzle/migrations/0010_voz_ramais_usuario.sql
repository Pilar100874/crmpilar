CREATE TABLE public.voz_ramais_usuario (
  usuario_id uuid PRIMARY KEY,
  estabelecimento_id uuid NOT NULL,
  virtual_ativo boolean NOT NULL DEFAULT false,
  ramal_virtual text,
  senha_virtual text,
  agente_virtual_id uuid,
  ligacoes_ativo boolean NOT NULL DEFAULT false,
  ramal_ligacoes text,
  senha_ligacoes text,
  ajuda_ativa boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voz_ramais_usuario TO authenticated;
GRANT ALL ON public.voz_ramais_usuario TO service_role;
ALTER TABLE public.voz_ramais_usuario ENABLE ROW LEVEL SECURITY;
CREATE POLICY voz_ramais_usuario_tenant ON public.voz_ramais_usuario FOR ALL TO authenticated
  USING (estabelecimento_id = get_auth_user_estabelecimento_id() OR is_system_admin())
  WITH CHECK (estabelecimento_id = get_auth_user_estabelecimento_id() OR is_system_admin());

ALTER TABLE public.ucm_config
  ADD COLUMN IF NOT EXISTS voz_ramal_empresa text,
  ADD COLUMN IF NOT EXISTS voz_senha_ramal_empresa text,
  ADD COLUMN IF NOT EXISTS voz_agente_empresa_id uuid;

ALTER TABLE public.voz_chamadas
  ADD COLUMN IF NOT EXISTS transferido_para text,
  ADD COLUMN IF NOT EXISTS objetivo text;

ALTER TABLE public.voz_chamadas REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.voz_chamadas;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;