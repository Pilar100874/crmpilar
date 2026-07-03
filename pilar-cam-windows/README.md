# Pilar Cam — Windows (streaming contínuo de câmeras IP)

App desktop Electron para monitorar câmeras RTSP/ONVIF 24/7, gravar em disco local e enviar eventos para o CRM. Complementa o **Pilar Hub Android** (que faz apenas snapshots de evento).

## O que faz

- Grid de câmeras (2x2, 3x3, 4x4) com preview ao vivo via RTSP/ONVIF.
- Gravação contínua local com rotação (7 / 15 / 30 dias).
- Detecção de movimento (opcional) que dispara evento no CRM.
- Clip on-demand: CRM pede um clipe de X segundos ao redor de um horário.
- Snapshot on-demand: CRM pede uma foto agora.
- Envia heartbeat a cada 30s para `pilar-hub-heartbeat` (tipo=`windows`).

## Como compilar / rodar

```
cd pilar-cam-windows
npm install
npm run dev        # rodar em desenvolvimento
npm run build:win  # gerar .exe portable e instalador
```

O binário sai em `release/`. Para produção, envie o `.exe` para os operadores das lojas.

## Primeiro uso

1. Abra o app → cole o **Token do dispositivo** (mesmo esquema do Pilar Hub, tipo=`windows`).
2. Cadastre suas câmeras (URL RTSP, usuário, senha).
3. Escolha o grid e a política de retenção.
4. Deixe rodando. O CRM controla os módulos remotamente.

## Requisitos

- Windows 10/11 x64
- ffmpeg embutido (baixado no primeiro run ou empacotado)
- Espaço em disco proporcional à retenção (~30GB por câmera 1080p / 7 dias)

## Estrutura

```
pilar-cam-windows/
├── package.json
├── electron/main.cjs       # Processo principal Electron
├── electron/recorder.cjs   # Wrapper ffmpeg (grava + rotaciona)
├── src/index.html          # UI grid
├── src/renderer.js         # Preview + controle
└── src/styles.css
```
