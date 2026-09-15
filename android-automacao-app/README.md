# Pilar Automação — APK Android

Aplicativo nativo leve para celular e tablet que carrega o painel de automação configurado para o usuário logado.

## Versão atual

- **1.3.0**
- Ícone no padrão visual dos apps Pilar (fundo azul-marinho, glifo branco) em todas as densidades.
- Abre a entrada com usuário e senha e, em seguida, apenas o painel definido para a pessoa.
- Pull-to-refresh, permissões de câmera/microfone e botão discreto de configuração.

## Compilação

O APK é gerado automaticamente pelo GitHub Actions em `.github/workflows/build-android-automacao.yml`.

```bash
./gradlew assembleRelease
```

A versão do `versionName` vem do arquivo `VERSION`. O `versionCode` é incrementado pelo número do workflow run.
