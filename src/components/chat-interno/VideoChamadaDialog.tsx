import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Phone,
  Monitor
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VideoChamadaDialogProps {
  isOpen: boolean;
  onClose: () => void;
  usuarioRemotoId: string;
  usuarioRemotoNome: string;
  usuarioAtualId: string;
  conversaId: string;
  isIncoming?: boolean;
}

export function VideoChamadaDialog({
  isOpen,
  onClose,
  usuarioRemotoId,
  usuarioRemotoNome,
  usuarioAtualId,
  conversaId,
  isIncoming = false
}: VideoChamadaDialogProps) {
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'connected' | 'ended'>('idle');
  const [remoteConnected, setRemoteConnected] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const configuration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ]
  };

  const setupLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoEnabled,
        audio: audioEnabled
      });
      
      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      return stream;
    } catch (error) {
      console.error('Erro ao acessar câmera/microfone:', error);
      toast.error('Não foi possível acessar câmera ou microfone');
      throw error;
    }
  }, [videoEnabled, audioEnabled]);

  const createPeerConnection = useCallback(async (stream: MediaStream) => {
    const pc = new RTCPeerConnection(configuration);
    
    // Adicionar tracks locais
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    // Receber tracks remotos
    pc.ontrack = (event) => {
      console.log('Track remoto recebido:', event);
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setRemoteConnected(true);
      }
    };

    // ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            from: usuarioAtualId,
            to: usuarioRemotoId,
            candidate: event.candidate
          }
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Estado da conexão:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setCallStatus('connected');
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        handleEndCall();
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [usuarioAtualId, usuarioRemotoId]);

  const startCall = useCallback(async () => {
    try {
      setCallStatus('calling');
      
      const stream = await setupLocalStream();
      const pc = await createPeerConnection(stream);

      // Criar oferta
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Enviar oferta via Supabase Realtime
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'call-offer',
          payload: {
            from: usuarioAtualId,
            to: usuarioRemotoId,
            offer: offer,
            conversaId
          }
        });
      }

      toast.info(`Chamando ${usuarioRemotoNome}...`);
    } catch (error) {
      console.error('Erro ao iniciar chamada:', error);
      setCallStatus('idle');
    }
  }, [setupLocalStream, createPeerConnection, usuarioAtualId, usuarioRemotoId, usuarioRemotoNome, conversaId]);

  const handleIncomingOffer = useCallback(async (offer: RTCSessionDescriptionInit) => {
    try {
      const stream = await setupLocalStream();
      const pc = await createPeerConnection(stream);

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Enviar resposta
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'call-answer',
          payload: {
            from: usuarioAtualId,
            to: usuarioRemotoId,
            answer: answer
          }
        });
      }

      setCallStatus('connected');
    } catch (error) {
      console.error('Erro ao aceitar chamada:', error);
    }
  }, [setupLocalStream, createPeerConnection, usuarioAtualId, usuarioRemotoId]);

  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        setCallStatus('connected');
      }
    } catch (error) {
      console.error('Erro ao processar resposta:', error);
    }
  }, []);

  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Erro ao adicionar ICE candidate:', error);
    }
  }, []);

  const handleEndCall = useCallback(() => {
    // Parar streams locais
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Fechar peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Notificar o outro usuário
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'call-end',
        payload: {
          from: usuarioAtualId,
          to: usuarioRemotoId
        }
      });
    }

    setCallStatus('ended');
    setRemoteConnected(false);
    onClose();
  }, [usuarioAtualId, usuarioRemotoId, onClose]);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  }, []);

  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  }, []);

  // Setup signaling channel
  useEffect(() => {
    if (!isOpen) return;

    const channel = supabase.channel(`video-call-${conversaId}`)
      .on('broadcast', { event: 'call-offer' }, ({ payload }) => {
        if (payload.to === usuarioAtualId && payload.from === usuarioRemotoId) {
          handleIncomingOffer(payload.offer);
        }
      })
      .on('broadcast', { event: 'call-answer' }, ({ payload }) => {
        if (payload.to === usuarioAtualId && payload.from === usuarioRemotoId) {
          handleAnswer(payload.answer);
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, ({ payload }) => {
        if (payload.to === usuarioAtualId && payload.from === usuarioRemotoId) {
          handleIceCandidate(payload.candidate);
        }
      })
      .on('broadcast', { event: 'call-end' }, ({ payload }) => {
        if (payload.to === usuarioAtualId) {
          toast.info('Chamada encerrada');
          handleEndCall();
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, conversaId, usuarioAtualId, usuarioRemotoId, handleIncomingOffer, handleAnswer, handleIceCandidate, handleEndCall]);

  // Auto-start call when dialog opens
  useEffect(() => {
    if (isOpen && callStatus === 'idle' && !isIncoming) {
      startCall();
    }
  }, [isOpen, callStatus, isIncoming, startCall]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={() => handleEndCall()}>
      <DialogContent className="sm:max-w-[800px] p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Videochamada com {usuarioRemotoNome}
            {callStatus === 'calling' && (
              <span className="text-sm text-muted-foreground animate-pulse">
                Chamando...
              </span>
            )}
            {callStatus === 'connected' && (
              <span className="text-sm text-green-500">
                Conectado
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="relative aspect-video bg-muted">
          {/* Remote video (full size) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={cn(
              "w-full h-full object-cover",
              !remoteConnected && "hidden"
            )}
          />
          
          {/* Placeholder when not connected */}
          {!remoteConnected && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                  <Video className="h-12 w-12 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  {callStatus === 'calling' ? 'Aguardando resposta...' : 'Conectando...'}
                </p>
              </div>
            </div>
          )}

          {/* Local video (picture-in-picture) */}
          <div className="absolute bottom-4 right-4 w-40 aspect-video rounded-lg overflow-hidden border-2 border-background shadow-lg">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {!videoEnabled && (
              <div className="absolute inset-0 bg-muted flex items-center justify-center">
                <VideoOff className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 flex items-center justify-center gap-4">
          <Button
            variant={audioEnabled ? "outline" : "destructive"}
            size="icon"
            className="rounded-full h-12 w-12"
            onClick={toggleAudio}
          >
            {audioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>

          <Button
            variant={videoEnabled ? "outline" : "destructive"}
            size="icon"
            className="rounded-full h-12 w-12"
            onClick={toggleVideo}
          >
            {videoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </Button>

          <Button
            variant="destructive"
            size="icon"
            className="rounded-full h-14 w-14"
            onClick={handleEndCall}
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
