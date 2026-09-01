# Roadmap

- [x] Unificar Grupo de veículo/pessoa com Unidade (unidade_id como único vínculo)
- [x] Unificar unidade SP em SP Embu e excluir SP
- [x] Relatório por unidade: entradas, saídas, visitantes e ocorrências (filtros de período e status)
- [x] Mostrar nome da unidade ativa no Portão e na TV Portaria (cor do cabeçalho dos módulos)
- [x] Sincronização automática (realtime) entre portão/TV Portaria e o relatório por unidade
- [x] Unificar Filial (ponto_filiais) com Unidade em câmeras, relógio de ponto e interfone
- [x] Tela "Portaria por Unidade": pendências
- [x] Painel único da portaria (unidade, pendências, entradas/saídas, ocorrências)
- [x] Trocar dados de exemplo do portão/TV Portaria por dados reais
- [x] Câmeras: unidades filtradas pelo estabelecimento atual
- [x] Coletor/ISO 1.9.2 com filtro por unidade (câmeras, ponto, portaria) — build no GitHub Actions
- [x] Limpar frota/transportadoras fictícias para painel e TV Portaria refletirem rota/pátio reais
- [x] Atualização remota do Coletor (botão no CRM) + botão na tela do app (Windows/Linux/ISO)
- [x] Posição real da frota (rastreador) no painel da portaria e na TV Portaria: na estrada / no pátio / sem sinal, com motorista e WhatsApp

- [x] Cadastro de usuário: WhatsApp obrigatório, e-mail opcional
- [x] Unificar permissões no Grupo de acesso: criar grupos Porteiro e Gerente, remover flags de permissões e campo Tipo, ajustar usos no sistema

- [ ] Coletor 1.9.2 no equipamento: atualização in-app não funciona (update.sh antigo) — atualizar via ISO 1.9.4 (pen drive)

- [x] Interfone: capturar a câmera integrada do iDFace pelo Coletor local, sem iframe HTTP bloqueado

## Interfone (Portaria)
- [ ] Flag "Interfone ativo" no menu principal (liga/desliga popup da campainha)
- [ ] Popup automático ao tocar a campainha com câmera do iDFace + câmeras extras + botões abrir porta/portão
- [ ] Seleção de câmeras extras nas configurações do módulo de câmeras
- [x] Conversar (áudio) com quem está no interfone pelo computador (WebRTC computador ↔ celular)

## App móvel de atendimento (Capacitor) + Coletor 1.9.7
- [x] Publicar Coletor 1.9.7 (ISO/instalador) com detecção da campainha
- [x] Confirmar que o toque na rede local dispara o popup do interfone (câmera + botões)
- [x] Coletor real cadastrado e online na Portaria (status + captura da câmera do iDFace)
- [x] URL do coletor no backend: não se aplica (o Coletor busca os comandos no CRM, o backend não chama IP local)
- [x] Push nativo (FCM) da campainha para os celulares registrados
- [ ] Gerar o APK Android (npx cap sync/add android) e testar o push no aparelho
- [ ] Publicar o app para o manifesto do Coletor 1.9.7 ficar no ar (crm.pilar.com.br/coletor/version.json ainda serve 1.9.6)
- [x] APK do interfone compilado por GitHub Actions (portaria-app + build-interfone-apk.yml) e card de download nas Configurações da Portaria
## Vehicle function task (Shelly i4 Gen3 entrada / Shelly 1 Gen3 saida + fix typecheck)

## Push nativo (Firebase) – Portaria
- [ ] Campo no CRM para colar o google-services.json (Configurações > Push nativo) + passo a passo
- [ ] Push funcionando para campainha E para chamada do ramal SIP
