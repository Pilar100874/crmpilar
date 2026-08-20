-- 1) customer_vinculos: remove "no roles" bypass
DROP POLICY IF EXISTS "Admins and gestores can manage customer_vinculos" ON public.customer_vinculos;
CREATE POLICY "Admins and gestores can manage customer_vinculos"
ON public.customer_vinculos
FOR ALL
TO authenticated
USING (
  estabelecimento_id = get_user_estabelecimento_id(auth.uid())
  OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
)
WITH CHECK (
  estabelecimento_id = get_user_estabelecimento_id(auth.uid())
  OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
);

-- 2) move internal denuncias notification email out of publicly readable ecommerce_config
CREATE TABLE IF NOT EXISTS public.ecommerce_config_privado (
  estabelecimento_id uuid PRIMARY KEY REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  denuncias_email_destino text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ecommerce_config_privado TO authenticated;
GRANT ALL ON public.ecommerce_config_privado TO service_role;

ALTER TABLE public.ecommerce_config_privado ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins/gestores gerenciam config privada da loja"
ON public.ecommerce_config_privado
FOR ALL
TO authenticated
USING (
  estabelecimento_id = get_auth_user_estabelecimento_id()
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
)
WITH CHECK (
  estabelecimento_id = get_auth_user_estabelecimento_id()
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
);

INSERT INTO public.ecommerce_config_privado (estabelecimento_id, denuncias_email_destino)
SELECT c.estabelecimento_id, NULLIF(c.denuncias_config->>'email_destino', '')
FROM public.ecommerce_config c
WHERE c.estabelecimento_id IS NOT NULL
  AND NULLIF(c.denuncias_config->>'email_destino', '') IS NOT NULL
ON CONFLICT (estabelecimento_id) DO NOTHING;

UPDATE public.ecommerce_config
SET denuncias_config = denuncias_config - 'email_destino'
WHERE denuncias_config ? 'email_destino';

-- 3) denuncias: validated public insert
DROP POLICY IF EXISTS "Qualquer um pode enviar denúncia" ON public.ecommerce_denuncias;
CREATE POLICY "Envio validado de denuncia"
ON public.ecommerce_denuncias
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ecommerce_config c
    WHERE c.estabelecimento_id = ecommerce_denuncias.estabelecimento_id
      AND c.denuncias_enabled = true
  )
  AND status = 'nova'
  AND char_length(btrim(descricao)) BETWEEN 10 AND 5000
  AND (categoria IS NULL OR char_length(categoria) <= 120)
  AND (local_ocorrencia IS NULL OR char_length(local_ocorrencia) <= 200)
  AND (nome IS NULL OR char_length(nome) <= 120)
  AND (email IS NULL OR char_length(email) <= 254)
  AND (telefone IS NULL OR char_length(telefone) <= 20)
  AND resposta_interna IS NULL
);

-- 4) pedidos_ecommerce: validated checkout insert
DROP POLICY IF EXISTS "Anyone can create ecommerce orders" ON public.pedidos_ecommerce;
CREATE POLICY "Checkout validado cria pedidos"
ON public.pedidos_ecommerce
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ecommerce_config c
    WHERE c.estabelecimento_id = pedidos_ecommerce.estabelecimento_id
  )
  AND status = 'pendente'
  AND char_length(btrim(nome_cliente)) BETWEEN 2 AND 150
  AND (email_cliente IS NULL OR char_length(email_cliente) <= 254)
  AND (telefone_cliente IS NULL OR char_length(telefone_cliente) <= 20)
  AND (cpf_cliente IS NULL OR char_length(cpf_cliente) <= 20)
  AND (cnpj_cliente IS NULL OR char_length(cnpj_cliente) <= 20)
  AND (observacoes IS NULL OR char_length(observacoes) <= 2000)
  AND subtotal >= 0 AND desconto >= 0 AND frete >= 0
  AND valor_total >= 0 AND valor_total <= 10000000
);

-- 5) pedidos_ecommerce_itens: only for a freshly created order or own establishment
DROP POLICY IF EXISTS "Anyone can insert order items" ON public.pedidos_ecommerce_itens;
CREATE POLICY "Itens validados de pedido"
ON public.pedidos_ecommerce_itens
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pedidos_ecommerce p
    WHERE p.id = pedidos_ecommerce_itens.pedido_id
      AND (
        p.created_at > now() - interval '30 minutes'
        OR p.estabelecimento_id = get_auth_user_estabelecimento_id()
      )
  )
  AND quantidade > 0 AND quantidade <= 100000
  AND preco_unitario >= 0
  AND subtotal >= 0
  AND char_length(coalesce(nome_produto, '')) <= 300
);

-- 6) internal trigger function must not be executable by API roles
REVOKE ALL ON FUNCTION public.cv_cameras_set_estabelecimento() FROM anon, authenticated, PUBLIC;