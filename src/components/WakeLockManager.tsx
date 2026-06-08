import { useEffect, useState } from 'react';
import { studioBackgroundJobs, type StudioJob } from '@/components/marketing/ai-studio/backgroundJobsStore';
import { useWakeLock } from '@/hooks/useWakeLock';

/**
 * Mantém a tela acesa enquanto houver qualquer job pesado de IA em execução
 * (geração de vídeo/imagem do AI Studio). Evita que o celular apague a tela
 * e interrompa o processamento durante esperas longas.
 */
export default function WakeLockManager() {
  const [hasRunning, setHasRunning] = useState(false);

  useEffect(() => {
    return studioBackgroundJobs.subscribe((jobs: StudioJob[]) => {
      setHasRunning(jobs.some((j) => j.status === 'running'));
    });
  }, []);

  useWakeLock(hasRunning);
  return null;
}
