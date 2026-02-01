import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getEstabelecimentoId } from '@/lib/estabelecimentoUtils';

export function useAutoScreenShare() {
  const [isSharing, setIsSharing] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const usuarioIdRef = useRef<string | null>(null);
  const estabelecimentoIdRef = useRef<string | null>(null);

  // Iniciar captura de tela
  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          frameRate: 1, // 1 FPS para economizar banda
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;
      setIsSharing(true);

      // Criar canvas para capturar frames
      const canvas = document.createElement('canvas');
      canvasRef.current = canvas;

      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      // Quando o usuário parar de compartilhar
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      // Capturar e enviar frames periodicamente (a cada 3 segundos)
      intervalRef.current = setInterval(async () => {
        if (!streamRef.current || !canvasRef.current) return;

        const track = streamRef.current.getVideoTracks()[0];
        if (!track) return;

        const settings = track.getSettings();
        canvas.width = settings.width || 1280;
        canvas.height = settings.height || 720;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          
          // Converter para base64 com qualidade reduzida
          const frameData = canvas.toDataURL('image/jpeg', 0.5);

          // Atualizar no banco
          if (usuarioIdRef.current && estabelecimentoIdRef.current) {
            await supabase
              .from('screen_monitor_consent')
              .upsert({
                usuario_id: usuarioIdRef.current,
                estabelecimento_id: estabelecimentoIdRef.current,
                is_sharing: true,
                last_frame_at: new Date().toISOString(),
              }, {
                onConflict: 'usuario_id,estabelecimento_id'
              });

            // Enviar frame via Realtime channel
            const channel = supabase.channel(`screen-share-${usuarioIdRef.current}`);
            channel.send({
              type: 'broadcast',
              event: 'frame',
              payload: { frame: frameData }
            });
          }
        }
      }, 3000);

      // Atualizar status no banco
      if (usuarioIdRef.current && estabelecimentoIdRef.current) {
        await supabase
          .from('screen_monitor_consent')
          .upsert({
            usuario_id: usuarioIdRef.current,
            estabelecimento_id: estabelecimentoIdRef.current,
            is_sharing: true,
            sharing_started_at: new Date().toISOString(),
          }, {
            onConflict: 'usuario_id,estabelecimento_id'
          });
      }

      console.log('[AutoScreenShare] Compartilhamento iniciado');
    } catch (error) {
      console.log('[AutoScreenShare] Usuário cancelou ou erro:', error);
      setIsSharing(false);
    }
  }, []);

  // Parar captura
  const stopScreenShare = useCallback(async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsSharing(false);

    // Atualizar status no banco
    if (usuarioIdRef.current && estabelecimentoIdRef.current) {
      await supabase
        .from('screen_monitor_consent')
        .upsert({
          usuario_id: usuarioIdRef.current,
          estabelecimento_id: estabelecimentoIdRef.current,
          is_sharing: false,
        }, {
          onConflict: 'usuario_id,estabelecimento_id'
        });
    }

    console.log('[AutoScreenShare] Compartilhamento parado');
  }, []);

  // Verificar consentimento e iniciar automaticamente
  useEffect(() => {
    const init = async () => {
      const estabId = await getEstabelecimentoId();
      if (!estabId) return;
      estabelecimentoIdRef.current = estabId;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (!usuario) return;
      usuarioIdRef.current = usuario.id;

      // Verificar se tem consentimento
      const { data: consent } = await supabase
        .from('screen_monitor_consent')
        .select('consent_given')
        .eq('usuario_id', usuario.id)
        .eq('estabelecimento_id', estabId)
        .maybeSingle();

      if (consent?.consent_given) {
        setHasConsent(true);
        // Iniciar compartilhamento automaticamente após 2 segundos
        setTimeout(() => {
          startScreenShare();
        }, 2000);
      }
    };

    init();

    return () => {
      stopScreenShare();
    };
  }, [startScreenShare, stopScreenShare]);

  return {
    isSharing,
    hasConsent,
    startScreenShare,
    stopScreenShare
  };
}
