-- Permissões RLS para tabela orcamento_itens
-- Garante que usuários do estabelecimento relacionado ao orçamento possam gerenciar itens

-- Habilitar RLS (idempotente)
ALTER TABLE public.orcamento_itens ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas conflitantes (se existirem)
DROP POLICY IF EXISTS "orcamento_itens_select" ON public.orcamento_itens;
DROP POLICY IF EXISTS "orcamento_itens_insert" ON public.orcamento_itens;
DROP POLICY IF EXISTS "orcamento_itens_update" ON public.orcamento_itens;
DROP POLICY IF EXISTS "orcamento_itens_delete" ON public.orcamento_itens;

-- Política de SELECT
CREATE POLICY "orcamento_itens_select"
ON public.orcamento_itens
FOR SELECT
USING (
  -- Administrador de sistema
  EXISTS (
    SELECT 1 FROM public.administradores a
    WHERE a.id = auth.uid()
  )
  OR
  -- Usuário vinculado ao mesmo estabelecimento do orçamento
  EXISTS (
    SELECT 1
    FROM public.orcamentos o
    JOIN public.usuarios u ON u.estabelecimento_id = o.estabelecimento_id
    WHERE o.id = orcamento_itens.orcamento_id
      AND u.auth_user_id = auth.uid()
  )
);

-- Política de INSERT
CREATE POLICY "orcamento_itens_insert"
ON public.orcamento_itens
FOR INSERT
WITH CHECK (
  -- Administrador de sistema
  EXISTS (
    SELECT 1 FROM public.administradores a
    WHERE a.id = auth.uid()
  )
  OR
  -- Usuário vinculado ao mesmo estabelecimento do orçamento
  EXISTS (
    SELECT 1
    FROM public.orcamentos o
    JOIN public.usuarios u ON u.estabelecimento_id = o.estabelecimento_id
    WHERE o.id = orcamento_itens.orcamento_id
      AND u.auth_user_id = auth.uid()
  )
);

-- Política de UPDATE
CREATE POLICY "orcamento_itens_update"
ON public.orcamento_itens
FOR UPDATE
USING (
  -- Administrador de sistema
  EXISTS (
    SELECT 1 FROM public.administradores a
    WHERE a.id = auth.uid()
  )
  OR
  -- Usuário vinculado ao mesmo estabelecimento do orçamento
  EXISTS (
    SELECT 1
    FROM public.orcamentos o
    JOIN public.usuarios u ON u.estabelecimento_id = o.estabelecimento_id
    WHERE o.id = orcamento_itens.orcamento_id
      AND u.auth_user_id = auth.uid()
  )
)
WITH CHECK (
  -- Mesmo critério para novos valores
  EXISTS (
    SELECT 1 FROM public.administradores a
    WHERE a.id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1
    FROM public.orcamentos o
    JOIN public.usuarios u ON u.estabelecimento_id = o.estabelecimento_id
    WHERE o.id = orcamento_itens.orcamento_id
      AND u.auth_user_id = auth.uid()
  )
);

-- Política de DELETE
CREATE POLICY "orcamento_itens_delete"
ON public.orcamento_itens
FOR DELETE
USING (
  -- Administrador de sistema
  EXISTS (
    SELECT 1 FROM public.administradores a
    WHERE a.id = auth.uid()
  )
  OR
  -- Usuário vinculado ao mesmo estabelecimento do orçamento
  EXISTS (
    SELECT 1
    FROM public.orcamentos o
    JOIN public.usuarios u ON u.estabelecimento_id = o.estabelecimento_id
    WHERE o.id = orcamento_itens.orcamento_id
      AND u.auth_user_id = auth.uid()
  )
);