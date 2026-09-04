# Atualizar e publicar APKs

## Entregas
- Incrementar a versão do Android TV Signage e alinhar seu manifesto de download.
- Incrementar a versão do Pilar Fone e atualizar o manifesto exibido na tela de Apps.
- Disparar as duas automações de compilação e acompanhar até a publicação das releases.
- Confirmar os links finais dos APKs para instalação.

## Detalhes técnicos
- Android TV Signage: avançar a linha de versão para `1.6.x`, preservando o `versionCode` automático do CI e a release rolling `android-tv-signage-latest`.
- Pilar Fone: avançar de `1.7.5` para `1.7.6`, mantendo `portaria-app/VERSION`, a versão embarcada e o manifesto sincronizados.
- Validar o projeto e verificar o resultado das duas execuções no GitHub Actions antes de concluir.
