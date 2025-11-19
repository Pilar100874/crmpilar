-- Adicionar políticas RLS para relatorios_importacao

-- Política para SELECT: usuários podem ver relatórios do seu estabelecimento
CREATE POLICY "Users can view reports from their establishment"
ON public.relatorios_importacao
FOR SELECT
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id
    FROM usuarios
    WHERE id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM administradores WHERE id = auth.uid()
  )
);

-- Política para INSERT: usuários podem criar relatórios para seu estabelecimento
CREATE POLICY "Users can create reports for their establishment"
ON public.relatorios_importacao
FOR INSERT
WITH CHECK (
  estabelecimento_id IN (
    SELECT estabelecimento_id
    FROM usuarios
    WHERE id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM administradores WHERE id = auth.uid()
  )
);

-- Política para UPDATE: usuários podem atualizar relatórios do seu estabelecimento
CREATE POLICY "Users can update reports from their establishment"
ON public.relatorios_importacao
FOR UPDATE
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id
    FROM usuarios
    WHERE id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM administradores WHERE id = auth.uid()
  )
);

-- Política para DELETE: usuários podem deletar relatórios do seu estabelecimento
CREATE POLICY "Users can delete reports from their establishment"
ON public.relatorios_importacao
FOR DELETE
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id
    FROM usuarios
    WHERE id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM administradores WHERE id = auth.uid()
  )
);