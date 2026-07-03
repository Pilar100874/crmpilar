# Pilar SMS — App Android Nativo (Kotlin)

App Android nativo que roda um servidor HTTP local no celular e envia SMS usando o chip do aparelho via `SmsManager`. Feito para ser o gateway próprio do CRM Pilar.

## Como funciona

1. Você instala o app no Android que terá o chip com plano de SMS.
2. Configura no app: **Token de acesso** (Bearer) e **Porta HTTP** (padrão `8080`).
3. Toca em **Iniciar servidor**. O app mostra o IP local (ex.: `http://192.168.0.15:8080`).
4. No CRM, tela **Configurações → SMS → Pilar SMS (App próprio)**, informa:
   - **Endpoint**: `http://IP_DO_CELULAR:8080/send`
   - **Token**: o mesmo Bearer configurado no app
   - **SIM/Sender**: opcional (índice do chip: `0` ou `1` em dual‑SIM)

## Protocolo HTTP

```
POST /send
Authorization: Bearer <TOKEN>
Content-Type: application/json

{ "to": "+5511999999999", "message": "Texto", "sender": "0" }
```

Resposta:
```json
{ "ok": true, "id": "uuid-local", "sim": 0 }
```

Erros: `401` (token inválido), `400` (payload inválido), `500` (falha no envio).

Health-check: `GET /health` → `{ "ok": true, "version": "1.0.0" }`

## Como compilar

Requisitos: **Android Studio Hedgehog+** (JDK 17), Android SDK 34.

```bash
cd pilar-sms-app
./gradlew assembleRelease
```

APK gerado em `app/build/outputs/apk/release/app-release-unsigned.apk`.
Para instalar durante o desenvolvimento use `./gradlew installDebug` com o celular em modo desenvolvedor + depuração USB.

## Permissões usadas

- `SEND_SMS` — envio pelo `SmsManager`
- `INTERNET` / `ACCESS_NETWORK_STATE` — servidor HTTP na rede local
- `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_DATA_SYNC` — manter o servidor rodando com a tela apagada
- `POST_NOTIFICATIONS` (Android 13+) — notificação persistente do serviço
- `WAKE_LOCK` — evitar sleep enquanto envia

## Dicas de operação

- Deixe o celular **conectado à mesma rede Wi‑Fi** do servidor que consome a API (ou exponha via VPN/tunnel).
- Reserve **IP fixo por DHCP** para o Android no roteador — o endpoint precisa ser estável.
- Desative otimização de bateria para o app (Ajustes → Bateria → Sem restrições).
- Use um chip com plano ilimitado de SMS. Operadoras podem bloquear volumes altos — respeite o limite comercial.
- Para expor fora da LAN sem abrir portas, use um túnel (Cloudflare Tunnel, Tailscale Funnel, ngrok).

## Estrutura

```
pilar-sms-app/
├── app/
│   ├── build.gradle.kts
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/br/com/pilar/sms/
│       │   ├── MainActivity.kt        # UI de configuração
│       │   ├── SmsHttpService.kt      # Foreground service + servidor HTTP
│       │   └── SmsSender.kt           # Wrapper sobre SmsManager
│       └── res/…                       # Layouts, strings, ícones
├── build.gradle.kts
├── settings.gradle.kts
└── gradle.properties
```
