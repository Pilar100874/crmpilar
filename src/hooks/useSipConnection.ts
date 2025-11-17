import { useState, useEffect, useCallback, useRef } from 'react';
import { UserAgent, Registerer, Inviter, Session, SessionState } from 'sip.js';
import { useToast } from '@/hooks/use-toast';

interface SipConfig {
  server: string;
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
  const [connectionConfig, setConnectionConfig] = useState<SipConfig | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [remoteAudio] = useState(() => {
    const audio = new Audio();
    audio.autoplay = true;
    return audio;
  });

  // Função de reconexão automática
  const scheduleReconnect = useCallback((config: SipConfig) => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    
    console.log('⏰ Agendando reconexão em 30 segundos...');
    reconnectTimerRef.current = setTimeout(() => {
      console.log('🔄 Tentando reconectar...');
      connect(config);
    }, 30000); // Tenta reconectar após 30 segundos
  }, []);

  // Connect and register to UCM
  const connect = useCallback(async (config: SipConfig) => {
    try {
      setIsConnecting(true);
      setConnectionConfig(config); // Salva config para reconexão
      console.log('=== INICIANDO CONEXÃO SOFTPHONE ===');
      console.log('Servidor UCM:', config.server);
      console.log('Ramal:', config.extension);
      console.log('Senha fornecida:', config.password ? 'Sim (oculta)' : 'Não');

      // Tenta WSS (seguro) primeiro, depois WS (não seguro)
      const wsServers = [
        `wss://${config.server}:8089/ws`,
        `ws://${config.server}:8089/ws`
      ];

      console.log('Tentando conectar via:', wsServers[0]);

      const sipUri = `sip:${config.extension}@${config.server}`;
      console.log('SIP URI:', sipUri);

      const ua = new UserAgent({
        uri: UserAgent.makeURI(sipUri),
        transportOptions: {
          server: wsServers[0], // Tenta WSS primeiro
          connectionTimeout: 5,
        },
        authorizationUsername: config.extension,
        authorizationPassword: config.password,
        displayName: config.displayName || config.extension,
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
              description: "Reconectando automaticamente...",
              variant: "destructive",
            });
            // Garante que a UI bloqueie novas chamadas até reconectar
            setIsRegistered(false);
            // Tenta reconectar automaticamente
            if (connectionConfig) {
              scheduleReconnect(connectionConfig);
            }
          },
        },
      });

      console.log('Iniciando UserAgent...');
      await ua.start();
      console.log('✅ UserAgent iniciado');

      const reg = new Registerer(ua);
      
      reg.stateChange.addListener((state) => {
        console.log('📊 Estado do registro mudou:', state);
        setIsRegistered(state === 'Registered');
        
        if (state === 'Registered') {
          console.log('✅ RAMAL REGISTRADO COM SUCESSO!');
          // Limpa timer de reconexão se houver
          if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
          }
          toast({
            title: "Conectado",
            description: `Ramal ${config.extension} registrado no UCM`,
          });
        } else if (state === 'Unregistered') {
          console.log('⚠️ Ramal não registrado');
          // Se desregistrou inesperadamente, tenta reconectar
          if (connectionConfig) {
            scheduleReconnect(connectionConfig);
          }
        }
      });

      console.log('Enviando REGISTER...');
      await reg.register({
        requestDelegate: {
          onAccept: () => {
            console.log('✅ REGISTER aceito pelo UCM');
          },
          onReject: (response) => {
            console.error('❌ REGISTER rejeitado:', response.message.statusCode);
            // Tenta reconectar após falha
            if (connectionConfig) {
              scheduleReconnect(connectionConfig);
            }
          }
        }
      });
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
  }, [toast]);

  // Handle incoming call
  const handleIncomingCall = useCallback((session: Session) => {
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
    session.stateChange.addListener((state) => {
      console.log('Estado da chamada mudou:', state);
      setActiveCalls(prev => 
        prev.map(call => 
          call.id === callSession.id 
            ? { ...call, state } 
            : call
        )
      );

      if (state === SessionState.Established) {
        setupRemoteMedia(session);
      } else if (state === SessionState.Terminated) {
        // Remove chamada encerrada após delay
        setTimeout(() => {
          setActiveCalls(prev => prev.filter(call => call.id !== callSession.id));
        }, 500);
      }
    });

    // Auto-answer for testing (você pode remover isso e adicionar um dialog de confirmação)
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
        console.log('Número externo detectado, adicionando #:', dialNumber);
      }
      
      // Codifica # como %23 para o URI SIP ser válido
      const sipUserPart = dialNumber.replace(/#/g, '%23');
      const target = UserAgent.makeURI(`sip:${sipUserPart}@${userAgent.configuration.uri?.host}`);
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
      inviter.stateChange.addListener((state) => {
        console.log('Estado da chamada mudou:', state);
        setActiveCalls(prev => 
          prev.map(call => 
            call.id === callSession.id 
              ? { ...call, state } 
              : call
          )
        );

        if (state === SessionState.Established) {
          setupRemoteMedia(inviter);
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
        requestDelegate: {
          onReject: (response) => {
            console.error('Erro ao conectar chamada:', response.message.statusCode, response.message.reasonPhrase);
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
              description: `${errorMsg}. Para números externos, verifique permissões de rota no UCM.`,
              variant: "destructive",
            });
            setTimeout(() => {
              setActiveCalls(prev => prev.filter(call => call.id !== callSession.id));
            }, 500);
          },
          onAccept: () => {
            console.log('Chamada aceita pelo outro lado');
          },
          onProgress: (response) => {
            console.log('Progresso da chamada:', response.message.statusCode);
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
  const setupRemoteMedia = (session: Session) => {
    const sessionDescriptionHandler = session.sessionDescriptionHandler;
    if (!sessionDescriptionHandler) return;

    const peerConnection = (sessionDescriptionHandler as any).peerConnection;
    if (!peerConnection) return;

    const remoteStream = new MediaStream();
    peerConnection.getReceivers().forEach((receiver: RTCRtpReceiver) => {
      if (receiver.track) {
        remoteStream.addTrack(receiver.track);
      }
    });

    remoteAudio.srcObject = remoteStream;
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
      // Limpa timer de reconexão
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      
      // Limpa config de conexão para não reconectar
      setConnectionConfig(null);
      
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
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      disconnect();
    };
  }, [disconnect]);

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
