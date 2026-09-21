import { useState, useEffect, useCallback, useRef } from 'react';
import { UserAgent, Registerer, RegistererState, Inviter, Session, SessionState, Web } from 'sip.js';
import { useToast } from '@/hooks/use-toast';
import { registrarPresencaSip, removerPresencaSip } from '@/lib/telefonia/presencaSip';
import { iniciarToqueChamando, pararToqueChamando } from '@/lib/telefonia/toqueChamada';
import { iniciarToqueEntrada, pararToqueEntrada } from '@/lib/telefonia/toqueEntrada';
import { chamadaPareceDiscador, limparChamadaDiscador } from '@/lib/telefonia/discadorMarker';
import { extrairDesafio, calcularCabecalhoAuth } from '@/lib/telefonia/digestSip';
import { sanitizarSdp } from '@/lib/telefonia/sdpSanitizar';

/** Fábrica padrão do SIP.js com limpeza do SDP recebido do PABX. */
const fabricaSdhPadrao = Web.defaultSessionDescriptionHandlerFactory();
const criarSdhComSdpLimpo: typeof fabricaSdhPadrao = (session, options) => {
  const sdh = fabricaSdhPadrao(session, options) as Web.SessionDescriptionHandler;
  const originalSetDescription = sdh.setDescription.bind(sdh);
  sdh.setDescription = (sdp, opcoes, modificadores) =>
    originalSetDescription(sanitizarSdp(sdp), opcoes, modificadores);
  return sdh;
};

interface SipConfig {
  server: string;
  serverPort?: string;
  remoteServer?: string;
  remoteServerPort?: string;
  extension: string;
  /** Usuário de autenticação SIP (quando diferente do número do ramal). */
  authUser?: string;
  password: string;
  displayName?: string;
}

interface CallSession {
  id: string;
  session: Session;
  phoneNumber: string;
  direction: 'inbound' | 'outbound';
  state: SessionState;
  startTime: Date;
  /** Chamada originada pelo discador (click-to-call): ao atender, o PABX disca o cliente. */
  viaDiscador?: boolean;
}

/** Remove apenas a formatação visual; códigos SIP digitados pelo usuário continuam intactos. */
const normalizarNumeroDiscagem = (phoneNumber: string) =>
  phoneNumber.trim().replace(/[\s().-]/g, '');

export const useSipConnection = () => {
  const { toast } = useToast();
  const [userAgent, setUserAgent] = useState<UserAgent | null>(null);
  const [registerer, setRegisterer] = useState<Registerer | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [activeCalls, setActiveCalls] = useState<CallSession[]>([]);
  /** Ramal em uso, para informar aos outros usuários que ele está online. */
  const ramalPresencaRef = useRef<string>('');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localVideoStream, setLocalVideoStream] = useState<MediaStream | null>(null);
  const [vivaVoz, setVivaVoz] = useState(false);
  const [mudo, setMudo] = useState(false);
  const [remoteAudio] = useState(() => {
    const audio = new Audio();
    audio.autoplay = true;
    return audio;
  });

  const obterPeerConnection = (session: Session): RTCPeerConnection | null => {
    const sdh = session.sessionDescriptionHandler as { peerConnection?: RTCPeerConnection } | undefined;
    return sdh?.peerConnection ?? null;
  };

  const aplicarVivaVoz = useCallback(async (ativo: boolean) => {
    const destino = ativo ? "speaker" : "";
    try {
      const el = remoteAudio as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> };
      if (typeof el.setSinkId === "function") await el.setSinkId(destino);
    } catch {
      // Nem todo aparelho/navegador permite escolher a saída; mantemos o estado mesmo assim.
    }
    remoteAudio.volume = 1.0;
    remoteAudio.muted = false;
  }, [remoteAudio]);

  /** Viva-voz é um controle local imediato (como no WhatsApp), não depende da outra ponta. */
  const toggleVivaVoz = useCallback(async () => {
    const proximo = !vivaVoz;
    setVivaVoz(proximo);
    await aplicarVivaVoz(proximo);
  }, [vivaVoz, aplicarVivaVoz]);

  /** Silencia/dessilencia o microfone de todas as chamadas ativas. */
  const toggleMudo = useCallback(() => {
    const proximo = !mudo;
    activeCalls.forEach((c) => {
      const pc = obterPeerConnection(c.session);
      pc?.getSenders().forEach((s) => {
        if (s.track?.kind === "audio") s.track.enabled = !proximo;
      });
    });
    setMudo(proximo);
  }, [mudo, activeCalls]);

  /** Liga/desliga a câmera no meio da chamada (a outra ponta precisa aceitar o vídeo). */
  const toggleCamera = useCallback(async (callId: string) => {
    const call = activeCalls.find((c) => c.id === callId);
    if (!call) return;
    const pc = obterPeerConnection(call.session);
    if (!pc) return;

    if (localVideoStream) {
      localVideoStream.getTracks().forEach((t) => {
        t.stop();
        const sender = pc.getSenders().find((s) => s.track === t);
        if (sender) pc.removeTrack(sender);
      });
      setLocalVideoStream(null);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      stream.getVideoTracks().forEach((t) => pc.addTrack(t, stream));
      setLocalVideoStream(stream);
      // Tenta renegociar para a outra ponta receber o vídeo.
      const sessao = call.session as Session & { reinvite?: () => Promise<void> };
      if (typeof sessao.reinvite === "function") {
        try { await sessao.reinvite(); } catch { /* melhor esforço */ }
      }
      toast({ title: "Câmera ligada", description: "Aguarde a outra ponta aceitar o vídeo." });
    } catch {
      toast({
        title: "Câmera indisponível",
        description: "Permita o acesso à câmera para chamadas com vídeo.",
        variant: "destructive",
      });
    }
  }, [activeCalls, localVideoStream, toast]);

  /**
   * Monta as URLs de WebSocket a testar.
   * Aceita "192.168.0.10", "pabx.empresa.com:8089" ou "wss://pabx.empresa.com:8089/ws".
   */
  const montarUrlsWs = (server: string): { urls: string[]; host: string } => {
    const bruto = server.trim();
    if (/^wss?:\/\//i.test(bruto)) {
      const u = new URL(bruto);
      return { urls: [bruto], host: u.hostname };
    }
    const [host, porta] = bruto.split(":");
    const p = porta || "8089";
    const paginaSegura = typeof window !== "undefined" && window.location.protocol === "https:";
    const urls = [`wss://${host}:${p}/ws`];
    // Navegador em HTTPS bloqueia ws:// (mixed content); só tentamos texto puro em HTTP.
    if (!paginaSegura) urls.push(`ws://${host}:${p}/ws`);
    return { urls, host };
  };

  /** Reconexão automática: a queda do WebSocket não deve derrubar o ramal de vez. */
  const registererRef = useRef<Registerer | null>(null);
  /** Credenciais em uso, para responder ao desafio de senha (401/407) ao discar. */
  const configRef = useRef<SipConfig | null>(null);
  const reconexaoRef = useRef<{ timer?: number; tentativas: number }>({ tentativas: 0 });
  const keepAliveRef = useRef<number | undefined>(undefined);
  const ouvintesSaudeRef = useRef<(() => void) | undefined>(undefined);

  const agendarReconexao = useCallback((ua: UserAgent) => {
    const estado = reconexaoRef.current;
    if (estado.timer) return;
    estado.tentativas += 1;
    const espera = Math.min(30000, 3000 * estado.tentativas);
    estado.timer = window.setTimeout(() => {
      estado.timer = undefined;
      ua.reconnect()
        .then(async () => {
          estado.tentativas = 0;
          try { await registererRef.current?.register(); } catch { /* o registro tenta de novo no próximo ciclo */ }
        })
        .catch(() => agendarReconexao(ua));
    }, espera);
  }, []);

  // Conecta ao servidor externo do UCM (único endereço usado pelo sistema).
  const tryConnect = useCallback(async (server: string, extension: string, password: string, displayName: string, authUser?: string) => {
    console.log('🌐 Conectando ao UCM externo:', server);

    const { urls: wsServers, host } = montarUrlsWs(server);

    const sipUri = `sip:${extension}@${host}`;
    console.log('SIP URI:', sipUri, 'WS:', wsServers);

    let ultimoErro: unknown = null;

    for (const wsUrl of wsServers) {
      let uaCriado: UserAgent | null = null;
      const ua = new UserAgent({
        uri: UserAgent.makeURI(sipUri),
        transportOptions: {
          server: wsUrl,
          connectionTimeout: 8,
          // Ping nativo do SIP.js: mantém o caminho aberto no roteador/provedor.
          keepAliveInterval: 20,
          keepAliveDebounce: 5,
        },
        authorizationUsername: (authUser || '').trim() || extension,
        authorizationPassword: password,
        displayName: displayName || extension,
        sessionDescriptionHandlerFactory: criarSdhComSdpLimpo,
        sessionDescriptionHandlerFactoryOptions: {
          constraints: {
            audio: true,
            video: true,
          },
        },
        delegate: {
          onInvite: (invitation) => {
            console.log('📞 Chamada recebida:', invitation.remoteIdentity.uri.user);
            handleIncomingCall(invitation);
          },
          onConnect: () => {
            console.log('✅ WebSocket conectado:', wsUrl);
            reconexaoRef.current.tentativas = 0;
          },
          onDisconnect: (error) => {
            console.warn('⚠️ WebSocket desconectado, tentando reconectar:', error);
            setIsRegistered(false);
            if (uaCriado) agendarReconexao(uaCriado);
          },
        },
      });
      uaCriado = ua;

      try {
        await ua.start();
        return { ua, server: wsUrl, host };
      } catch (erro) {
        ultimoErro = erro;
        console.warn('⚠️ Falhou em', wsUrl, erro);
        try { await ua.stop(); } catch { /* ignore */ }
      }
    }

    throw ultimoErro instanceof Error
      ? ultimoErro
      : new Error(`WebSocket indisponível em ${wsServers.join(' e ')}`);
  }, [agendarReconexao]);


  // Connect and register to UCM
  const connect = useCallback(async (config: SipConfig) => {
    // Sem ramal, senha ou servidor não há telefonia: não tenta conectar nem mostra avisos de erro.
    if (!config.extension?.trim() || !config.password?.trim() || !config.server?.trim()) {
      console.log('ℹ️ Telefonia não configurada (ramal ausente): conexão SIP ignorada.');
      configRef.current = null;
      setIsConnecting(false);
      setIsRegistered(false);
      return;
    }
    ramalPresencaRef.current = config.extension.trim();

    const comPorta = (host: string, porta?: string) => {
      const h = host.trim();
      if (!h) return h;
      if (/^wss?:\/\//i.test(h) || h.includes(':')) return h;
      return `${h}:${porta || '8089'}`;
    };

    // O UCM é sempre acessado pelo endereço externo (IP fixo/domínio).
    const servidorExterno = comPorta(config.server, config.serverPort);

    try {
      setIsConnecting(true);
      console.log('=== INICIANDO CONEXÃO SOFTPHONE ===');
      console.log('Servidor externo do UCM:', servidorExterno);
      console.log('Ramal:', config.extension);

      const result = await tryConnect(
        servidorExterno,
        config.extension,
        config.password,
        config.displayName || config.extension,
        config.authUser,
      );
      const ua = result.ua;
      const connectedServer = result.server;

      // Registro curto (2 min): renova sozinho e mantém o caminho aberto no roteador/NAT.
      // Registro curto (2 min) renovado na metade do tempo: mantém o ramal vivo mesmo com NAT agressivo.
      const reg = new Registerer(ua, { expires: 120, refreshFrequency: 50 });
      registererRef.current = reg;

      reg.stateChange.addListener((state) => {
        console.log('📊 Estado do registro mudou:', state);
        setIsRegistered(state === RegistererState.Registered);

        if (state === RegistererState.Registered) {
          console.log('✅ RAMAL REGISTRADO COM SUCESSO!');
          toast({
            title: "Conectado",
            description: `Ramal ${config.extension} registrado (${connectedServer})`,
          });
        } else if (state === RegistererState.Unregistered) {
          console.log('⚠️ Ramal não registrado');
        }
      });

      console.log('Enviando REGISTER...');
      await reg.register();
      console.log('Registro iniciado, aguardando resposta do UCM...');

      // Vigia a saúde da conexão: reconecta e re-registra sozinho quando o caminho cai.
      const verificarSaude = () => {
        const transporte = ua.transport as unknown as { isConnected?: () => boolean };
        try {
          if (transporte.isConnected?.() === false) {
            agendarReconexao(ua);
            return;
          }
          if (registererRef.current?.state !== RegistererState.Registered) {
            void registererRef.current?.register().catch(() => agendarReconexao(ua));
          }
        } catch {
          agendarReconexao(ua);
        }
      };

      if (keepAliveRef.current) clearInterval(keepAliveRef.current);
      keepAliveRef.current = window.setInterval(verificarSaude, 20000);

      // Ao voltar a internet ou a aba ficar visível, confere na hora (timers ficam lentos em segundo plano).
      const aoVoltar = () => verificarSaude();
      window.addEventListener('online', aoVoltar);
      window.addEventListener('focus', aoVoltar);
      document.addEventListener('visibilitychange', aoVoltar);
      ouvintesSaudeRef.current?.();
      ouvintesSaudeRef.current = () => {
        window.removeEventListener('online', aoVoltar);
        window.removeEventListener('focus', aoVoltar);
        document.removeEventListener('visibilitychange', aoVoltar);
      };

      setUserAgent(ua);
      setRegisterer(reg);


    } catch (error) {
      console.error('❌ ERRO NA CONEXÃO:', error);

      const host = servidorExterno.replace(/^wss?:\/\//i, '').split('/')[0].split(':')[0];
      const porta = (config.serverPort || '8089').trim() || '8089';

      let errorMsg = "Erro ao conectar ao UCM";
      if (error instanceof Error) {
        errorMsg = error.message;

        if (/WebSocket|indisponível|Transport|timeout/i.test(error.message)) {
          errorMsg = `Sem resposta em wss://${host}:${porta}/ws. Verifique se a porta ${porta} está liberada no UCM externo e abra https://${host}:${porta}/ws no navegador uma vez para aceitar o certificado.`;
        } else if (error.message.includes('401') || error.message.includes('403')) {
          errorMsg = "Credenciais inválidas. Verifique o ramal e senha.";
        }
      }

      toast({
        title: "Erro de conexão",
        description: errorMsg,
        variant: "destructive",
      });

    } finally {
      setIsConnecting(false);
    }
  }, [toast, tryConnect]);

  // Handle incoming call
  const handleIncomingCall = useCallback((session: Session) => {
    const origem = session.remoteIdentity.uri.user || 'Desconhecido';
    console.log('📞 Chamada recebida de:', origem);

    // Ligação do discador (click-to-call): o PABX toca o ramal usando ele mesmo
    // como chamador, ou há um disparo recente registrado pelo chat.
    const viaDiscador = chamadaPareceDiscador(origem, ramalPresencaRef.current);

    const callSession: CallSession = {
      id: crypto.randomUUID(),
      session,
      phoneNumber: origem,
      direction: 'inbound',
      state: session.state,
      startTime: new Date(),
      viaDiscador,
    };

    // Campainha: toque diferenciado para chamadas do discador.
    iniciarToqueEntrada(viaDiscador ? 'discador' : 'padrao');

    setActiveCalls(prev => [
      ...prev.filter(c => c.session.state !== SessionState.Terminated && c.state !== SessionState.Terminated),
      callSession,
    ]);

    // Setup session state change handler
    session.stateChange.addListener(async (state) => {
      console.log('📊 Estado da chamada recebida mudou:', state);
      setActiveCalls(prev => 
        prev.map(call => 
          call.id === callSession.id 
            ? { ...call, state } 
            : call
        )
      );

      if (state === SessionState.Established) {
        console.log('✅ Chamada recebida estabelecida');
        pararToqueEntrada();
        if (callSession.viaDiscador) limparChamadaDiscador();
        await setupRemoteMedia(session);
      } else if (state === SessionState.Terminated) {
        console.log('❌ Chamada recebida encerrada');
        pararToqueEntrada();
        // Remove chamada encerrada após delay
        setTimeout(() => {
          setActiveCalls(prev => prev.filter(call => call.id !== callSession.id));
        }, 500);
      }
    });

    toast({
      title: callSession.viaDiscador ? "Ligação do discador" : "Chamada recebida",
      description: callSession.viaDiscador
        ? "Atenda para o PABX discar o cliente"
        : `De: ${callSession.phoneNumber}`,
    });
  }, [toast]);

  // Make outbound call (pode já iniciar em vídeo e/ou viva-voz, como no WhatsApp)
  const dial = useCallback(async (phoneNumber: string, opcoes?: { video?: boolean; vivaVoz?: boolean }) => {
    if (!userAgent || !isRegistered) {
      toast({
        title: "Erro",
        description: "Ramal não está registrado",
        variant: "destructive",
      });
      return;
    }

    try {
      // Envia exatamente o número digitado, removendo apenas espaços e pontuação visual.
      // O UCM aplica a rota de saída; acrescentar "#" muda o destino e pode encerrar a chamada.
      const dialNumber = normalizarNumeroDiscagem(phoneNumber);
      if (!dialNumber) throw new Error('Informe um número válido');
      
      // Codifica # somente quando ele tiver sido digitado intencionalmente.
      const sipUserPart = dialNumber.replace(/#/g, '%23');
      const sipUri = `sip:${sipUserPart}@${userAgent.configuration.uri?.host}`;
      console.log('📞 URI SIP sendo usada:', sipUri);
      console.log('📞 Número original:', phoneNumber);
      console.log('📞 Número normalizado:', dialNumber);
      console.log('📞 Ramal origem:', userAgent.configuration.uri?.user);
      
      const target = UserAgent.makeURI(sipUri);
      if (!target) {
        throw new Error('URI inválida');
      }

      const inviter = new Inviter(userAgent, target);
      
      const callSession: CallSession = {
        id: crypto.randomUUID(),
        session: inviter,
        phoneNumber,
        direction: 'outbound',
        state: inviter.state,
        startTime: new Date(),
      };

      // Remove chamadas já encerradas que possam ter ficado presas na lista,
      // senão a tela mostra a chamada antiga ("Em conversa") em vez da nova.
      setActiveCalls(prev => [
        ...prev.filter(c => c.session.state !== SessionState.Terminated && c.state !== SessionState.Terminated),
        callSession,
      ]);

      if (opcoes?.vivaVoz) {
        setVivaVoz(true);
        void aplicarVivaVoz(true);
      }

      // Setup session state change handler
      inviter.stateChange.addListener(async (state) => {
        console.log('Estado da chamada mudou:', state);
        setActiveCalls(prev => 
          prev.map(call => 
            call.id === callSession.id 
              ? { ...call, state } 
              : call
          )
        );

        if (state === SessionState.Established) {
          pararToqueChamando();
          console.log('🎤 Configurando mídia para chamada estabelecida...');
          await setupRemoteMedia(inviter);
          if (opcoes?.video) {
            const sdh = inviter.sessionDescriptionHandler as { localMediaStream?: MediaStream } | undefined;
            if (sdh?.localMediaStream?.getVideoTracks().length) {
              setLocalVideoStream(sdh.localMediaStream);
            }
          }
          toast({
            title: "Chamada conectada",
            description: `Conectado com ${phoneNumber}`,
          });
        } else if (state === SessionState.Terminated) {
          pararToqueChamando();
          // Remove da lista após um pequeno delay para garantir que a UI atualize
          setTimeout(() => {
            setActiveCalls(prev => prev.filter(call => call.id !== callSession.id));
          }, 500);
          toast({
            title: "Chamada encerrada",
            description: `Chamada com ${phoneNumber} finalizada`,
          });
        }
      });

      // Toque de "chamando" na caixa de som enquanto a outra ponta não atende.
      iniciarToqueChamando();

      await inviter.invite({
        sessionDescriptionHandlerOptions: {
          constraints: {
            audio: true,
            video: !!opcoes?.video,
          },
        },
        requestDelegate: {
          onReject: async (response) => {
            pararToqueChamando();
            console.error('❌ Chamada rejeitada:', response.message.statusCode, response.message.reasonPhrase);
            console.error('❌ Headers da resposta:', response.message.headers);
            // O Pilar Fone disca direto, como um telefone comum: se o PABX recusar,
            // apenas informamos o motivo (a discagem sequencial pelo PABX fica
            // exclusiva do discador da tela de chat).
            let errorMsg = response.message.reasonPhrase;
            let dica = "Verifique as permissões do ramal e as rotas de saída no PABX.";


            // Mensagens mais amigáveis para códigos comuns
            switch (response.message.statusCode) {
              case 401:
              case 407:
                errorMsg = "Senha do ramal recusada pelo PABX";
                dica = "Confira a senha SIP no cadastro do usuário; se o PABX usa um usuário de autenticação diferente do número do ramal, preencha o campo de usuário SIP.";
                break;
              case 403:
                errorMsg = "Ligação não autorizada para este ramal";
                dica = "No PABX, libere chamadas externas para este ramal (privilégio de saída) e confira a rota de saída.";
                break;
              case 404:
                errorMsg = "Número não encontrado";
                dica = "Confira o número discado e o prefixo da rota de saída.";
                break;
              case 480:
                errorMsg = "Número temporariamente indisponível";
                break;
              case 486:
                errorMsg = "Ocupado";
                dica = "A outra pessoa está em outra ligação.";
                break;
              case 487:
                errorMsg = "Chamada cancelada";
                dica = "A chamada foi encerrada antes de ser atendida.";
                break;
              case 603:
                errorMsg = "Chamada recusada";
                dica = "A outra pessoa recusou a ligação.";
                break;
            }

            toast({
              title: "Falha na chamada",
              description: `${errorMsg}. ${dica}`,
              variant: "destructive",
            });
            setTimeout(() => {
              setActiveCalls(prev => prev.filter(call => call.id !== callSession.id));
            }, 500);
          },
          onAccept: (response) => {
            pararToqueChamando();
            console.log('✅ Chamada aceita pelo outro lado');
            console.log('📊 Headers da resposta:', response.message.headers);
            console.log('📊 SDP remoto:', response.message.body);
          },
          onProgress: (response) => {
            console.log('📊 Progresso da chamada:', response.message.statusCode, response.message.reasonPhrase);
            if (response.message.body) {
              console.log('📊 SDP early media:', response.message.body);
            }
          },
        },
      });
      
      toast({
        title: "Discando",
        description: `Chamando ${phoneNumber}`,
      });

    } catch (error) {
      pararToqueChamando();
      console.error('Erro ao discar:', error);
      toast({
        title: "Erro ao discar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  }, [userAgent, isRegistered, toast]);

  // Setup remote media stream
  const setupRemoteMedia = async (session: Session) => {
    try {
      console.log('🎤 Iniciando configuração de mídia...');
      
      const sessionDescriptionHandler = session.sessionDescriptionHandler;
      if (!sessionDescriptionHandler) {
        console.error('❌ Nenhum session description handler');
        return;
      }

      const peerConnection = (sessionDescriptionHandler as any).peerConnection;
      if (!peerConnection) {
        console.error('❌ Nenhuma peer connection');
        return;
      }

      console.log('📊 Estado da conexão:', peerConnection.connectionState);
      console.log('📊 Estado ICE:', peerConnection.iceConnectionState);

      // Aguarda a conexão ICE se necessário
      if (peerConnection.iceConnectionState === 'checking' || peerConnection.iceConnectionState === 'new') {
        console.log('⏳ Aguardando conexão ICE...');
        await new Promise<void>((resolve) => {
          const checkConnection = () => {
            console.log('🔍 Estado ICE atual:', peerConnection.iceConnectionState);
            if (peerConnection.iceConnectionState === 'connected' || peerConnection.iceConnectionState === 'completed') {
              peerConnection.removeEventListener('iceconnectionstatechange', checkConnection);
              resolve();
            }
          };
          peerConnection.addEventListener('iceconnectionstatechange', checkConnection);
          // Timeout de segurança
          setTimeout(() => {
            peerConnection.removeEventListener('iceconnectionstatechange', checkConnection);
            resolve();
          }, 5000);
        });
      }

      console.log('✅ Conexão ICE estabelecida');

      // Configura o stream remoto
      const remoteStream = new MediaStream();
      const receivers = peerConnection.getReceivers();
      console.log(`📡 Encontrados ${receivers.length} receivers`);
      
      receivers.forEach((receiver: RTCRtpReceiver) => {
        if (receiver.track) {
          console.log(`✅ Adicionando track remoto: ${receiver.track.kind}, enabled: ${receiver.track.enabled}, muted: ${receiver.track.muted}`);
          remoteStream.addTrack(receiver.track);
        }
      });

      if (remoteStream.getTracks().length > 0) {
        remoteAudio.srcObject = remoteStream;
        setRemoteStream(remoteStream);
        remoteAudio.volume = 1.0;
        console.log('✅ Stream remoto configurado, iniciando reprodução...');
        
        try {
          await remoteAudio.play();
          console.log('✅ Áudio remoto reproduzindo');
        } catch (playError) {
          console.error('❌ Erro ao reproduzir áudio:', playError);
          toast({
            title: "Erro de áudio",
            description: "Clique na tela para permitir reprodução de áudio",
            variant: "destructive",
          });
        }
      } else {
        console.error('❌ Nenhum track remoto disponível');
      }
    } catch (error) {
      console.error('❌ Erro ao configurar mídia:', error);
      toast({
        title: "Erro de mídia",
        description: "Falha ao configurar áudio da chamada",
        variant: "destructive",
      });
    }
  };

  // Hangup call
  const hangup = useCallback(async (callId: string) => {
    const call = activeCalls.find(c => c.id === callId);
    if (!call) return;

    pararToqueChamando();

    try {
      // Para chamadas de saída em progresso, use reject
      if (call.direction === 'outbound' && 
          (call.session.state === SessionState.Initial || 
           call.session.state === SessionState.Establishing)) {
        await (call.session as Inviter).cancel();
      } 
      // Para chamadas de entrada não atendidas, use reject
      else if (call.direction === 'inbound' && 
               call.session.state !== SessionState.Established) {
        await (call.session as any).reject();
      }
      // Para chamadas estabelecidas, use bye
      else {
        await call.session.bye();
      }

      setActiveCalls(prev => prev.filter(c => c.id !== callId));
      setRemoteStream(null);
      localVideoStream?.getTracks().forEach((t) => t.stop());
      setLocalVideoStream(null);
      setVivaVoz(false);
      setMudo(false);

      toast({
        title: "Chamada encerrada",
      });
    } catch (error) {
      console.error('Erro ao desligar:', error);
    }
  }, [activeCalls, localVideoStream, toast]);

  // Answer incoming call (pode atender já com vídeo/viva-voz)
  const answer = useCallback(async (callId: string, opcoes?: { video?: boolean; vivaVoz?: boolean }) => {
    const call = activeCalls.find(c => c.id === callId);
    if (!call || call.direction !== 'inbound') return;

    try {
      await (call.session as any).accept({
        sessionDescriptionHandlerOptions: {
          constraints: { audio: true, video: !!opcoes?.video },
        },
      });
      if (opcoes?.vivaVoz) {
        setVivaVoz(true);
        void aplicarVivaVoz(true);
      }
      if (opcoes?.video) {
        const sdh = call.session.sessionDescriptionHandler as { localMediaStream?: MediaStream } | undefined;
        if (sdh?.localMediaStream?.getVideoTracks().length) {
          setLocalVideoStream(sdh.localMediaStream);
        }
      }
      toast({
        title: "Chamada atendida",
      });
    } catch (error) {
      console.error('Erro ao atender:', error);
      toast({
        title: "Erro ao atender",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  }, [activeCalls, aplicarVivaVoz, toast]);

  // Disconnect
  const disconnect = useCallback(async () => {
    const tinhaConexaoSip = Boolean(userAgent || registerer || isRegistered || activeCalls.length > 0);
    // Desconexão pedida pelo usuário: cancela qualquer reconexão automática pendente.
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = undefined;
    }
    ouvintesSaudeRef.current?.();
    ouvintesSaudeRef.current = undefined;
    pararToqueEntrada();
    if (reconexaoRef.current.timer) {
      clearTimeout(reconexaoRef.current.timer);
      reconexaoRef.current.timer = undefined;
    }
    reconexaoRef.current.tentativas = 0;
    registererRef.current = null;
    try {
      // Hangup all active calls
      for (const call of activeCalls) {
        try {
          await call.session.bye();
        } catch (error) {
          console.error('Erro ao desligar chamada:', error);
        }
      }

      if (registerer) {
        await registerer.unregister();
      }

      if (userAgent) {
        await userAgent.stop();
      }

      setActiveCalls([]);
      setIsRegistered(false);
      setUserAgent(null);
      setRegisterer(null);
      if (ramalPresencaRef.current) {
        void removerPresencaSip(ramalPresencaRef.current);
      }

      // Não exibe aviso no cleanup de telas ou para usuários sem ramal configurado.
      if (tinhaConexaoSip) {
        toast({
          title: "Desconectado",
          description: "Ramal desconectado do UCM",
        });
      }
    } catch (error) {
      console.error('Erro ao desconectar:', error);
    }
  }, [userAgent, registerer, isRegistered, activeCalls, toast]);

  // Informa (e mantém atualizado) que este ramal está online pelo sistema.
  const emChamadaAgora = activeCalls.length > 0;
  useEffect(() => {
    const ramal = ramalPresencaRef.current;
    if (!ramal) return;
    if (!isRegistered) {
      void removerPresencaSip(ramal);
      return;
    }
    void registrarPresencaSip(ramal, emChamadaAgora);
    const intervalo = setInterval(() => void registrarPresencaSip(ramal, emChamadaAgora), 45000);
    return () => clearInterval(intervalo);
  }, [isRegistered, emChamadaAgora]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    connect,
    disconnect,
    dial,
    hangup,
    answer,
    isRegistered,
    isConnecting,
    activeCalls,
    remoteStream,
    localVideoStream,
    vivaVoz,
    mudo,
    toggleVivaVoz,
    toggleMudo,
    toggleCamera,
  };
};
