
-- Departamentos: permitir nível empresa (filial opcional) + flag ativo
ALTER TABLE public.ponto_departamentos ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.ponto_empresas(id) ON DELETE CASCADE;
ALTER TABLE public.ponto_departamentos ADD COLUMN IF NOT EXISTS descricao text;
ALTER TABLE public.ponto_departamentos ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

UPDATE public.ponto_departamentos d
   SET empresa_id = f.empresa_id
  FROM public.ponto_filiais f
 WHERE d.filial_id = f.id AND d.empresa_id IS NULL;

ALTER TABLE public.ponto_departamentos ALTER COLUMN filial_id DROP NOT NULL;
ALTER TABLE public.ponto_departamentos ALTER COLUMN empresa_id SET NOT NULL;

DROP POLICY IF EXISTS "ponto_dept tenant" ON public.ponto_departamentos;
CREATE POLICY "ponto_dept tenant" ON public.ponto_departamentos
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ponto_empresas e WHERE e.id = ponto_departamentos.empresa_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ponto_empresas e WHERE e.id = ponto_departamentos.empresa_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()));

-- Cargos
CREATE TABLE IF NOT EXISTS public.ponto_cargos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.ponto_empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cbo text,
  descricao text,
  salario_base numeric(12,2),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_cargos TO authenticated;
GRANT ALL ON public.ponto_cargos TO service_role;
ALTER TABLE public.ponto_cargos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ponto_cargos tenant" ON public.ponto_cargos
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ponto_empresas e WHERE e.id = ponto_cargos.empresa_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ponto_empresas e WHERE e.id = ponto_cargos.empresa_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()));
CREATE TRIGGER trg_ponto_cargos_updated_at BEFORE UPDATE ON public.ponto_cargos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Equipes
CREATE TABLE IF NOT EXISTS public.ponto_equipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.ponto_empresas(id) ON DELETE CASCADE,
  filial_id uuid REFERENCES public.ponto_filiais(id) ON DELETE SET NULL,
  departamento_id uuid REFERENCES public.ponto_departamentos(id) ON DELETE SET NULL,
  lider_funcionario_id uuid REFERENCES public.ponto_funcionarios(id) ON DELETE SET NULL,
  nome text NOT NULL,
  descricao text,
  cor text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_equipes TO authenticated;
GRANT ALL ON public.ponto_equipes TO service_role;
ALTER TABLE public.ponto_equipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ponto_equipes tenant" ON public.ponto_equipes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ponto_empresas e WHERE e.id = ponto_equipes.empresa_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ponto_empresas e WHERE e.id = ponto_equipes.empresa_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()));
CREATE TRIGGER trg_ponto_equipes_updated_at BEFORE UPDATE ON public.ponto_equipes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Membros da equipe
CREATE TABLE IF NOT EXISTS public.ponto_equipe_membros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipe_id uuid NOT NULL REFERENCES public.ponto_equipes(id) ON DELETE CASCADE,
  funcionario_id uuid NOT NULL REFERENCES public.ponto_funcionarios(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (equipe_id, funcionario_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_equipe_membros TO authenticated;
GRANT ALL ON public.ponto_equipe_membros TO service_role;
ALTER TABLE public.ponto_equipe_membros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ponto_equipe_membros tenant" ON public.ponto_equipe_membros
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ponto_equipes eq JOIN public.ponto_empresas e ON e.id = eq.empresa_id WHERE eq.id = ponto_equipe_membros.equipe_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ponto_equipes eq JOIN public.ponto_empresas e ON e.id = eq.empresa_id WHERE eq.id = ponto_equipe_membros.equipe_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()));
