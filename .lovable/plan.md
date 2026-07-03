
# Plano: Pilar Hub (Android) + Pilar Cam (Windows)

Vou entregar **dois aplicativos** que se conversam pelo mesmo backend do CRM.

---

## 1. Pilar Hub — APK Android único (evolução do Pilar SMS v1.2)

Um só APK com **3 módulos independentes** que o próprio usuário liga/desliga pela tela de configuração.

### Módulos

| Módulo | O que faz | Peso no celular |
|---|---|---|
| 📱 **SMS Gateway** | O que já existe hoje (fila `sms_queue` + polling) | Muito baixo |
| 🕐 **Ponto Coletor** | Bate ponto por PIN/QR/NFC, tira foto do funcionário no momento, envia geoloc, funciona offline (fila local) e sincroniza | Baixo |
| 📸 **Câmera de Evento** | Tira snapshot quando bate ponto ou quando o backend pedir (não faz streaming), sobe pro Storage | Baixo |

### Tela principal (nova)
Header Pilar + 3 cards de status (SMS / Ponto / Câmera) — cada card mostra:
- Switch liga/desliga
- Bolinha de status (verde ativo, cinza desligado, vermelho erro)
- Contadores rápidos (SMS enviados hoje, pontos batidos hoje, últimas fotos)

### Tela de configurações (menu ⚙️)
- **Geral**: token do estabelecimento, servidor, intervalo de polling
- **SMS**: (já existe)
- **Ponto**: modo (PIN / QR / NFC), exigir foto, exigir GPS, cerca virtual (lat/long + raio), câmera frontal/traseira
- **Câmera**: qualidade do snapshot, salvar cópia local, apagar após X dias

### Backend (Lovable Cloud)
Tabelas novas / edge functions:
- `ponto_registros` → já existe, usar
- `ponto_dispositivo_config` (token, módulos ativos, cerca virtual)
- `ponto_snapshots` (URL storage + registro_id)
- Edge function `ponto-registrar` (recebe batida + foto base64 → storage → grava)
- Edge function `pilar-hub-config` (celular baixa configuração)
- Bucket `pilar-hub-snapshots`

### Tela no CRM (nova)
`/logistica → Pilar Hub` ou `/ponto → Dispositivos Coletores`:
- Lista de celulares aprovados
- Ver últimas batidas + fotos
- Ativar/desativar módulos remotamente
- Ver saúde (última conexão, bateria, versão do app)

---

## 2. Pilar Cam — App desktop Windows (Electron) para streaming contínuo

App leve pra rodar num PC velho de portaria/escritório, fazendo o trabalho pesado que não cabe no celular.

### O que faz
- Conecta em **N câmeras IP RTSP/ONVIF** (as que já estão em `cv_cameras`)
- Mostra grid ao vivo (2x2, 3x3, 4x4)
- Grava contínuo em disco local com rotação (7/15/30 dias)
- Recorta clipes quando o CRM pede (ex: "quero os 30s ao redor de tal evento")
- Detecção de movimento por câmera → cria evento no CRM
- Sobe apenas eventos/clipes pro Storage (não streaming inteiro — economiza banda)

### Configuração
- Login com o token do estabelecimento
- Escolhe quais câmeras da lista puxar
- Escolhe pasta de gravação e limite de disco
- Auto-start com Windows

### Empacotamento
- Electron + `@electron/packager` → gera `.zip` pra Windows (instalador via zip por enquanto)
- Player usa `ffmpeg` embutido (RTSP → HLS local)
- Comunica com o backend via as mesmas edge functions

---

## Ordem de entrega proposta (em fases)

**Fase 1 — Backend compartilhado** (rápido)
- Tabela `pilar_hub_dispositivos` (módulos ativos, tipo Android/Windows, saúde)
- Edge functions `pilar-hub-config` (GET config) e `pilar-hub-heartbeat` (POST status)
- Tela CRM básica listando dispositivos

**Fase 2 — Pilar Hub Android (evolução do APK atual)**
- Adicionar tela de módulos com switches
- Adicionar módulo Ponto (bater ponto + foto + geoloc + fila offline)
- Manter SMS funcionando exatamente como está
- Compilar APK v1.3.0

**Fase 3 — Pilar Cam Windows**
- App Electron com grid de câmeras RTSP
- Gravação local + upload de eventos
- Empacotamento `.zip` pra Windows

---

## Guardrails / riscos

- **Não** vou tocar no fluxo SMS que já funciona — só empacoto ele como "módulo" dentro do Hub.
- **Não** vou fazer o celular tentar streaming contínuo de câmera IP (isso vai pro Windows).
- Se um módulo quebrar, os outros continuam funcionando (serviços independentes).
- Toggle no CRM = mudança na config baixada pelo celular no próximo heartbeat (30s).

---

## Perguntas pra confirmar antes de começar

1. **Ponto Coletor**: pode ficar em quem bate por **PIN** (mais simples) na v1, e depois adicionamos QR/NFC/facial? Ou já quer QR desde o começo?
2. **Câmera do celular**: você quer usar pra tirar foto no ponto **do funcionário** (frontal), foto **do que ele viu** (traseira), ou as duas opções configuráveis?
3. **Pilar Cam Windows**: prefere começar já com **gravação contínua + eventos**, ou versão inicial só com **visualização ao vivo + snapshots sob demanda** (menos complexa)?
4. Posso começar pela **Fase 1 (backend)** agora?
