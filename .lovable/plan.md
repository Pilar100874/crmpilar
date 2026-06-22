## Diagnóstico do Sistema de Controle de Ponto atual

### ✅ O que já temos
**Cadastros & Banco**
- Empresas, Filiais, Departamentos, Funcionários
- Escalas, Feriados, Regras de jornada
- Equipamentos Control iD (cadastro)
- Dispositivos autorizados, Permissões
- Rubricas Domínio

**Operação**
- Dashboard RH (básico)
- Registro via App (form básico)
- Tratamento de inconsistências
- Ajustes com aprovação
- Espelho de Ponto + Assinaturas
- Alertas (antifraude)
- Auditoria
- Exportação Domínio (TXT)
- Coletor Desktop (Electron) para puxar dados do Control iD iDClass

### ⚠️ O que está fraco / incompleto
1. **Marcação antifraude no app** — hoje só tem form simples; falta:
   - Reconhecimento facial + detecção de vida (liveness)
   - GPS + cerca virtual (geofence)
   - Validação de Wi-Fi/IP autorizado
   - Bluetooth Beacon (opcional — exige PWA/nativo)
   - QR Code dinâmico rotativo
   - Identificação de dispositivo (fingerprint)
   - Score de confiança composto da marcação
   - Assinatura criptográfica (SHA-256) do registro

2. **IA auditando padrões** — não existe; falta agente que detecte:
   - Marcações em locais improváveis
   - Padrões repetitivos suspeitos
   - Jornadas excessivas, intervalos curtos
   - Aprovações automáticas indevidas
   - Risco de fraude por funcionário

3. **Compliance automático em tempo real** — não existe:
   - Alerta de >6h sem intervalo
   - Bloqueio de escala que viola acordo coletivo
   - Limite legal de hora extra

4. **Painel gestor em tempo real** — Dashboard atual é estático; falta:
   - "Quem está trabalhando agora" ao vivo
   - Mapa das equipes (geolocalização)
   - Alertas push tipo "João há 11h trabalhando"

5. **Inteligência preditiva**:
   - Custo projetado de hora extra
   - Simulador de impacto de mudança de escala
   - Previsão de necessidade de contratação
   - Risco de passivo trabalhista por funcionário
   - Assistente IA com voz ("aprovar HE da semana")

6. **Portal do funcionário** — não existe tela dedicada:
   - Bater ponto + ver saldo BH
   - Solicitar ajuste, enviar atestado
   - Assinar espelho mensal

7. **Cálculos automáticos** — não existem edge functions para:
   - HE, banco de horas, adicional noturno, DSR, faltas, atrasos, compensações
   - Fechamento de folha (1 clique)

---

## Plano de implementação (em ondas)

Como é muito conteúdo, proponho dividir em **5 ondas** e implementar uma de cada vez (cada onda = 1 mensagem). Você confirma cada etapa antes da próxima.

### 🌊 Onda 1 — Marcação antifraude completa (Registro via App)
- Refatorar `PontoRegistro.tsx`:
  - Captura de selfie via `getUserMedia` + envio para edge function de liveness/face match
  - GPS obrigatório + validação contra geofence da filial (lat/long + raio)
  - Coleta de IP cliente + check contra `ponto_redes_autorizadas` (nova tabela)
  - Device fingerprint (canvas + UA) salvo em `ponto_dispositivos_autorizados`
  - QR Code dinâmico (rota `/ponto/qrcode` que gira a cada 15s, valida HMAC)
  - Cálculo de **score de confiança** (0-100) gravado em `ponto_registros.score_confianca`
  - Assinatura SHA-256 do registro (já temos hash, vou reforçar)
- Edge function `ponto-validar-marcacao` que recebe selfie + dados e devolve score
- Edge function `ponto-qrcode-token` que gera token rotativo
- Nova tabela `ponto_redes_autorizadas` (IP/CIDR/SSID por filial)
- Nova tabela `ponto_geofences` (lat/long/raio por filial)

### 🌊 Onda 2 — Compliance + Cálculos automáticos
- Edge function `ponto-calcular-jornada` (roda no fechamento do dia):
  - HE, banco de horas, adicional noturno, DSR, atrasos, compensações
  - Grava em `ponto_espelho_diario`
- Edge function `ponto-compliance-check` (cron a cada 10min):
  - Detecta >6h sem intervalo, jornada >10h, HE acima do limite
  - Cria registro em `ponto_alertas` + push notification
- Validação no salvamento de escala: bloqueia se violar regra do CCT

### 🌊 Onda 3 — IA antifraude + assistente
- Edge function `ponto-ia-auditoria` (cron diário) usando Lovable AI:
  - Analisa últimos 30 dias e gera alertas de padrões suspeitos por funcionário
  - Grava em `ponto_alertas` com `tipo='ia_padrao'` e justificativa
- Edge function `ponto-assistente-rh` (chat com Lovable AI):
  - Responde "quanto a empresa gastou em HE este mês"
  - Comandos: "aprovar HE da equipe X esta semana"
- Página `PontoAssistente.tsx` (chat)

### 🌊 Onda 4 — Painel gestor + Portal funcionário
- Refatorar `PontoDashboard.tsx`:
  - Cards ao vivo: presentes, atrasados, ausentes, em HE
  - Lista de alertas críticos do dia (realtime Supabase)
  - Custo projetado de folha (calculado server-side)
- Novo `PontoMapaEquipes.tsx` (mapa Leaflet com pins dos funcionários ativos)
- Novo `PontoPortalFuncionario.tsx` (acesso por funcionário):
  - Bater ponto (reusa Onda 1)
  - Saldo banco de horas, espelho, solicitar ajuste, anexar atestado
  - Assinar espelho mensal digitalmente

### 🌊 Onda 5 — Inteligência preditiva + Simulador
- `PontoInteligencia.tsx`:
  - Gráficos: custo HE por setor, absenteísmo, produtividade por turno
  - Bloco "Risco trabalhista" por funcionário (score IA)
  - Previsão de contratação ("contratar 2 reduziria HE em 25%")
- `PontoSimulador.tsx`:
  - Editor de escala hipotética → mostra impacto financeiro

---

## Observações importantes

- **Reconhecimento facial real** com liveness exige modelo dedicado. Vou usar `face-api.js` no cliente para detecção + matching contra foto de referência do funcionário; para liveness simples (piscar/virar cabeça) também em client-side. Liveness profissional (anti-deepfake) requer serviço pago — sinalizo no código onde plugar (ex: AWS Rekognition, Azure Face).
- **Beacon Bluetooth** só funciona em PWA com permissão Web Bluetooth (limitado a Chrome desktop) ou app nativo. Não vou incluir nessa primeira passada — fica como TODO.
- **Aprovação por voz**: usa Web Speech API + comando interpretado pelo assistente IA da Onda 3.
- **Auditoria imutável tipo blockchain**: vou implementar como log assinado encadeado (hash do registro anterior + atual) na `ponto_auditoria` — mesma garantia prática sem custo de blockchain real.

## Pergunta antes de começar
Aprovado o plano? Começo pela **Onda 1 (Marcação antifraude)** ou prefere outra ordem?