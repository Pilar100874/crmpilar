// Motor de execução de Macros

import { Macro, MacroStep, MacroExecutionStatus } from '@/types/macro';
import { ActionRegistry } from './ActionRegistry';

const MAX_RETRIES = 3;
const RETRY_DELAY = 200;

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

async function waitForElement(target: string, retries = MAX_RETRIES): Promise<HTMLElement | null> {
  for (let i = 0; i < retries; i++) {
    let element: Element | null = null;
    
    // Tenta primeiro por data-macro-id
    element = document.querySelector(`[data-macro-id="${target}"]`);
    
    // Se não encontrar, tenta como seletor CSS direto
    if (!element) {
      try {
        // Suporta seletores como #id, .classe, tag.classe, [name="x"], etc.
        element = document.querySelector(target);
      } catch {
        // Seletor inválido, ignora
      }
    }
    
    // Se ainda não encontrar, tenta por texto (formato tag:texto)
    if (!element && target.includes(':')) {
      const colonIndex = target.indexOf(':');
      const tagPart = target.substring(0, colonIndex);
      const textPart = target.substring(colonIndex + 1);
      const tag = tagPart.replace(/\./g, ' ').trim().split(' ')[0] || '*';
      const text = textPart.trim();
      if (text) {
        const elements = document.querySelectorAll(tag);
        for (const el of elements) {
          if (el.textContent?.trim().startsWith(text)) {
            element = el;
            break;
          }
        }
      }
    }
    
    // Verifica se é um HTMLElement válido com método click
    if (element && element instanceof HTMLElement) {
      return element;
    }
    
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
  }
  return null;
}

async function executeClick(step: MacroStep): Promise<void> {
  if (!step.target) throw new Error('Target não definido para click');
  
  const element = await waitForElement(step.target);
  if (!element) throw new Error(`Elemento não encontrado: ${step.target}`);
  
  // Garante que o elemento é clicável
  if (typeof element.click === 'function') {
    element.click();
  } else {
    // Fallback: dispara evento de clique manualmente
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  }
}

async function executeSetValue(step: MacroStep): Promise<void> {
  if (!step.target) throw new Error('Target não definido para setValue');
  
  const element = await waitForElement(step.target) as HTMLInputElement | HTMLTextAreaElement;
  if (!element) throw new Error(`Elemento não encontrado: ${step.target}`);
  
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  )?.set;
  
  const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    'value'
  )?.set;
  
  if (element.tagName === 'INPUT' && nativeInputValueSetter) {
    nativeInputValueSetter.call(element, step.value || '');
  } else if (element.tagName === 'TEXTAREA' && nativeTextAreaValueSetter) {
    nativeTextAreaValueSetter.call(element, step.value || '');
  } else {
    element.value = step.value || '';
  }
  
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

async function executeToggle(step: MacroStep): Promise<void> {
  if (!step.target) throw new Error('Target não definido para toggle');
  
  const element = await waitForElement(step.target) as HTMLInputElement;
  if (!element) throw new Error(`Elemento não encontrado: ${step.target}`);
  
  element.click();
}

async function executeSelect(step: MacroStep): Promise<void> {
  if (!step.target) throw new Error('Target não definido para select');
  
  const element = await waitForElement(step.target) as HTMLSelectElement;
  if (!element) throw new Error(`Elemento não encontrado: ${step.target}`);
  
  // Tenta clicar primeiro (para abrir selects customizados)
  element.click();
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Se for um select nativo
  if (element.tagName === 'SELECT') {
    element.value = step.value || '';
    element.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    // Para selects customizados (Radix, etc), procura a opção
    const option = document.querySelector(`[data-macro-id="${step.target}-option-${step.value}"]`) as HTMLElement;
    if (option) {
      option.click();
    }
  }
}

async function executeNavigate(step: MacroStep): Promise<void> {
  if (!step.value) throw new Error('Rota não definida para navigate');
  
  // Usa window.location para navegação
  window.location.href = step.value;
  
  // Aguarda um pouco para a navegação
  await new Promise(resolve => setTimeout(resolve, 500));
}

async function executeCallAction(step: MacroStep): Promise<void> {
  if (!step.target) throw new Error('Nome da ação não definido para callAction');
  
  await ActionRegistry.execute(step.target, step.params);
}

async function executeWait(step: MacroStep): Promise<void> {
  const ms = step.ms || 500;
  await new Promise(resolve => setTimeout(resolve, ms));
}

async function executeStep(step: MacroStep): Promise<void> {
  switch (step.type) {
    case 'click':
      await executeClick(step);
      break;
    case 'setValue':
      await executeSetValue(step);
      break;
    case 'toggle':
      await executeToggle(step);
      break;
    case 'select':
      await executeSelect(step);
      break;
    case 'navigate':
      await executeNavigate(step);
      break;
    case 'callAction':
      await executeCallAction(step);
      break;
    case 'wait':
      await executeWait(step);
      break;
    default:
      throw new Error(`Tipo de step desconhecido: ${(step as MacroStep).type}`);
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
        error: 'Execução cancelada pelo usuário'
      });
      return;
    }
    
    const step = enabledSteps[i];
    
    updateStatus({
      isRunning: true,
      currentStep: i + 1,
      totalSteps,
      currentStepLabel: step.meta?.label || `${step.type}: ${step.target || step.value || ''}`
    });
    
    try {
      await executeStep(step);
      // Pequeno delay entre steps para estabilidade
      await new Promise(resolve => setTimeout(resolve, 50));
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
  switch (step.type) {
    case 'click':
      return `Clique em "${step.target}"`;
    case 'setValue':
      return `Definir "${step.target}" = "${step.value}"`;
    case 'toggle':
      return `Alternar "${step.target}"`;
    case 'select':
      return `Selecionar "${step.value}" em "${step.target}"`;
    case 'navigate':
      return `Navegar para "${step.value}"`;
    case 'callAction':
      return `Executar ação "${step.target}"`;
    case 'wait':
      return `Aguardar ${step.ms}ms`;
    default:
      return `Step: ${step.type}`;
  }
}
