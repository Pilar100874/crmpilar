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

## Build local

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

## Build automático via GitHub Actions

O repositório possui um workflow em `.github/workflows/build-android-tv-signage.yml` (na raiz do repositório) que compila e assina o APK automaticamente:

- **Disparo automático**: a cada push para `main` ou `master` que altere arquivos dentro de `android-tv-signage/`.
- **Disparo manual**: ação `workflow_dispatch` com campo opcional `release_tag`.
- **Artefato**: o APK assinado fica disponível em **Actions → Build Android TV Signage APK → Artefatos** (`app-release-apk`).
- **Release**: ao rodar manualmente e informar uma tag (ex: `v1.2.3`), o workflow cria uma GitHub Release anexando o APK.

### Assinatura do APK

Por padrão o workflow usa o **debug keystore** do Android. Para gerar um APK de produção assinado com sua própria chave, configure estes secrets no repositório GitHub (`Settings → Secrets and variables → Actions`):

| Secret | Descrição |
|--------|-----------|
| `ANDROID_SIGNING_KEY` | Conte64 do arquivo `.jks` de assinatura |
| `ANDROID_KEY_ALIAS` | alias da chave no keystore |
| `ANDROID_KEY_STORE_PASSWORD` | senha do keystore |
| `ANDROID_KEY_PASSWORD` | senha da chave |

Para gerar a base64 do keystore:
```bash
base64 -w 0 minha-chave.jks
```

## Requisitos

- Android TV 7.0+ (API 24+)
- Conexão de internet permanente
- Recomendado: modo kiosk / Device Owner via `adb shell dpm set-device-owner` para bloquear saída do app

## TV Box HK1 K8S (Android 13 / Rockchip RK3528), Android TV e tablets

Suporte nativo implementado (v1.3.0):

- `MainActivity` como entrada única com `LAUNCHER` + `LEANBACK_LAUNCHER` (sem depender de touchscreen; navegação por controle remoto).
- `BootReceiver` nativo (`directBootAware`, `enabled`, `exported`) escutando `BOOT_COMPLETED`, `LOCKED_BOOT_COMPLETED`, `QUICKBOOT_POWERON` (e variante HTC) — aguarda ~8s e abre a `MainActivity` com `FLAG_ACTIVITY_NEW_TASK | CLEAR_TOP | SINGLE_TOP`. Nenhum serviço de mídia é iniciado no boot.
- Permissão `android.permission.RECEIVE_BOOT_COMPLETED`.
- Tela sempre ligada (`FLAG_KEEP_SCREEN_ON`) e modo imersivo (esconde status/navigation bar quando o firmware permite).
- Reconexão automática: `ConnectivityManager.NetworkCallback` + retry a cada 15s recarrega config e WebView quando a internet volta.
- Tablets/celulares: activities com `resizeableActivity`, `sensorLandscape` e `configChanges` amplos.

### Variantes de build (flavors)

| Flavor | Comando | APK | Home/Launcher padrão |
|---|---|---|---|
| normal | `./gradlew assembleNormalRelease` | `app-release.apk` | não |
| kiosk  | `./gradlew assembleKioskRelease`  | `app-kiosk-release.apk` | sim (`MAIN` + `HOME` + `DEFAULT`) |

Na versão kiosk, após instalar: Configurações → Apps → Apps padrão → App de início → **Pilar Remotas**.

### Validação do BootReceiver (LOCKED_BOOT_COMPLETED / QUICKBOOT_POWERON)

Comportamento implementado:

- Aceita `BOOT_COMPLETED`, `LOCKED_BOOT_COMPLETED`, `QUICKBOOT_POWERON` (+ variante HTC) e `REBOOT`.
- Loga action, uptime, `UserManager.isUserUnlocked`, `KeyguardManager.isKeyguardLocked`, SDK e modelo.
- Agenda a abertura da `MainActivity` em **8s** (janela alvo 5–10s).
- Em direct boot (`LOCKED_BOOT_COMPLETED`), se o `startActivity` for bloqueado antes do desbloqueio, há **retry com backoff** (4s, 8s, 12s — até 4 tentativas).
- **Anti-duplicidade**: quando chegam `LOCKED_BOOT_COMPLETED` e depois `BOOT_COMPLETED`, só o primeiro agenda a abertura (janela de 60s).
- A `MainActivity` loga origem do boot, action, número da tentativa e se o device já está pareado.

Fluxo de teste via ADB:

```bash
adb connect <ip-da-tv>:5555
adb logcat -c
adb logcat -s PilarBootReceiver PilarMainActivity &

# 1) Direct boot (antes do desbloqueio)
adb shell am broadcast -a android.intent.action.LOCKED_BOOT_COMPLETED -n br.com.pilar.tvsignage/.BootReceiver

# 2) Boot rápido de TV Box
adb shell am broadcast -a android.intent.action.QUICKBOOT_POWERON -n br.com.pilar.tvsignage/.BootReceiver

# 3) Boot normal
adb shell am broadcast -a android.intent.action.BOOT_COMPLETED -n br.com.pilar.tvsignage/.BootReceiver

# 4) Reboot real do aparelho
adb reboot
```

Critério de aceite: dentro de 5–10s após o broadcast deve aparecer no logcat
`MainActivity aberta na tentativa N` seguido de `onCreate fromBoot=true`, e a activity em foco deve ser a do app:

```bash
adb shell dumpsys activity activities | grep -m1 ResumedActivity
# esperado: br.com.pilar.tvsignage/.MainActivity (ou SignageActivity/PairingActivity logo em seguida)
```

Se o teste 1 (direct boot) registrar `startActivity falhou`, o retry deve abrir automaticamente após o desbloqueio — verifique a linha `MainActivity aberta na tentativa 2/3/4`.

### Dados do APK release assinado

- **package name:** `br.com.pilar.tvsignage`
- **MainActivity:** `br.com.pilar.tvsignage.MainActivity`
- **versão atual:** gerada automaticamente pelo CI — consulte `public/apps/android-tv-signage-latest.json`
- **último build disponível:** v1.5.35 / versionCode 53 (commit `d0538509`, 2026-08-18 19:41 UTC)
- **assinatura:** keystore `pilar-release.keystore` (alias `pilar`, V1/V2/V3)


<!-- build: rebuild solicitado em 2026-08-18T19:47:00Z (recuperação contínua do player de vídeo + retomada automática sem reiniciar equipamento) -->
