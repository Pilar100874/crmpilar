import { useState, useEffect, useCallback } from 'react';
import { UserAgent, Registerer, RegistererState, Inviter, Session, SessionState } from 'sip.js';
import { useToast } from '@/hooks/use-toast';

interface SipConfig {
  server: string;
  remoteServer?: string;
  extension: string;
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
}

export const useSipConnection = () => {
  const { toast } = useToast();
  const [userAgent, setUserAgent] = useState<UserAgent | null>(null);
  const [registerer, setRegisterer] = useState<Registerer | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [activeCalls, setActiveCalls] = useState<CallSession[]>([]);
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

  // Helper to try connecting to a server
  const tryConnect = useCallback(async (server: string, extension: string, password: string, displayName: string, isRemote: boolean = false) => {
    console.log(`${isRemote ? '🌐' : '🏠'} Tentando servidor ${isRemote ? 'REMOTO' : 'LOCAL'}:`, server);

    const { urls: wsServers, host } = montarUrlsWs(server);

    const sipUri = `sip:${extension}@${host}`;
    console.log('SIP URI:', sipUri, 'WS:', wsServers);

    let ultimoErro: unknown = null;

    for (const wsUrl of wsServers) {
      const ua = new UserAgent({
        uri: UserAgent.makeURI(sipUri),
        transportOptions: {
          server: wsUrl,
          connectionTimeout: 8,
        },
        authorizationUsername: extension,
        authorizationPassword: password,
        displayName: displayName || extension,
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
          },
          onDisconnect: (error) => {
            console.error('❌ WebSocket desconectado:', error);
            toast({
              title: "Desconectado",
              description: "Conexão com UCM perdida",
              variant: "destructive",
            });
            setIsRegistered(false);
          },
        },
      });

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
  }, [toast]);


  // Connect and register to UCM
  const connect = useCallback(async (config: SipConfig) => {
    try {
      setIsConnecting(true);
      console.log('=== INICIANDO CONEXÃO SOFTPHONE ===');
      console.log('Servidor LOCAL:', config.server);
      console.log('Servidor REMOTO:', config.remoteServer || 'Não configurado');
      console.log('Ramal:', config.extension);

      let ua: UserAgent | null = null;
      let connectedServer = '';

      // Tentar local primeiro
      try {
        const result = await tryConnect(
          config.server, 
          config.extension, 
          config.password, 
          config.displayName || config.extension,
          false
        );
        ua = result.ua;
        connectedServer = result.server;
        console.log('✅ Conectado ao servidor LOCAL');
      } catch (localError) {
        console.warn('⚠️ Falha ao conectar no servidor local:', localError);
        
        // Se houver servidor remoto, tentar
        if (config.remoteServer) {
          console.log('🔄 Tentando servidor REMOTO...');
          try {
            const result = await tryConnect(
              config.remoteServer, 
              config.extension, 
              config.password, 
              config.displayName || config.extension,
              true
            );
            ua = result.ua;
            connectedServer = result.server;
            console.log('✅ Conectado ao servidor REMOTO');
          } catch (remoteError) {
            console.error('❌ Falha ao conectar no servidor remoto:', remoteError);
            throw new Error('Não foi possível conectar nem ao servidor local nem ao remoto');
          }
        } else {
          throw localError;
        }
      }

      if (!ua) {
        throw new Error('Falha ao criar UserAgent');
      }

      const reg = new Registerer(ua);
      
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

      setUserAgent(ua);
      setRegisterer(reg);

    } catch (error) {
      console.error('❌ ERRO NA CONEXÃO:', error);

      const host = (config.server || '').replace(/^wss?:\/\//i, '').split('/')[0].split(':')[0];
      const ehRedeLocal = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);

      let errorMsg = "Erro ao conectar ao UCM";
      if (error instanceof Error) {
        errorMsg = error.message;

        if (/WebSocket|indisponível|Transport|timeout/i.test(error.message)) {
          errorMsg = ehRedeLocal
            ? `O UCM ${host} está em rede interna. Conecte o aparelho ao Wi-Fi da empresa (ou VPN) e confirme se a porta 8089 (WSS) está liberada.`
            : `Sem resposta em wss://${host}:8089/ws. Verifique se a porta 8089 está liberada e abra https://${host}:8089/ws no navegador uma vez para aceitar o certificado do UCM.`;
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
    console.log('📞 Chamada recebida de:', session.remoteIdentity.uri.user);
    
    const callSession: CallSession = {
      id: crypto.randomUUID(),
      session,
      phoneNumber: session.remoteIdentity.uri.user || 'Desconhecido',
      direction: 'inbound',
      state: session.state,
      startTime: new Date(),
    };

    setActiveCalls(prev => [...prev, callSession]);

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
        await setupRemoteMedia(session);
      } else if (state === SessionState.Terminated) {
        console.log('❌ Chamada recebida encerrada');
        // Remove chamada encerrada após delay
        setTimeout(() => {
          setActiveCalls(prev => prev.filter(call => call.id !== callSession.id));
        }, 500);
      }
    });

    toast({
      title: "Chamada recebida",
      description: `De: ${callSession.phoneNumber}`,
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
      // Adiciona # ao final para números externos (mais de 4 dígitos)
      // Ramais internos geralmente têm 3-4 dígitos
      let dialNumber = phoneNumber.trim();
      const isExternalNumber = dialNumber.length > 4;
      
      if (isExternalNumber && !dialNumber.endsWith('#')) {
        dialNumber = dialNumber + '#';
        console.log('📞 Número externo detectado, adicionando #:', dialNumber);
      }
      
      // Codifica # como %23 para o URI SIP ser válida
      const sipUserPart = dialNumber.replace(/#/g, '%23');
      const sipUri = `sip:${sipUserPart}@${userAgent.configuration.uri?.host}`;
      console.log('📞 URI SIP sendo usada:', sipUri);
      console.log('📞 Número original:', phoneNumber);
      console.log('📞 Número com #:', dialNumber);
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

      setActiveCalls(prev => [...prev, callSession]);

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

      await inviter.invite({
        sessionDescriptionHandlerOptions: {
          constraints: {
            audio: true,
            video: !!opcoes?.video,
          },
        },
        requestDelegate: {
          onReject: (response) => {
            console.error('❌ Chamada rejeitada:', response.message.statusCode, response.message.reasonPhrase);
            console.error('❌ Headers da resposta:', response.message.headers);
            let errorMsg = response.message.reasonPhrase;
            
            // Mensagens mais amigáveis para códigos comuns
            switch (response.message.statusCode) {
              case 404:
                errorMsg = "Número não encontrado";
                break;
              case 480:
                errorMsg = "Número temporariamente indisponível";
                break;
              case 486:
                errorMsg = "Ocupado";
                break;
              case 487:
                errorMsg = "Chamada cancelada";
                break;
              case 603:
                errorMsg = "Chamada recusada";
                break;
            }
            
            toast({
              title: "Falha na chamada",
              description: `${errorMsg}. Verifique: 1) Permissões do ramal para chamadas externas, 2) Configuração de rotas no UCM, 3) Trunk SIP configurado`,
              variant: "destructive",
            });
            setTimeout(() => {
              setActiveCalls(prev => prev.filter(call => call.id !== callSession.id));
            }, 500);
          },
          onAccept: (response) => {
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

      toast({
        title: "Desconectado",
        description: "Ramal desconectado do UCM",
      });
    } catch (error) {
      console.error('Erro ao desconectar:', error);
    }
  }, [userAgent, registerer, activeCalls, toast]);

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
