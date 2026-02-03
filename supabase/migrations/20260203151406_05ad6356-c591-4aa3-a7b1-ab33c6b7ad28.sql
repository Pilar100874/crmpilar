-- Dropar policies existentes e recriar com abordagem mais robusta
DROP POLICY IF EXISTS "Usuários podem ver config do seu estabelecimento" ON public.envio_massa_config;
DROP POLICY IF EXISTS "Usuários podem criar config do seu estabelecimento" ON public.envio_massa_config;
DROP POLICY IF EXISTS "Usuários podem inserir config do seu estabelecimento" ON public.envio_massa_config;
DROP POLICY IF EXISTS "Usuários podem atualizar config do seu estabelecimento" ON public.envio_massa_config;
DROP POLICY IF EXISTS "Usuários podem deletar config do seu estabelecimento" ON public.envio_massa_config;

-- Recriar policies usando user_in_estabelecimento que é mais robusta
CREATE POLICY "Usuários podem ver config do seu estabelecimento"
ON public.envio_massa_config
FOR SELECT
USING (user_in_estabelecimento(estabelecimento_id));

CREATE POLICY "Usuários podem criar config do seu estabelecimento"
ON public.envio_massa_config
FOR INSERT
WITH CHECK (user_in_estabelecimento(estabelecimento_id));

CREATE POLICY "Usuários podem atualizar config do seu estabelecimento"
ON public.envio_massa_config
FOR UPDATE
USING (user_in_estabelecimento(estabelecimento_id));

CREATE POLICY "Usuários podem deletar config do seu estabelecimento"
ON public.envio_massa_config
FOR DELETE
USING (user_in_estabelecimento(estabelecimento_id));