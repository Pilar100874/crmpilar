# Roadmap

- [x] Popup em tela cheia para "Conectar ramal" (igual ao interfone)
- [x] Cores dos campos do ramal SIP legíveis no tema escuro
- [x] Reaplicar vídeo e viva-voz com consentimento mútuo (hook + popup)
- [x] Tela de Histórico com leitura melhor no tema escuro
- [x] Mensagens de erro mais bonitas (banner inline AvisoInline)
- [x] Versão marcada v1.6.2 + interfone-version.json atualizado
- [x] Contraste de textos/fundo do APK — ajustado pelo próprio usuário
- [x] Atualização remota do APK com backup/restauração da configuração SIP
- [x] Build validado (npm run build OK)
- [x] Viva-voz/videochamada na tela de chamada SIP (PilarFone) com botoes estilo WhatsApp
- [x] Mostrar capturas de cada tela do app ao usuario

## 2026-09-02
- [x] InterfoneTile: zoom por clique + arraste (corrigidos erros TS de 'movido')
- [x] InterfonePopup: botão fechar com respiro (pb-5) e import do InterfoneTile
- [x] Typecheck OK (tsgo --noEmit)

## 2026-09-03
- [x] Unificar softphone + videochamada no Pilar Fone (popup em formato de celular)
- [x] Remover abas Softphone/Videochamada de Configurações de Atendimento
- [x] Botão fechar, borda mais fina e botões sem corte no popup
- [x] Gatilho como aba lateral (estilo chat interno), logo acima do chat
- [x] Remover aba Chat do Pilar Fone (chat volta a ser só o painel lateral próprio)
- [x] Interfone dentro do Pilar Fone web (igual ao APK): config, campainha em tempo real e InterfonePopup
- [x] Aba lateral do Pilar Fone arrastável verticalmente (posição salva no navegador)
- [x] Clicar em números no painel de chat abre a tela correspondente do telefone (WhatsApp/discador)
- [x] Renomear "Pilar Sip" para "Pilar Fone" (web e APK)
- [x] Filtros de Cadastros como ícones
- [x] Permissão por abas do Pilar Fone no cadastro de usuário (web + APK)
- [x] WhatsApp do Pilar Fone: anexar arquivos e enviar áudio
- [x] WhatsApp do Pilar Fone: separar conversas por usuário do sistema
- [x] Abas do Pilar Fone: nenhuma marcada = nenhuma disponível (antes liberava todas)
- [x] Sem abas liberadas: botão lateral do Pilar Fone não aparece na web
- [x] Remover switch "Acesso ao Interfone" do cadastro de usuários (redundante com as abas)
- [x] Tela Campainha do interfone sem rolagem (layout flex, vídeos preenchem a tela) e sem relógio no topo
- [x] Nome da câmera na parte inferior da imagem, texto preto, sem borda/fundo

## 2026-09-04
- [x] Incrementar Android TV Signage para 1.6.0 e alinhar manifesto do APK
- [x] Incrementar Pilar Fone para 1.7.6 e alinhar manifesto do APK
- [x] Confirmar conclusão das duas releases no GitHub Actions após sincronização com a branch principal

## Validação técnica F01–F16 — 2026-09-11
- [x] Etapa 1 — Segurança: F01–F05 (RLS de SMS/push por estabelecimento implantada; SQL livre revogado; teste público aprovado)
- [x] Etapa 2 — Instalação e testes: F06 e F15 (instalação congelada, tipos, lint, 80 testes e build aprovados)
- [x] Etapa 3 — Funcionamento comercial: F07–F12 (dados reais, persistência e gravação transacional de etapas implementados)
- [x] Etapa 4 — Escala e usabilidade: F13, F14 e F16 (paginação/busca, detalhes sob demanda, recuperação de módulos e estados acessíveis)
- [ ] Homologação com usuário comum e administrador em dois estabelecimentos
- [x] Persistência somente de leitura após recarga e nova sessão
- [ ] Envio real de SMS/push com destinatários de homologação
- [ ] Revisar separadamente 131 alertas legados do verificador do banco, fora dos F01–F16

## Padronização dos APKs — 2026-09-13
- [x] Padronizar todos os ícones Android nas cores e moldura do Pilar Fone, mantendo um símbolo central próprio por aplicativo
- [x] Permitir ativação/login vertical no Pilar Remotas em celulares e tablets, preservando o modo horizontal da TV
- [x] Criar login próprio e isolado no Pilar Automação após a chave da empresa
- [x] Abrir somente o painel de Automação do usuário, sem menus, chat, fone ou botão de fala
- [x] Incrementar versões; validação local concluída, e a compilação assinada permanece no fluxo automático por falta do Android SDK neste ambiente

## Menu de Apps responsivo — 2026-09-13
- [x] Criar menu lateral do módulo Apps seguindo o padrão da tela Listas
- [x] Integrar Downloads e Versões dos Aplicativos no mesmo módulo
- [x] Ajustar as duas telas para tablet e celular
- [x] Validar navegação e apresentação nos três tamanhos de tela

## Central de atualizações remotas — 2026-09-13
- [x] Criar fila multiempresa para atualização remota de celulares
- [x] Centralizar versões, equipamentos e disparos no novo menu Atualizações
- [x] Integrar recebimento remoto no Pilar SMS e Pilar Hub
- [x] Redirecionar a antiga tela de versões e atualizar menu/busca por voz
- [ ] Validar tela em computador, tablet e celular

## Versão instalada e atualização dentro dos apps — 2026-09-13
- [x] Remover a aba Publicações; a central usa os mesmos manifestos da tela de Apps
- [x] Comando remoto de celular passa a guardar o link do pacote direto (sem depender de uploads)
- [x] Remotas: painel oculto (segurar Voltar 5s) com versão instalada, atualização e saída; tela de pareamento também mostra versão e botão de atualização
- [x] Automação: botão de atualização passa a exibir a versão instalada
- [x] Pilar Fone, Hub, SMS e Coletor já exibiam versão e botão de atualização
- [x] Hub 1.6.0 e SMS 1.11.0; Remotas e Automação sobem versão automaticamente na compilação
- [ ] Compilar os APKs assinados no fluxo automático (GitHub Actions) — este ambiente não tem o SDK Android

## Correções visuais e Pilar Controle — 2026-09-14
- [x] Reenquadrar e validar visualmente o ícone do Pilar SMS no padrão Pilar Fone
- [x] Padronizar login nativo e ícone do Pilar Automação; substituir WebView por painel nativo do ambiente definido
- [x] Renomear APK Pilar Hub para Pilar Controle, mantendo apenas Automação e Relógio de Ponto
- [x] Remover câmera e SMS somente do APK Pilar Controle; preservar Windows e ISO completos
- [x] Atualizar download, manifesto e atualização remota para Pilar Controle
- [x] Validar ícones renderizados antes da geração dos APKs
- [x] Validar código web e registrar pendência de compilação assinada no fluxo automático
- [ ] Confirmar a compilação assinada dos três APKs no GitHub Actions (Java/Android SDK indisponíveis localmente)
- [x] Padronizar o ícone do Pilar Remotas na mesma família visual e área segura adaptativa do Pilar Fone

## Isolamento multiempresa do Coletor — 2026-09-14
- [x] Exigir a chave ativa nas consultas de filiais e equipamentos do Coletor Windows/Linux/ISO
- [x] Resolver o estabelecimento no servidor exclusivamente pela chave validada
- [x] Filtrar filiais, equipamentos e atualizações de estado pelo estabelecimento vinculado
- [x] Publicar as funções protegidas e validar bloqueios para chave ausente ou inválida
- [ ] Homologar com duas chaves reais de estabelecimentos distintos

## Confiabilidade da Central de Atualizações — 2026-09-14
- [x] Corrigir conflito do commit automático do manifesto Pilar Automação
- [x] Exibir somente aplicativos e equipamentos com atualização remota real
- [x] Integrar Pilar Automação à fila remota com confirmação e versão instalada
- [x] Fortalecer confirmação periódica do Pilar Controle
- [x] Preservar e validar configurações existentes após cada atualização
- [x] Autenticar comandos e confirmações do Coletor por estabelecimento
- [x] Implementar expiração e mensagens de erro dos comandos
- [ ] Homologar atualização assinada em equipamentos reais de dois estabelecimentos

## Visualização de Apps no computador e tablet — 2026-09-14
- [x] Exibir navegação lateral compacta no tablet e completa no computador
- [x] Melhorar aproveitamento horizontal dos downloads e instruções
- [x] Organizar resumo, filtros e equipamentos da Central de Atualizações
- [x] Validar as duas telas no computador e tablet sem cortes ou sobreposições

## Links de download dos aplicativos — 2026-09-14
- [x] Conferir os links atuais de APK, Windows, Linux e ISO
- [x] Corrigir o download quebrado do Coletor Linux
- [x] Alinhar os links alternativos às versões atuais publicadas
- [x] Validar novamente todos os downloads após as correções

## Ícone do Pilar Automação — 2026-09-14
- [x] Remover a variação temática que podia exibir o ícone com fundo branco
- [x] Usar uma única camada adaptativa centralizada sobre o fundo azul-marinho
- [x] Avançar a versão para 1.6.1 e forçar uma nova compilação do APK

## Acesso às chaves dos aplicativos — 2026-09-14
- [x] Exibir navegação própria dentro da área de Automação
- [x] Manter Chaves do Aplicativo visível em computador e tablet
- [x] Preservar o destaque da tela atual e as rotas existentes

## Mover Chaves do Aplicativo para Apps — 2026-09-14
- [x] Adicionar Chaves do Aplicativo à navegação de Apps.
- [x] Remover Chaves do Aplicativo da navegação interna de Automação.
- [x] Validar o acesso em computador e tablet.

## Pilar Remotas vertical e ícone — 2026-09-14
- [x] Substituir o ícone adaptativo e o cartão da Android TV pelo padrão Pilar centralizado.
- [x] Criar telas verticais próprias para abertura, pareamento e leitura do QR Code.
- [x] Permitir que a exibição acompanhe a orientação vertical do equipamento.
- [x] Avançar a versão para 1.8.2 e validar recursos e navegação web.
- [ ] Confirmar a compilação assinada e instalar em um equipamento vertical real.

## Ativação do Pilar Fone por chave — 2026-09-14
- [x] Adicionar Pilar Fone aos programas disponíveis em Chaves do Aplicativo.
- [x] Validar e vincular a chave do Pilar Fone ao estabelecimento no servidor.
- [x] Exigir ativação por chave antes do login no APK Pilar Fone.
- [x] Preservar chave, login e configurações do ramal nas atualizações.
- [x] Avançar a versão para 1.8.1 e validar o fluxo web.
- [ ] Confirmar a compilação assinada e instalar em um aparelho real.

## Ajuste da área Apps para tablet — 2026-09-14
- [x] Substituir a faixa lateral estreita por navegação horizontal no tablet.
- [x] Melhorar larguras e espaçamentos dos downloads em telas médias.
- [x] Reorganizar filtros, ações e equipamentos da Central de Atualizações.
- [x] Ajustar formulário e cartões de chaves para tablet.
- [x] Validar as três telas em tablet vertical e horizontal sem cortes.

## Compilação do Pilar Fone e ícones dos APKs — 2026-09-14
- [x] Remover a dependência de Bun do comando de compilação usado pelo Pilar Fone.
- [x] Aplicar a mesma faixa laranja aos cinco ícones dos APKs.
- [x] Avançar as versões dos cinco aplicativos para gerar atualizações reconhecidas.
- [x] Validar dimensões, centralização, cores e arquivos dos ícones.
- [ ] Confirmar os cinco APKs assinados no fluxo automático e instalar em aparelhos reais.

## Entradas nativas e ícones proporcionais — 2026-09-14
- [x] Padronizar as entradas de Automação e Controle com o cartão nativo do Pilar Fone.
- [x] Criar ativação nativa por chave para o Pilar SMS sem apagar SIM, retentativas ou demais configurações.
- [x] Vincular chaves SMS a dispositivos do estabelecimento e entregar o token somente na ativação válida.
- [x] Adicionar Pilar SMS à tela Apps → Chaves do Aplicativo.
- [x] Normalizar símbolos, área segura e faixa laranja de SMS, Automação, Controle e Remotas pela proporção do Fone.
- [x] Remover as referências adaptativas antigas do ícone do Pilar Remotas.
- [x] Avançar SMS para 1.13.0, Automação para 1.7.0, Controle para 2.2.0 e Remotas para 1.8.3.
- [x] Validar build web, função publicada, XMLs e 60 imagens de ícone.
- [ ] Confirmar os quatro APKs assinados no GitHub Actions e instalar em aparelhos reais (Java/Android SDK indisponíveis localmente).

## Entradas finais e ícones fornecidos — 2026-09-14
- [x] Igualar as telas de ativação do Pilar SMS e Pilar Controle à composição do Pilar Fone.
- [x] Unificar chave, e-mail e senha em uma única entrada nativa do Pilar Automação.
- [x] Abrir automaticamente o painel de celular ou tablet definido no cadastro do usuário.
- [x] Aplicar diretamente aos cinco APKs os ícones da imagem final fornecida, sem redesenhar os símbolos.
- [x] Remover referências ao login separado do Automação e ao desenho antigo do Remotas.
- [x] Avançar as versões de Fone, SMS, Automação, Controle e Remotas.
- [ ] Confirmar os cinco APKs assinados no fluxo automático e instalar em aparelhos reais.

## Correção visual após teste nos aparelhos — 2026-09-14
- [x] Refazer Automação, Controle, SMS e Remotas com símbolos brancos sólidos no estilo do Pilar Fone.
- [x] Remover o modo monocromático adaptativo que deixava os quatro ícones com aparência de contorno.
- [x] Centralizar horizontal e verticalmente as entradas nativas de Automação, Controle e SMS.
- [x] Refazer a entrada do Pilar Remotas com a mesma paleta azul-marinho, cartão escuro e ações laranja.
- [x] Avançar as versões dos quatro APKs corrigidos.
- [ ] Confirmar os quatro APKs assinados no fluxo automático e instalar em aparelhos reais.

## Ícone fornecido para o Pilar SMS — 2026-09-14
- [x] Aplicar sem redesenho o ícone fornecido ao Pilar SMS.
- [x] Gerar os tamanhos comum, redondo e adaptativo do Android.
- [x] Avançar o Pilar SMS para 1.14.3.
- [ ] Confirmar a compilação assinada e instalar no aparelho real.

## Ícone fornecido para o Pilar Automação — 2026-09-14
- [x] Aplicar sem redesenho o ícone fornecido ao Pilar Automação.
- [x] Gerar os tamanhos comum, redondo e adaptativo do Android.
- [x] Avançar o Pilar Automação para 1.8.2.
- [ ] Confirmar a compilação assinada e instalar no aparelho real.

## Ícone fornecido para o Pilar Remotas — 2026-09-14
- [x] Aplicar sem redesenho o ícone fornecido ao Pilar Remotas.
- [x] Gerar os tamanhos comum, redondo e adaptativo do Android.
- [x] Avançar o Pilar Remotas para 1.8.7.
- [ ] Confirmar a compilação assinada e instalar no aparelho real.

## Ícone fornecido para o Pilar Fone — 2026-09-14
- [x] Aplicar sem redesenho o ícone fornecido ao Pilar Fone.
- [x] Preparar os arquivos comum e adaptativo usados na geração Android.
- [x] Avançar o Pilar Fone para 1.8.3.
- [ ] Confirmar a compilação assinada e instalar no aparelho real.
