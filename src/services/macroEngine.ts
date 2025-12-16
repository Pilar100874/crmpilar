// Motor de execução de Macros - Versão Simplificada

import { Macro, MacroStep, MacroExecutionStatus } from '@/types/macro';

let isExecutionCancelled = false;
let statusCallback: ((status: MacroExecutionStatus) => void) | null = null;

export function setExecutionStatusCallback(callback: (status: MacroExecutionStatus) => void) {
  statusCallback = callback;
}

export function cancelExecution() {
  isExecutionCancelled = true;
}

function updateStatus(status: MacroExecutionStatus) {
  if (statusCallback) {
    statusCallback(status);
  }
}

// Navegar para uma rota
async function executeNavigate(step: MacroStep): Promise<void> {
  if (!step.value) throw new Error('Rota não definida');
  
  // Usa pushState para navegação SPA
  window.history.pushState({}, '', step.value);
  window.dispatchEvent(new PopStateEvent('popstate'));
  
  // Aguarda a navegação
  await new Promise(resolve => setTimeout(resolve, 800));
}

// Digitar texto em um elemento
async function executeTypeText(step: MacroStep): Promise<void> {
  if (!step.target) throw new Error('Seletor do elemento não definido');
  
  // Tenta encontrar o elemento
  let element: HTMLElement | null = null;
  
  // Tenta primeiro por data-macro-id
  element = document.querySelector(`[data-macro-id="${step.target}"]`);
  
  // Se não encontrou, tenta como seletor CSS direto
  if (!element) {
    try {
      element = document.querySelector(step.target);
    } catch {
      // Seletor inválido
    }
  }
  
  // Se não encontrou, tenta por placeholder
  if (!element) {
    const inputs = document.querySelectorAll('input, textarea');
    for (const input of inputs) {
      if ((input as HTMLInputElement).placeholder?.toLowerCase().includes(step.target.toLowerCase())) {
        element = input as HTMLElement;
        break;
      }
    }
  }
  
  if (!element) throw new Error(`Elemento não encontrado: ${step.target}`);
  
  // Foca no elemento
  element.focus();
  
  // Define o valor
  const inputEl = element as HTMLInputElement | HTMLTextAreaElement;
  
  // Usa o setter nativo para garantir compatibilidade com React
  const nativeSetter = Object.getOwnPropertyDescriptor(
    element.tagName === 'TEXTAREA' 
      ? window.HTMLTextAreaElement.prototype 
      : window.HTMLInputElement.prototype,
    'value'
  )?.set;
  
  if (nativeSetter) {
    nativeSetter.call(inputEl, step.value || '');
  } else {
    inputEl.value = step.value || '';
  }
  
  // Dispara eventos
  inputEl.dispatchEvent(new Event('input', { bubbles: true }));
  inputEl.dispatchEvent(new Event('change', { bubbles: true }));
  
  await new Promise(resolve => setTimeout(resolve, 100));
}

async function executeStep(step: MacroStep): Promise<void> {
  switch (step.type) {
    case 'navigate':
      await executeNavigate(step);
      break;
    case 'typeText':
      await executeTypeText(step);
      break;
    default:
      throw new Error(`Tipo de step desconhecido: ${step.type}`);
  }
}

export async function runMacro(macro: Macro): Promise<void> {
  isExecutionCancelled = false;
  
  const enabledSteps = macro.steps.filter(s => s.enabled !== false);
  const totalSteps = enabledSteps.length;
  
  for (let i = 0; i < totalSteps; i++) {
    if (isExecutionCancelled) {
      updateStatus({
        isRunning: false,
        currentStep: i,
        totalSteps,
        error: 'Execução cancelada'
      });
      return;
    }
    
    const step = enabledSteps[i];
    
    updateStatus({
      isRunning: true,
      currentStep: i + 1,
      totalSteps,
      currentStepLabel: step.label || (step.type === 'navigate' ? `Navegar: ${step.value}` : `Digitar: ${step.value}`)
    });
    
    try {
      await executeStep(step);
    } catch (error) {
      updateStatus({
        isRunning: false,
        currentStep: i + 1,
        totalSteps,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      throw error;
    }
  }
  
  updateStatus({
    isRunning: false,
    currentStep: totalSteps,
    totalSteps
  });
}

export function getStepLabel(step: MacroStep): string {
  if (step.label) return step.label;
  
  switch (step.type) {
    case 'navigate':
      return `Abrir tela: ${step.value}`;
    case 'typeText':
      return `Digitar "${step.value}" em ${step.target}`;
    default:
      return `Step: ${step.type}`;
  }
}
