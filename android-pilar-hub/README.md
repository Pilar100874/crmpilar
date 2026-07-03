# Pilar Hub — Android (SMS + Ponto + Câmera de Evento)

APK único que roda 3 módulos independentes no mesmo aparelho, controlados pelo CRM.

## Módulos

| Módulo | O que faz | Peso |
|---|---|---|
| 📱 SMS Gateway | Envia SMS a partir da fila do CRM (mesma lógica do Pilar SMS anterior) | Muito baixo |
| 🕐 Ponto Coletor | Registra ponto por PIN, tira foto, captura GPS, sincroniza | Baixo |
| 📸 Câmera de Evento | Tira snapshot na batida do ponto e faz upload | Baixo (só em evento) |

Cada módulo é ligado/desligado remotamente pelo CRM (tela **Config → Dispositivos Pilar Hub**).
O aparelho consulta a config a cada heartbeat (30s) e liga/desliga o módulo sem reinstalar.

## Como compilar

1. Abra a pasta `android-pilar-hub/` no Android Studio (Giraffe+).
2. Sync Gradle. Build → **Generate Signed Bundle / APK**.
3. Instale o APK no aparelho (Android 8+).
4. Ao abrir, entre com o **Token** que aparece no CRM quando você cadastra o dispositivo (tipo = Android).
5. Conceda as permissões pedidas: SMS, Câmera, Localização, Ignorar otimização de bateria.

## Como funciona

- **Foreground Service** `PilarHubService` fica sempre ativo (notificação persistente "Pilar Hub ativo").
- A cada 30s chama `pilar-hub-heartbeat` (envia bateria/sinal/IP + recebe config atualizada).
- Quando o CRM liga/desliga um módulo, o serviço reage no próximo heartbeat.
- SMS: fila puxada do backend, envia via `SmsManager`, marca como enviado.
- Ponto: tela em kiosk, PIN → foto → GPS → POST `pilar-hub-ponto`. Fila offline se sem internet.
- Câmera de evento: dispara junto com o ponto, upload para bucket `pilar-hub-snapshots`.

## Endpoints usados

- `POST /functions/v1/pilar-hub-config` → baixa config do device
- `POST /functions/v1/pilar-hub-heartbeat` → envia saúde, recebe módulos ativos
- `POST /functions/v1/pilar-hub-ponto` → registra batida + foto base64
- (SMS reutiliza os mesmos endpoints do Pilar SMS antigo)

## Arquivos principais

```
app/src/main/
├── AndroidManifest.xml
├── java/br/com/pilar/hub/
│   ├── MainActivity.kt          # Login (token) + dashboard de módulos
│   ├── PilarHubService.kt       # Foreground service, heartbeat, orquestração
│   ├── ApiClient.kt             # HTTP para as edge functions
│   ├── sms/SmsModule.kt         # Fila SMS → SmsManager
│   ├── ponto/PontoActivity.kt   # Tela kiosk PIN + foto
│   └── camera/EventCamera.kt    # Snapshot on-demand
└── res/layout/                  # Telas
```

Este projeto é uma base pronta para compilar. Ajustes finos (tema, splash, ícone) podem ser feitos direto no Android Studio.
