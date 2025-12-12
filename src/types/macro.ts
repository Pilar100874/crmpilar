// Tipos para o sistema de Macros

export type MacroStepType = 
  | 'click'
  | 'setValue'
  | 'toggle'
  | 'select'
  | 'navigate'
  | 'callAction'
  | 'wait';

export interface MacroStep {
  id: string;
  type: MacroStepType;
  target?: string; // data-macro-id do elemento
  value?: string; // para setValue/select
  ms?: number; // para wait
  params?: Record<string, unknown>; // para callAction
  meta?: {
    label?: string;
    screen?: string;
  };
  enabled?: boolean;
}

export interface Macro {
  id: string;
  name: string;
  description?: string;
  shortcut?: string;
  enabled: boolean;
  steps: MacroStep[];
  createdAt: string;
  updatedAt: string;
}

export interface MacroExecutionStatus {
  isRunning: boolean;
  currentStep: number;
  totalSteps: number;
  currentStepLabel?: string;
  error?: string;
}

export interface MacroRecordingState {
  isRecording: boolean;
  steps: MacroStep[];
  macroName: string;
}
