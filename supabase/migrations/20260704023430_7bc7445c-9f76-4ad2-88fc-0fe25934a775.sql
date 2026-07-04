
-- 1) Adiciona flags e configs no ecommerce_config
ALTER TABLE public.ecommerce_config
  ADD COLUMN IF NOT EXISTS denuncias_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS denuncias_config jsonb NOT NULL DEFAULT '{
    "titulo": "Canal de Denúncias - NR-1",
    "intro": "Este canal segue a Norma Regulamentadora nº 1 (NR-1) e o Programa de Gerenciamento de Riscos (PGR), incluindo riscos psicossociais. As denúncias podem ser feitas de forma anônima e serão tratadas com sigilo.",
    "email_destino": "",
    "aceita_anonimo": true,
    "categorias": ["Assédio moral","Assédio sexual","Riscos psicossociais","Condições inseguras de trabalho","Acidente ou quase-acidente","Discriminação","Outro"],
    "aviso_sigilo": "As informações fornecidas serão tratadas com sigilo e utilizadas apenas para investigação interna, respeitando a LGPD (Lei 13.709/2018)."
  }'::jsonb,
  ADD COLUMN IF NOT EXISTS lgpd_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lgpd_config jsonb NOT NULL DEFAULT '{
    "titulo": "Política de Privacidade e Proteção de Dados (LGPD)",
    "intro": "Esta política descreve como coletamos, utilizamos, armazenamos e protegemos seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).",
    "encarregado_nome": "",
    "encarregado_email": "",
    "controlador_nome": "",
    "controlador_cnpj": "",
    "controlador_endereco": "",
    "secoes": [
      {"titulo": "1. Dados que coletamos", "texto": "Coletamos dados que você nos fornece diretamente ao se cadastrar, realizar compras ou entrar em contato: nome, CPF/CNPJ, endereço, e-mail, telefone e informações de pagamento. Também coletamos automaticamente dados de navegação (cookies, IP, dispositivo) para melhorar sua experiência."},
      {"titulo": "2. Finalidade do tratamento", "texto": "Utilizamos seus dados para: processar pedidos e pagamentos; emitir notas fiscais; realizar entregas; oferecer suporte; enviar comunicações sobre pedidos; cumprir obrigações legais e regulatórias; e, com seu consentimento, enviar ofertas e novidades."},
      {"titulo": "3. Base legal", "texto": "O tratamento é realizado com base em: execução de contrato (compra); cumprimento de obrigação legal; legítimo interesse; e consentimento do titular, quando aplicável (ex.: marketing)."},
      {"titulo": "4. Compartilhamento de dados", "texto": "Podemos compartilhar seus dados com parceiros essenciais à operação: transportadoras, gateways de pagamento, plataformas de e-mail e órgãos públicos, quando exigido por lei. Não vendemos seus dados a terceiros."},
      {"titulo": "5. Armazenamento e segurança", "texto": "Adotamos medidas técnicas e organizacionais para proteger seus dados contra acesso não autorizado, perda ou alteração, incluindo criptografia, controle de acesso e monitoramento. Os dados são mantidos apenas pelo tempo necessário às finalidades ou por obrigação legal."},
      {"titulo": "6. Cookies", "texto": "Utilizamos cookies para autenticação, carrinho de compras, análise de uso e personalização. Você pode gerenciar cookies nas configurações do seu navegador."},
      {"titulo": "7. Direitos do titular", "texto": "Você pode, a qualquer momento: confirmar a existência de tratamento; acessar seus dados; corrigir dados incompletos ou desatualizados; solicitar anonimização, bloqueio ou eliminação de dados desnecessários; solicitar portabilidade; revogar consentimento; e obter informações sobre compartilhamento."},
      {"titulo": "8. Como exercer seus direitos", "texto": "Para exercer seus direitos, entre em contato com nosso Encarregado de Dados (DPO) pelo e-mail informado no topo desta página. Responderemos no prazo legal de até 15 dias."},
      {"titulo": "9. Alterações desta política", "texto": "Esta política pode ser atualizada. A versão vigente sempre estará disponível nesta página, com a data da última atualização."}
    ]
  }'::jsonb;

-- 2) Tabela de denúncias recebidas
CREATE TABLE IF NOT EXISTS public.ecommerce_denuncias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  categoria text,
  descricao text NOT NULL,
  local_ocorrencia text,
  data_ocorrencia date,
  anonimo boolean NOT NULL DEFAULT true,
  nome text,
  email text,
  telefone text,
  status text NOT NULL DEFAULT 'nova',
  resposta_interna text,
  respondido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ecommerce_denuncias TO authenticated;
GRANT INSERT ON public.ecommerce_denuncias TO anon;
GRANT ALL ON public.ecommerce_denuncias TO service_role;

ALTER TABLE public.ecommerce_denuncias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer um pode enviar denúncia"
  ON public.ecommerce_denuncias FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Autenticados podem visualizar denúncias"
  ON public.ecommerce_denuncias FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Autenticados podem atualizar denúncias"
  ON public.ecommerce_denuncias FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Autenticados podem excluir denúncias"
  ON public.ecommerce_denuncias FOR DELETE
  TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.tg_ecommerce_denuncias_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_ecommerce_denuncias_updated_at ON public.ecommerce_denuncias;
CREATE TRIGGER trg_ecommerce_denuncias_updated_at
  BEFORE UPDATE ON public.ecommerce_denuncias
  FOR EACH ROW EXECUTE FUNCTION public.tg_ecommerce_denuncias_updated_at();
