-- Adicionar política de leitura pública para veículos (para uso no watch/rastreamento)
CREATE POLICY "Veículos leitura pública para watch" 
ON public.veiculos 
FOR SELECT 
USING (true);

-- Também permitir leitura pública de posições de veículos
CREATE POLICY "Posições leitura pública para watch" 
ON public.veiculo_posicoes 
FOR SELECT 
USING (true);