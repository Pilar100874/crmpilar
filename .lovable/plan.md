# Pilar Automação com o painel da web e o novo Pilar Coletor

## 1. Pilar Automação — painel igual ao da web

- Trocar a tela montada dentro do aplicativo pelo próprio painel do site, exibido em tela cheia, sem barras do navegador.
- Entra pelo endereço `/automacao/app`, que já é a tela "Meu painel" usada no computador, com assistente de voz, chat e Pilar Fone ocultos.
- A chave da empresa e o login continuam como estão hoje; a sessão já validada é reaproveitada, então o painel abre direto, sem pedir senha de novo.
- Rodapé discreto mantém "Atualizar painel", "Atualizar aplicativo" e "Sair".
- Sem internet ou com falha de carregamento, mostra aviso em português com botão "Tentar de novo".
- Versão do aplicativo avança para 1.9.0.

## 2. Pilar Controle vira Pilar Coletor

Renomear o aplicativo (nome no aparelho, textos, notificações, página de download, manifesto de versão) de "Pilar Controle" para "Pilar Coletor", mantendo a identificação interna do pacote para que quem já tem o aplicativo receba a atualização por cima.

O conteúdo atual (botões de registro de ponto) sai. No lugar entra a função de coletor, igual à do computador, com duas frentes rodando em segundo plano:

**Relógios de ponto na rede local**
- Busca a lista de relógios da empresa no servidor.
- Conversa com cada relógio Control iD na rede (login e leitura das marcações no formato oficial), guardando o último registro lido para não repetir.
- Envia as marcações ao servidor e informa se cada relógio está online, offline ou com erro.

**Dispositivos de automação na rede local**
- Registra o aparelho como coletor da unidade e recebe a lista de dispositivos.
- Busca os comandos pendentes (ligar, desligar, pulso, status), executa direto no equipamento da rede local e devolve o resultado ao servidor.
- Assim os botões do painel de automação passam a funcionar por este aparelho.

**Tela do aplicativo**
- Uma tela única: situação do coletor (ligado/desligado), unidade escolhida, hora da última sincronização, quantidade de marcações enviadas e de comandos executados.
- Lista dos relógios e dos dispositivos com situação de cada um.
- Botões: iniciar/parar, sincronizar agora, atualizar aplicativo e sair.
- O coletor segue rodando com a tela apagada (aviso permanente na barra de notificações) e volta sozinho quando o aparelho é ligado.
- Versão avança para 3.0.0.

## Detalhes técnicos

- Automação: `MainActivity` passa a hospedar um `WebView` (JavaScript, DOM storage, cookies) que abre `${APP_BASE_URL}/automacao/app?app=automacao`; a sessão Supabase salva em `Prefs` é injetada no `localStorage` na chave `sb-<ref>-auth-token` antes da navegação; links externos abrem no navegador.
- Coletor: novo pacote de classes em `br.com.pilar.hub` — `ColetorService` (foreground service, ciclo de 60 s), `ControlIdClient` (login.fcgi / get_afd.fcgi, parser AFD 671), `PontoSync` (`ponto-coletor-bootstrap` e `ponto-coletor-ingest`), `AutomacaoColetor` (`portaria-coletor` com `provisionar`/`handshake`/`jobs`/`resultado` e execução HTTP Shelly na LAN), `ColetorPrefs` (NSR por equipamento, unidade, token do dispositivo).
- Permissões adicionadas: `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_DATA_SYNC`, `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`, `ACCESS_NETWORK_STATE`; tráfego HTTP em claro liberado só para faixas de rede local via `network_security_config`.
- `PainelNativo.kt` e as chamadas de registro de ponto do Controle são removidos.
- Atualização de `strings.xml`, `README`, `VERSION`, `public/coletor/hub-version.json`, workflow `build-pilar-hub.yml` e telas de download em Admin → Apps para o nome Pilar Coletor.

## Validação

- Conferir XMLs, typecheck e build do site.
- Revisar as telas de download e o manifesto com o novo nome.
- Compilação assinada segue pelo fluxo automático; teste nos relógios e dispositivos reais depende dos aparelhos na rede do cliente.
