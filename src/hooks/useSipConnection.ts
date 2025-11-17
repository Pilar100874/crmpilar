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
  const [remoteAudio] = useState(() => {
    const audio = new Audio();
    audio.autoplay = true;
    return audio;
  });

  // Helper to try connecting to a server
  const tryConnect = useCallback(async (server: string, extension: string, password: string, displayName: string, isRemote: boolean = false) => {
    console.log(`${isRemote ? '🌐' : '🏠'} Tentando servidor ${isRemote ? 'REMOTO' : 'LOCAL'}:`, server);
    
    const wsServers = [
      `wss://${server}:8089/ws`,
      `ws://${server}:8089/ws`
    ];

    const sipUri = `sip:${extension}@${server}`;
    console.log('SIP URI:', sipUri);

    const ua = new UserAgent({
      uri: UserAgent.makeURI(sipUri),
      transportOptions: {
        server: wsServers[0],
        connectionTimeout: 5,
      },
      authorizationUsername: extension,
      authorizationPassword: password,
      displayName: displayName || extension,
      sessionDescriptionHandlerFactoryOptions: {
        constraints: {
          audio: true,
          video: false,
        },
      },
      delegate: {
        onInvite: (invitation) => {
          console.log('📞 Chamada recebida:', invitation.remoteIdentity.uri.user);
          handleIncomingCall(invitation);
        },
        onConnect: () => {
          console.log('✅ WebSocket conectado');
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

    await ua.start();
    return { ua, server };
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
      
      let errorMsg = "Erro ao conectar ao UCM";
      if (error instanceof Error) {
        errorMsg = error.message;
        
        if (error.message.includes('WebSocket')) {
          errorMsg = "Não foi possível conectar ao UCM via WebSocket. Verifique se a porta 8089 (WSS/WS) está acessível.";
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

  // Make outbound call
  const dial = useCallback(async (phoneNumber: string) => {
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
            video: false,
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

      toast({
        title: "Chamada encerrada",
      });
    } catch (error) {
      console.error('Erro ao desligar:', error);
    }
  }, [activeCalls, toast]);

  // Answer incoming call
  const answer = useCallback(async (callId: string) => {
    const call = activeCalls.find(c => c.id === callId);
    if (!call || call.direction !== 'inbound') return;

    try {
      await (call.session as any).accept();
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
  }, [activeCalls, toast]);

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
  };
};
