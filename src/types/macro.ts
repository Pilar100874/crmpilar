// Tipos para o sistema de Macros - Versão Simplificada

export type MacroStepType = 'navigate' | 'typeText' | 'click' | 'selectDropdownItem';

export interface MacroStep {
  id: string;
  type: MacroStepType;
  value: string; // rota para navigate, texto para typeText
  target?: string; // seletor do elemento para typeText
  label?: string;
  enabled?: boolean;
  waitForElement?: boolean; // aguarda elemento aparecer antes de clicar
  waitTimeout?: number; // timeout em ms para aguardar elemento (default: 5000)
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
