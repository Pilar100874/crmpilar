import { useState, useEffect, useCallback } from 'react';
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
  const [remoteAudio] = useState(() => {
    const audio = new Audio();
    audio.autoplay = true;
    return audio;
  });

  // Connect and register to UCM
  const connect = useCallback(async (config: SipConfig) => {
    try {
      setIsConnecting(true);
      console.log('Conectando ao UCM...', { server: config.server, extension: config.extension });

      const wsServer = `ws://${config.server}:8089/ws`;
      const sipUri = `sip:${config.extension}@${config.server}`;

      const ua = new UserAgent({
        uri: UserAgent.makeURI(sipUri),
        transportOptions: {
          server: wsServer,
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
            console.log('Chamada recebida:', invitation);
            handleIncomingCall(invitation);
          },
        },
      });

      await ua.start();
      console.log('UserAgent iniciado');

      const reg = new Registerer(ua);
      
      reg.stateChange.addListener((state) => {
        console.log('Estado do registro:', state);
        setIsRegistered(state === 'Registered');
        
        if (state === 'Registered') {
          toast({
            title: "Conectado",
            description: `Ramal ${config.extension} registrado com sucesso`,
          });
        }
      });

      await reg.register();
      console.log('Registro iniciado');

      setUserAgent(ua);
      setRegisterer(reg);

    } catch (error) {
      console.error('Erro ao conectar:', error);
      toast({
        title: "Erro de conexão",
        description: error instanceof Error ? error.message : "Erro ao conectar ao UCM",
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
      const target = UserAgent.makeURI(`sip:${phoneNumber}@${userAgent.configuration.uri?.host}`);
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
        } else if (state === SessionState.Terminated) {
          setActiveCalls(prev => prev.filter(call => call.id !== callSession.id));
        }
      });

      await inviter.invite();
      
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
      if (call.session.state === SessionState.Initial || 
          call.session.state === SessionState.Establishing) {
        await call.session.cancel();
      } else {
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
