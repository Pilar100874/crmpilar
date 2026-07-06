
# Programação de Visitas a Clientes

Novo módulo dentro de **Vendas** que permite programar visitas cíclicas a clientes e verificar automaticamente se o funcionário/veículo esteve no endereço definido, usando o rastreamento já existente (veículo) ou a localização enviada pelo próprio CRM (PWA/APK) do funcionário.

Fluxo geral:

```text
[Regra de frequência]  →  [Gera visitas planejadas]
        ↓
[Job diário verifica posições]
        ↓
[Localização dentro do raio + tempo mínimo?]
   sim → marca "Realizada" (com hora, fonte, distância)
   não → mantém "Pendente" / "Não realizada"
        ↓
[Telas de acompanhamento por Usuário / Filial]
```

## 1. Telas novas

Todas em português, seguindo o padrão visual atual (tokens semânticos, dark mode).

1. **Vendas → Programação de Visitas** (`/vendas/programacao-visitas`)
   - Lista de programações (cliente, responsável, frequência, próxima visita, status).
   - Botão "Nova Programação" abre modal:
     - Cliente (busca em `customers`)
     - Endereço (auto-preenchido do cliente; permite ajustar lat/lng via Google Maps)
     - Responsável: usuário OU "toda a filial" OU "todos"
     - Frequência: `X vezes por dia | semana | mês` OU `1 vez a cada N dias`
     - Janela de horário permitida (ex.: 08:00–18:00)
     - Dias da semana permitidos
     - Data de início / fim (opcional)
     - Regra de monitoramento a aplicar (ver item 3)
     - Observação
   - Ações: editar, pausar, excluir (com `DeleteConfirmDialog`).

2. **Vendas → Acompanhamento de Visitas** (`/vendas/acompanhamento-visitas`)
   - Filtros: período, filial, usuário, cliente, status (realizada/pendente/atrasada).
   - KPIs: % de cumprimento, visitas no período, atrasadas, realizadas fora do horário.
   - Tabela por usuário/filial com drill-down por dia.
   - Mapa opcional mostrando pontos das visitas realizadas x planejadas.
   - Exportação CSV.

3. **Configurações → Regras de Monitoramento de Visita** (`/config/regras-monitoramento-visita`)
   - Regras globais e por usuário (herança: usuário > global).
   - Campos:
     - Nome
     - Escopo: global | usuário específico | filial
     - Fonte de localização: `veículo vinculado` | `celular do funcionário (CRM)` | `qualquer uma das duas`
     - Raio de aceitação (metros)
     - Tempo mínimo de permanência (minutos)
     - Exigir que o horário esteja dentro da janela definida na programação (sim/não)
     - Ativa (sim/não)

4. **Menu Vendas** (`src/components/Layout.tsx`) recebe os dois novos itens; Configurações recebe o link para Regras de Monitoramento.

## 2. Modelo de dados (Lovable Cloud)

Tabelas novas (todas com RLS por `estabelecimento_id`, GRANT para `authenticated`/`service_role`, triggers `updated_at`):

- `visita_regras_monitoramento`
  - `nome`, `escopo` (`global|usuario|filial`), `usuario_id?`, `filial_id?`
  - `fonte_localizacao` (`veiculo|celular|ambos`)
  - `raio_metros` (int), `tempo_minimo_min` (int)
  - `exigir_janela_horario` (bool), `ativa` (bool)

- `visita_programacoes`
  - `customer_id`, `endereco`, `lat`, `lng`
  - `responsavel_tipo` (`usuario|filial|todos`), `responsavel_usuario_id?`, `filial_id?`
  - `frequencia_tipo` (`dia|semana|mes|intervalo_dias`)
  - `frequencia_qtd` (int), `intervalo_dias?` (int)
  - `dias_semana` (int[] 0–6), `hora_inicio`, `hora_fim`
  - `data_inicio`, `data_fim?`
  - `regra_monitoramento_id?` (fallback: regra global)
  - `observacao`, `ativa` (bool)

- `visita_ocorrencias` (uma linha por visita esperada/executada)
  - `programacao_id`, `usuario_id?`, `data_prevista` (date), `janela_inicio`, `janela_fim`
  - `status` (`pendente|realizada|nao_realizada|fora_horario|atrasada`)
  - `verificada_em?`, `hora_chegada?`, `hora_saida?`, `duracao_min?`
  - `fonte_deteccao?` (`veiculo|celular`), `veiculo_id?`, `distancia_metros?`
  - `lat_registro?`, `lng_registro?`, `observacao_auto?`

- `usuario_posicoes` (localização do celular via CRM)
  - `usuario_id`, `lat`, `lng`, `accuracy?`, `bateria?`, `data_hora`
  - RLS: usuário grava a própria; supervisão lê da mesma filial.
  - Índices em `(usuario_id, data_hora desc)`.

Realtime habilitado em `visita_ocorrencias` para atualização ao vivo do acompanhamento.

## 3. Verificação automática (Edge Functions + Cron)

- **`gerar-visitas-planejadas`** — roda todo dia 00:05.
  Para cada programação ativa, gera as `visita_ocorrencias` do dia conforme a frequência (respeita `dias_semana`, `data_fim`, feriados básicos opcionais).

- **`verificar-visitas`** — roda a cada 15 min (e 1 hora após a janela fechar).
  Para cada ocorrência pendente do dia:
  1. Resolve a regra de monitoramento (usuário > filial > global).
  2. Se `fonte = veiculo|ambos`: procura em `veiculo_posicoes` do veículo vinculado ao usuário, pontos dentro do `raio_metros` por `tempo_minimo_min` contínuos.
  3. Se `fonte = celular|ambos`: mesma checagem em `usuario_posicoes`.
  4. Se atender → `status=realizada`, grava `fonte_deteccao`, hora chegada/saída, distância mínima.
  5. Se janela já terminou e nada bateu → `nao_realizada` (ou `fora_horario` se detectou fora da janela).

- Cron via `pg_cron` + `pg_net` chamando as functions (padrão já usado no projeto).

## 4. Envio de localização pelo CRM (PWA / APK)

- **PWA (web/mobile)**: hook `useBackgroundLocation` — ativa `navigator.geolocation.watchPosition` em background enquanto a aba está aberta e envia posições a cada 60s ao endpoint `POST /functions/v1/registrar-posicao-usuario`. Aviso claro de consentimento LGPD antes do primeiro envio.
- **APK (Capacitor)**: já existe `capacitor.config.ts` com `BackgroundRunner`. Reaproveitar o `background.js` do Pilar Rastreador para enviar posição do usuário logado (não só do veículo) a cada 15 min.
- Toggle em **Configurações → Meu Perfil** para ligar/desligar o envio de localização (obrigatório para regras que usam `celular`).

## 5. Aproveitamento do que já existe

- `veiculo_posicoes` já é populado pelo rastreador de veículos → reutilizado direto.
- `RoteirizadorVisitas.tsx` continua como está (é a tela de roteirização diária, complementa e não sobrepõe).
- `getEstabelecimentoId`, `DeleteConfirmDialog`, padrão de menus e RLS seguem os já usados no projeto.

## 6. Detalhes técnicos

- Cálculo de distância: fórmula de Haversine em SQL (função `visita_dentro_do_raio(lat,lng,lat2,lng2,raio)`).
- Índices espaciais simples via `(lat,lng,data_hora)`; não vamos adicionar PostGIS.
- Toda escrita usa `usuarios.id` resolvido a partir de `auth.uid()` (regra global do projeto).
- Todas as exclusões passam por `DeleteConfirmDialog`.
- Textos e labels 100% em português.

## Entrega em ordem

1. Migração das 4 tabelas + RLS + GRANTs + índices + função Haversine.
2. Edge Functions `gerar-visitas-planejadas` e `verificar-visitas` + cron.
3. Edge Function `registrar-posicao-usuario` + hook `useBackgroundLocation` (PWA).
4. Tela **Regras de Monitoramento**.
5. Tela **Programação de Visitas**.
6. Tela **Acompanhamento de Visitas** (com filtros, KPIs e mapa).
7. Ajuste no `background.js` do Capacitor para enviar posição do usuário.
8. Itens de menu em Vendas e Configurações.

Aprova este plano para eu começar pela migração?
