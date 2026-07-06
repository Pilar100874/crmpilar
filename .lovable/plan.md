
# Extensão do Módulo de Visitas

Duas evoluções em cima do que já foi entregue:

**A. Modo "Visita Espontânea"** — sem programação prévia. O sistema detecta sozinho quando um funcionário chegou em um cliente (via localização do celular ou do veículo) e registra automaticamente.

**B. Formulários de pós-visita** — construtor de formulários no próprio CRM, com regra de qual formulário cada funcionário/filial/tipo de cliente deve preencher ao encerrar a visita.

Além dessas duas, sugestões extras no fim que você aprova ou descarta.

---

## A. Visita Espontânea (auto-detecção)

Objetivo: não precisar cadastrar visita nenhuma. Se o funcionário parar no endereço de um cliente por X minutos → o sistema cria a ocorrência de visita sozinho.

Como funciona:

```text
[Posição chega]  →  [Match com endereço de cliente < raio]
        ↓
[Ficou parado ≥ tempo mínimo?]
        sim ↓
[Cria visita_ocorrencias com origem=espontanea]
        ↓
[Notifica funcionário: "Registrar visita?" + link do formulário]
        ↓
[Ao sair da área: fecha hora_saida e duração]
```

Regras:
- Nova aba na tela **Regras de Monitoramento**: "Detectar visitas espontâneas" (on/off, raio, tempo mínimo, janela de horário permitida, ignorar endereços do próprio funcionário/filial).
- Cliente considerado "visitável" se tiver `lat/lng` (usa o geocoding automático que já existe).
- Se já existir uma programação pra aquele cliente/dia → conta como cumprimento dela (não duplica).
- Notificação push no CRM avisando o funcionário que a visita foi detectada e pedindo pra preencher o formulário.

## B. Formulários pós-visita

Construtor simples de formulários, no estilo do `DynamicProductFields` que já existe no projeto.

Telas novas:

1. **Configurações → Formulários de Visita** (`/config/formularios-visita`)
   - Listar / criar / editar / duplicar formulários.
   - Campos suportados: texto curto, texto longo, número, sim/não, seleção única, seleção múltipla, data, hora, nota (0–10), foto (upload), assinatura (canvas), localização (auto).
   - Cada campo: rótulo, obrigatório, ordem, condicional ("mostrar se X = Y").
   - Preview do formulário.

2. **Configurações → Regras de Formulário** (`/config/regras-formulario-visita`)
   - Diz qual formulário aparece em qual visita. Escopo em ordem de precedência:
     1. Funcionário específico
     2. Filial
     3. Segmento/tipo do cliente
     4. Global (padrão)
   - Campo "obrigatório para encerrar a visita" (bloqueia fechamento sem preencher).

3. **Preenchimento** — botão "Encerrar visita" em **Acompanhamento de Visitas** e no push da visita espontânea abre um `Sheet` com o formulário resolvido pelas regras. Salva vinculado à `visita_ocorrencias`.

4. **Acompanhamento** ganha coluna "Formulário" com status: `pendente | preenchido | não aplicável` e link pra ver as respostas.

---

## Modelo de dados novo

- `visita_formularios` — `nome`, `descricao`, `ativo`, `estabelecimento_id`.
- `visita_formulario_campos` — `formulario_id`, `tipo`, `rotulo`, `chave`, `obrigatorio`, `ordem`, `opcoes` (jsonb), `condicional` (jsonb).
- `visita_formulario_regras` — `formulario_id`, `escopo` (`usuario|filial|segmento|global`), `usuario_id?`, `filial_id?`, `segmento_id?`, `obrigatorio_encerrar` (bool), `prioridade` (int).
- `visita_formulario_respostas` — `ocorrencia_id`, `formulario_id`, `respostas` (jsonb), `preenchido_em`, `preenchido_por`, `lat/lng`, `anexos` (jsonb).

Extensão em `visita_ocorrencias`:
- `origem` (`programada|espontanea`)
- `formulario_id?` resolvido no momento da detecção
- `formulario_status` (`nao_aplicavel|pendente|preenchido`)

RLS por `estabelecimento_id`, GRANTs pra `authenticated`/`service_role`, seguindo o padrão do projeto.

## Backend / automação

- Nova edge function **`detectar-visitas-espontaneas`** (cron a cada 5 min): varre `usuario_posicoes` e `veiculo_posicoes` recentes, cruza com clientes que têm `lat/lng`, aplica regra de raio+tempo, cria/atualiza `visita_ocorrencias` com `origem=espontanea`.
- Ajuste em **`verificar-visitas`**: quando fecha uma ocorrência, resolve `formulario_id` pelas regras e marca `formulario_status`.
- Nova edge function **`resolver-formulario-visita`**: dado `ocorrencia_id`, devolve o formulário aplicável (usada pelo front ao abrir o preenchimento).
- Push/notificação ao funcionário quando visita espontânea é criada e quando formulário fica pendente > 1h após sair do local.

## Reaproveitamento
- `usuario_posicoes`, `veiculo_posicoes`, `visita_haversine_metros`, `useBackgroundLocation`, `DeleteConfirmDialog`, padrão de menus e RLS já existentes.
- Componente de renderização de campos segue o mesmo estilo do `DynamicProductFields`.

## Ordem de entrega

1. Migração: novas tabelas + colunas em `visita_ocorrencias` + RLS + GRANTs.
2. Edge functions: `detectar-visitas-espontaneas`, `resolver-formulario-visita`; ajuste em `verificar-visitas`.
3. Tela **Formulários de Visita** (construtor + preview).
4. Tela **Regras de Formulário**.
5. Aba "Visitas Espontâneas" nas Regras de Monitoramento.
6. Encerramento de visita com formulário no **Acompanhamento** + coluna de status.
7. Notificações (push CRM) de visita detectada e formulário pendente.

---

## Sugestões extras (opcionais — me diz quais entram)

1. **Check-in / check-out manual** — botão no app pro funcionário abrir a visita mesmo antes da auto-detecção (útil quando GPS falha).
2. **Assinatura do cliente** no formulário (canvas) + envio automático de PDF por e-mail pro cliente ao encerrar.
3. **Motivo de "não realizada"** — se passar do horário sem detecção, pedir justificativa (dropdown: cliente ausente, trânsito, remarcado, etc.).
4. **Alerta ao supervisor** em tempo real quando um funcionário fica > N min sem enviar posição ou pula uma visita obrigatória.
5. **Heatmap** de visitas por região/filial na tela de Acompanhamento.
6. **Meta de visitas por funcionário** (dia/semana/mês) com barra de progresso no dashboard.
7. **Integração com o Funil de Vendas** — encerrar visita move o deal do cliente pra próxima etapa, ou cria tarefa de follow-up automática.

Aprova o escopo A + B e me diz quais extras entram nesta leva?
