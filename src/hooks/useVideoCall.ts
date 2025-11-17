import { useState, useEffect, useCallback, useRef } from 'react';
import { UserAgent, Registerer, RegistererState, Inviter, Invitation, Session, SessionState } from 'sip.js';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getEstabelecimentoId } from '@/lib/estabelecimentoUtils';

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

export const useVideoCall = () => {
  const { toast } = useToast();
  const [userAgent, setUserAgent] = useState<UserAgent | null>(null);
  const [registerer, setRegisterer] = useState<Registerer | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [activeCalls, setActiveCalls] = useState<CallSession[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [conferenceRoomNumber, setConferenceRoomNumber] = useState<string>("");
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  // Obter mídia local (câmera + microfone)
  const getLocalMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      localStreamRef.current = stream;
      setLocalStream(stream);
      console.log('✅ Mídia local obtida');
      return stream;
    } catch (error) {
      console.error('❌ Erro ao obter mídia local:', error);
      toast({
        title: "Erro de mídia",
        description: "Não foi possível acessar câmera/microfone",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  // Helper para tentar conectar
  const tryConnect = useCallback(async (
    server: string, 
    extension: string, 
    password: string, 
    displayName: string, 
    isRemote: boolean = false
  ) => {
    console.log(`${isRemote ? '🌐' : '🏠'} Tentando servidor ${isRemote ? 'REMOTO' : 'LOCAL'}:`, server);
    
    const wsServers = [
      `wss://${server}:8089/ws`,
      `ws://${server}:8089/ws`
    ];

    const sipUri = `sip:${extension}@${server}`;
    
    // Obter stream local antes de criar UA
    const stream = await getLocalMedia();

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
          video: true, // Habilitar vídeo
        },
        peerConnectionOptions: {
          rtcConfiguration: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' }
            ]
          }
        }
      },
      delegate: {
        onInvite: (invitation) => {
          console.log('📞 Videochamada recebida:', invitation.remoteIdentity.uri.user);
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
  }, [toast, getLocalMedia]);

  // Conectar ao UCM
  const connect = useCallback(async () => {
    try {
      setIsConnecting(true);
      
      // Buscar configurações
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: userData } = await supabase
        .from('usuarios')
        .select('ramal, senha_sip')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (!userData?.ramal || !userData?.senha_sip) {
        throw new Error('Configure seu ramal e senha SIP');
      }

      const estabelecimentoId = await getEstabelecimentoId();
      const { data: ucmData } = await supabase
        .from('ucm_config')
        .select('ucm_host, remote_ip, conference_room_number')
        .eq('estabelecimento_id', estabelecimentoId!)
        .maybeSingle();

      if (!ucmData?.ucm_host) {
        throw new Error('Configure o servidor UCM');
      }

      setConferenceRoomNumber(ucmData.conference_room_number || "");

      let ua: UserAgent | null = null;
      let connectedServer = '';

      // Tentar local primeiro
      try {
        const result = await tryConnect(
          ucmData.ucm_host,
          userData.ramal,
          userData.senha_sip,
          userData.ramal,
          false
        );
        ua = result.ua;
        connectedServer = result.server;
        console.log('✅ Conectado ao servidor LOCAL');
      } catch (localError) {
        console.warn('⚠️ Falha no servidor local:', localError);
        
        if (ucmData.remote_ip) {
          const result = await tryConnect(
            ucmData.remote_ip,
            userData.ramal,
            userData.senha_sip,
            userData.ramal,
            true
          );
          ua = result.ua;
          connectedServer = result.server;
          console.log('✅ Conectado ao servidor REMOTO');
        } else {
          throw localError;
        }
      }

      if (!ua) throw new Error('Falha ao criar UserAgent');

      const reg = new Registerer(ua);
      
      reg.stateChange.addListener((state) => {
        setIsRegistered(state === RegistererState.Registered);
        
        if (state === RegistererState.Registered) {
          toast({
            title: "Conectado",
            description: `Videochamada pronta (${connectedServer})`,
          });
        }
      });

      await reg.register();
      
      setUserAgent(ua);
      setRegisterer(reg);

    } catch (error: any) {
      console.error('❌ Erro ao conectar:', error);
      toast({
        title: "Erro na conexão",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  }, [toast, tryConnect]);

  // Desconectar
  const disconnect = useCallback(async () => {
    if (registerer) {
      await registerer.unregister();
    }
    if (userAgent) {
      await userAgent.stop();
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    setUserAgent(null);
    setRegisterer(null);
    setIsRegistered(false);
    setLocalStream(null);
    setRemoteStream(null);
  }, [registerer, userAgent]);

  // Discar
  const dial = useCallback(async (phoneNumber: string) => {
    if (!userAgent || !isRegistered) {
      toast({
        title: "Erro",
        description: "Não conectado ao UCM",
        variant: "destructive",
      });
      return;
    }

    try {
      const target = UserAgent.makeURI(`sip:${phoneNumber}@${userAgent.configuration.uri?.host}`);
      if (!target) throw new Error('URI inválida');

      const inviter = new Inviter(userAgent, target, {
        sessionDescriptionHandlerOptions: {
          constraints: {
            audio: true,
            video: true,
          }
        }
      });

      // Setup remote media
      inviter.stateChange.addListener((state) => {
        console.log('📞 Estado da chamada:', state);
        
        if (state === SessionState.Established) {
          const sdh = inviter.sessionDescriptionHandler as any;
          if (sdh?.peerConnection) {
            const remoteStream = new MediaStream();
            sdh.peerConnection.getReceivers().forEach((receiver: RTCRtpReceiver) => {
              if (receiver.track) {
                remoteStream.addTrack(receiver.track);
              }
            });
            remoteStreamRef.current = remoteStream;
            setRemoteStream(remoteStream);
          }
        }
      });

      await inviter.invite();

      const callSession: CallSession = {
        id: crypto.randomUUID(),
        session: inviter,
        phoneNumber,
        direction: 'outbound',
        state: inviter.state,
        startTime: new Date(),
      };

      setActiveCalls(prev => [...prev, callSession]);

      toast({
        title: "Chamando",
        description: `Discando para ${phoneNumber}`,
      });

    } catch (error: any) {
      console.error('❌ Erro ao discar:', error);
      toast({
        title: "Erro ao discar",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [userAgent, isRegistered, toast]);

  // Desligar
  const hangup = useCallback(async (callId: string) => {
    const call = activeCalls.find(c => c.id === callId);
    if (call) {
      await call.session.bye();
      setActiveCalls(prev => prev.filter(c => c.id !== callId));
      setRemoteStream(null);
    }
  }, [activeCalls]);

  // Handle incoming call
  const handleIncomingCall = useCallback((session: Invitation) => {
    const callSession: CallSession = {
      id: crypto.randomUUID(),
      session,
      phoneNumber: session.remoteIdentity.uri.user || 'Desconhecido',
      direction: 'inbound',
      state: session.state,
      startTime: new Date(),
    };

    setActiveCalls(prev => [...prev, callSession]);

    // Auto aceitar chamadas recebidas
    session.accept({
      sessionDescriptionHandlerOptions: {
        constraints: {
          audio: true,
          video: true,
        }
      }
    });

    toast({
      title: "Chamada recebida",
      description: `De: ${callSession.phoneNumber}`,
    });
  }, [toast]);

  // Toggle vídeo
  const toggleVideo = useCallback(async () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
      }
    }
  }, []);

  // Toggle áudio
  const toggleAudio = useCallback(async () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
      }
    }
  }, []);

  // Compartilhar tela
  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });

      // Substituir track de vídeo pelo da tela
      if (localStreamRef.current && activeCalls.length > 0) {
        const videoTrack = screenStream.getVideoTracks()[0];
        const sdh = activeCalls[0].session.sessionDescriptionHandler as any;
        const sender = sdh?.peerConnection
          ?.getSenders()
          .find((s: RTCRtpSender) => s.track?.kind === 'video');
        
        if (sender) {
          await sender.replaceTrack(videoTrack);
        }
      }
    } catch (error) {
      console.error('Erro ao compartilhar tela:', error);
    }
  }, [activeCalls]);

  // Parar compartilhamento
  const stopScreenShare = useCallback(async () => {
    if (localStreamRef.current && activeCalls.length > 0) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      const sdh = activeCalls[0].session.sessionDescriptionHandler as any;
      const sender = sdh?.peerConnection
        ?.getSenders()
        .find((s: RTCRtpSender) => s.track?.kind === 'video');
      
      if (sender && videoTrack) {
        await sender.replaceTrack(videoTrack);
      }
    }
  }, [activeCalls]);

  // Entrar em conferência
  const joinConference = useCallback(async () => {
    if (conferenceRoomNumber) {
      await dial(conferenceRoomNumber);
    }
  }, [conferenceRoomNumber, dial]);

  return {
    connect,
    disconnect,
    dial,
    hangup,
    toggleVideo,
    toggleAudio,
    startScreenShare,
    stopScreenShare,
    joinConference,
    isRegistered,
    isConnecting,
    activeCalls,
    localStream,
    remoteStream,
    conferenceRoomNumber,
  };
};
