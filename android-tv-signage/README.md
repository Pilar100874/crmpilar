# Pilar TV Signage — Aplicativo Android TV / Google TV

App nativo Kotlin para dispositivos **Android TV** e **Google TV** que consome as edge functions `tv-device-*` da plataforma Pilar TV Signage.

## Fluxo

1. Ao abrir pela primeira vez, o app mostra a tela de **Pareamento**: o admin cadastra a TV em *TV Signage → Dispositivos → Novo* e recebe um **código de 8 caracteres** e um **token**. Insira ambos na TV.
2. O app chama `POST /tv-device-auth` e recebe um `session_jwt`. Guarda em `SharedPreferences`.
3. Consulta `GET /tv-device-config` para descobrir qual dashboard/playlist exibir.
4. Renderiza a URL/rota interna dentro de um **WebView em fullscreen** com hardware acceleration.
5. Em paralelo:
   - Envia **heartbeat** a cada 30s (`POST /tv-device-heartbeat`) com CPU, RAM, uptime, IP, resolução, versão.
   - Faz **polling** de comandos pendentes a cada 10s (`GET /tv-device-commands`) — reiniciar app, limpar cache, trocar dashboard, bloquear, etc.
   - Confirma cada comando executado (`POST /tv-device-command-confirm`).
6. Se `playlist` estiver definida, roda em loop respeitando `duracao_segundos` de cada item.
7. Reinicia automaticamente com o boot do device (`BOOT_COMPLETED`).

## Configuração

Ajuste em `app/build.gradle.kts`:
- `SUPABASE_URL` → `https://ioxugupvxlcdweldocmq.supabase.co`
- `SUPABASE_ANON_KEY` → chave anon já preenchida
- `applicationId` = `br.com.pilar.tvsignage`

## Build

```bash
cd android-tv-signage
./gradlew assembleRelease
# APK: app/build/outputs/apk/release/app-release.apk
```

Instale via ADB:
```bash
adb connect <ip-da-tv>:5555
adb install app/build/outputs/apk/release/app-release.apk
```

Ou publique como APK sideload em qualquer Android TV (Fire TV, Chromecast com Google TV, TV Box).

## Requisitos

- Android TV 7.0+ (API 24+)
- Conexão de internet permanente
- Recomendado: modo kiosk / Device Owner via `adb shell dpm set-device-owner` para bloquear saída do app
