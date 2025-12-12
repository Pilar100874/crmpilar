import { useCallback } from 'react';
import { useMacro } from '@/contexts/MacroContext';
import { MacroStepType } from '@/types/macro';

export function useMacroRecorder() {
  const { 
    isRecording, 
    recordingSteps, 
    startRecording, 
    stopRecording, 
    addRecordingStep,
    insertDelay,
    clearRecordingSteps,
    saveMacro
  } = useMacro();

  const recordClick = useCallback((target: string, label?: string) => {
    addRecordingStep({
      type: 'click',
      target,
      meta: { label: label || `Clique em ${target}` }
    });
  }, [addRecordingStep]);

  const recordSetValue = useCallback((target: string, value: string, label?: string) => {
    addRecordingStep({
      type: 'setValue',
      target,
      value,
      meta: { label: label || `Definir ${target} = ${value}` }
    });
  }, [addRecordingStep]);

  const recordToggle = useCallback((target: string, label?: string) => {
    addRecordingStep({
      type: 'toggle',
      target,
      meta: { label: label || `Alternar ${target}` }
    });
  }, [addRecordingStep]);

  const recordSelect = useCallback((target: string, value: string, label?: string) => {
    addRecordingStep({
      type: 'select',
      target,
      value,
      meta: { label: label || `Selecionar ${value} em ${target}` }
    });
  }, [addRecordingStep]);

  const recordNavigate = useCallback((route: string, label?: string) => {
    addRecordingStep({
      type: 'navigate',
      value: route,
      meta: { label: label || `Navegar para ${route}` }
    });
  }, [addRecordingStep]);

  const recordCallAction = useCallback((actionName: string, params?: Record<string, unknown>, label?: string) => {
    addRecordingStep({
      type: 'callAction',
      target: actionName,
      params,
      meta: { label: label || `Executar ação ${actionName}` }
    });
  }, [addRecordingStep]);

  const recordWait = useCallback((ms: number) => {
    insertDelay(ms);
  }, [insertDelay]);

  return {
    isRecording,
    recordingSteps,
    startRecording,
    stopRecording,
    clearRecordingSteps,
    saveMacro,
    recordClick,
    recordSetValue,
    recordToggle,
    recordSelect,
    recordNavigate,
    recordCallAction,
    recordWait
  };
}
