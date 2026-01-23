import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ScreenShareSession {
  id: string;
  host_user_id: string;
  guest_user_id: string | null;
  session_code: string;
  status: string;
  estabelecimento_id: string;
}

export const useScreenShare = () => {
  const [isSharing, setIsSharing] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<ScreenShareSession | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [hostName, setHostName] = useState<string | null>(null);
  const [guestName, setGuestName] = useState<string | null>(null);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const currentSessionRef = useRef<ScreenShareSession | null>(null);
  const isSharingRef = useRef<boolean>(false);

  // Keep refs in sync with state
  useEffect(() => {
    currentSessionRef.current = currentSession;
  }, [currentSession]);

  useEffect(() => {
    isSharingRef.current = isSharing;
  }, [isSharing]);

  const generateSessionCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const sendSignal = async (sessionId: string, signalType: string, signalData: any) => {
    const userId = currentUserIdRef.current;
    if (!userId) return;

    await supabase.from('screen_share_signals').insert({
      session_id: sessionId,
      sender_user_id: userId,
      signal_type: signalType,
      signal_data: signalData
    } as any);
  };

  const createPeerConnection = useCallback(() => {
    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]
    };
    
    const pc = new RTCPeerConnection(config);
    peerConnectionRef.current = pc;
    
    pc.onicecandidate = async (event) => {
      if (event.candidate && currentSessionRef.current) {
        await sendSignal(
          currentSessionRef.current.id,
          'ice-candidate',
          { candidate: event.candidate.toJSON() }
        );
      }
    };

    pc.ontrack = (event) => {
      console.log('Received remote track', event.streams);
      if (event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        toast.error('Conexão perdida');
      }
    };

    return pc;
  }, []);

  const startSharing = async () => {
    try {
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error('Você precisa estar logado');
        return null;
      }

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('id, nome, estabelecimento_id')
        .eq('auth_user_id', userData.user.id)
        .single();

      if (!usuario) {
        toast.error('Usuário não encontrado');
        return null;
      }

      currentUserIdRef.current = usuario.id;
      setHostName(usuario.nome);

      // Get screen stream
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });

      localStreamRef.current = stream;

      // Create session
      const code = generateSessionCode();
      const { data: session, error } = await supabase
        .from('screen_share_sessions')
        .insert({
          host_user_id: usuario.id,
          estabelecimento_id: usuario.estabelecimento_id,
          session_code: code,
          status: 'waiting'
        } as any)
        .select()
        .single();

      if (error) {
        console.error('Error creating session:', error);
        toast.error('Erro ao criar sessão');
        stream.getTracks().forEach(t => t.stop());
        return null;
      }

      setCurrentSession(session as ScreenShareSession);
      setSessionCode(code);
      setIsSharing(true);

      // Listen for when stream ends (user clicks stop sharing)
      stream.getVideoTracks()[0].onended = () => {
        stopSharing();
      };

      // Subscribe to signals
      subscribeToSignals((session as ScreenShareSession).id, usuario.id, true);

      // Subscribe to session updates
      subscribeToSessionUpdates((session as ScreenShareSession).id);

      toast.success(`Compartilhamento iniciado! Código: ${code}`);
      return code;
    } catch (error: any) {
      console.error('Error starting screen share:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Permissão negada para compartilhar tela');
      } else {
        toast.error('Erro ao iniciar compartilhamento');
      }
      return null;
    }
  };

  const joinSession = async (code: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error('Você precisa estar logado');
        return false;
      }

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('id, nome, estabelecimento_id')
        .eq('auth_user_id', userData.user.id)
        .single();

      if (!usuario) {
        toast.error('Usuário não encontrado');
        return false;
      }

      currentUserIdRef.current = usuario.id;
      setGuestName(usuario.nome);

      // Find session by code
      const { data: session, error } = await supabase
        .from('screen_share_sessions')
        .select('*, host:usuarios!screen_share_sessions_host_user_id_fkey(nome)')
        .eq('session_code', code.toUpperCase())
        .eq('status', 'waiting')
        .single();

      if (error || !session) {
        toast.error('Sessão não encontrada ou já encerrada');
        return false;
      }

      // Update session with guest
      const { error: updateError } = await supabase
        .from('screen_share_sessions')
        .update({
          guest_user_id: usuario.id,
          status: 'connected',
          started_at: new Date().toISOString()
        })
        .eq('id', session.id);

      if (updateError) {
        console.error('Error joining session:', updateError);
        toast.error('Erro ao entrar na sessão');
        return false;
      }

      const sessionData = session as unknown as ScreenShareSession & { host: { nome: string } };
      setCurrentSession(sessionData);
      setSessionCode(code.toUpperCase());
      setHostName(sessionData.host?.nome || 'Anfitrião');
      setIsViewing(true);

      // Create peer connection for viewer before subscribing to signals
      createPeerConnection();

      // Subscribe to signals
      subscribeToSignals(session.id, usuario.id, false);

      console.log('Viewer joined, waiting for host offer...');
      toast.success('Conectado à sessão!');
      return true;
    } catch (error) {
      console.error('Error joining session:', error);
      toast.error('Erro ao entrar na sessão');
      return false;
    }
  };

  const subscribeToSessionUpdates = (sessionId: string) => {
    const channel = supabase
      .channel(`session-updates-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'screen_share_sessions',
          filter: `id=eq.${sessionId}`
        },
        async (payload) => {
          const updatedSession = payload.new as ScreenShareSession;
          setCurrentSession(updatedSession);

          if (updatedSession.status === 'connected' && isSharingRef.current && updatedSession.guest_user_id) {
            // Guest joined, initiate WebRTC as host
            console.log('Guest joined, initiating WebRTC...');
            const { data: guest } = await supabase
              .from('usuarios')
              .select('nome')
              .eq('id', updatedSession.guest_user_id)
              .single();
            
            setGuestName(guest?.nome || 'Convidado');
            await initiateWebRTC(sessionId);
          }

          if (updatedSession.status === 'ended') {
            toast.info('Sessão encerrada');
            cleanup();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToSignals = (sessionId: string, myUserId: string, amHost: boolean) => {
    const channel = supabase
      .channel(`signals-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'screen_share_signals',
          filter: `session_id=eq.${sessionId}`
        },
        async (payload) => {
          const signal = payload.new as any;
          
          // Ignore own signals
          if (signal.sender_user_id === myUserId) return;

          console.log('Received signal:', signal.signal_type);

          if (!peerConnectionRef.current) {
            createPeerConnection();
          }

          const pc = peerConnectionRef.current!;

          try {
            if (signal.signal_type === 'offer') {
              console.log('Processing offer from host...');
              await pc.setRemoteDescription(new RTCSessionDescription(signal.signal_data));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              console.log('Sending answer to host...');
              await sendSignal(sessionId, 'answer', answer);
            } else if (signal.signal_type === 'answer') {
              console.log('Processing answer from viewer...');
              await pc.setRemoteDescription(new RTCSessionDescription(signal.signal_data));
            } else if (signal.signal_type === 'ice-candidate' && signal.signal_data.candidate) {
              console.log('Adding ICE candidate...');
              await pc.addIceCandidate(new RTCIceCandidate(signal.signal_data.candidate));
            }
          } catch (error) {
            console.error('Error handling signal:', error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const initiateWebRTC = async (sessionId: string) => {
    if (!localStreamRef.current) {
      console.error('No local stream available for WebRTC');
      return;
    }

    console.log('Initiating WebRTC connection as host...');
    const pc = createPeerConnection();
    
    // Add local stream tracks
    localStreamRef.current.getTracks().forEach(track => {
      console.log('Adding track to peer connection:', track.kind);
      pc.addTrack(track, localStreamRef.current!);
    });

    // Create and send offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    console.log('Sending offer to viewer...');
    await sendSignal(sessionId, 'offer', offer);
  };

  const stopSharing = async () => {
    if (currentSessionRef.current) {
      await supabase
        .from('screen_share_sessions')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString()
        })
        .eq('id', currentSessionRef.current.id);
    }
    cleanup();
    toast.info('Compartilhamento encerrado');
  };

  const leaveSession = async () => {
    cleanup();
    toast.info('Você saiu da sessão');
  };

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setIsSharing(false);
    setIsViewing(false);
    setSessionCode(null);
    setCurrentSession(null);
    setRemoteStream(null);
    setHostName(null);
    setGuestName(null);
  };

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  return {
    isSharing,
    isViewing,
    sessionCode,
    currentSession,
    remoteStream,
    hostName,
    guestName,
    startSharing,
    joinSession,
    stopSharing,
    leaveSession
  };
};
