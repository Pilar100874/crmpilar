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
  
  // Tenta primeiro por data-macro-id (escapando caracteres especiais)
  try {
    const escapedTarget = CSS.escape(step.target);
    element = document.querySelector(`[data-macro-id="${escapedTarget}"]`);
  } catch {
    // Seletor inválido
  }
  
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

// Função auxiliar para aguardar elemento aparecer
async function waitForElement(
  findFn: () => HTMLElement | null,
  timeout: number = 5000
): Promise<HTMLElement | null> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const element = findFn();
    if (element) return element;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return null;
}

// Função para encontrar elemento por diversos métodos
function findElement(target: string): HTMLElement | null {
  let element: HTMLElement | null = null;
  
  // Primeiro verifica se é um seletor :contains() (não é CSS válido)
  if (target.includes(':contains(')) {
    const match = target.match(/button:contains\("(.+)"\)/);
    if (match) {
      const searchText = match[1];
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent?.trim().includes(searchText)) {
          element = btn;
          break;
        }
      }
    }
  }
  
  // Se não encontrou, tenta por data-macro-id (escapando caracteres especiais)
  if (!element) {
    try {
      const escapedTarget = CSS.escape(target);
      element = document.querySelector(`[data-macro-id="${escapedTarget}"]`);
    } catch {
      // Seletor inválido
    }
  }
  
  // Se não encontrou, tenta como seletor CSS direto
  if (!element) {
    try {
      element = document.querySelector(target);
    } catch {
      // Seletor inválido
    }
  }
  
  // Tenta por texto em qualquer elemento clicável (incluindo itens de dropdown)
  if (!element) {
    const clickables = document.querySelectorAll('button, a, [role="button"], [role="option"], [role="menuitem"], [data-value], li, [onclick], div[class*="option"], div[class*="item"]');
    for (const el of clickables) {
      const text = el.textContent?.trim();
      if (text && text === target) {
        element = el as HTMLElement;
        break;
      }
    }
  }
  
  // Tenta por texto parcial em elementos clicáveis
  if (!element) {
    const clickables = document.querySelectorAll('button, a, [role="button"], [role="option"], [role="menuitem"], [data-value], li, [onclick], div[class*="option"], div[class*="item"]');
    for (const el of clickables) {
      const text = el.textContent?.trim();
      if (text && text.includes(target)) {
        element = el as HTMLElement;
        break;
      }
    }
  }
  
  return element;
}

// Clicar em um elemento
async function executeClick(step: MacroStep): Promise<void> {
  const target = step.target || step.value;
  if (!target) throw new Error('Seletor do elemento não definido');
  
  let element: HTMLElement | null = null;
  
  // Se deve aguardar elemento aparecer
  if (step.waitForElement) {
    const timeout = step.waitTimeout || 5000;
    element = await waitForElement(() => findElement(target), timeout);
  } else {
    element = findElement(target);
  }
  
  if (!element) throw new Error(`Elemento não encontrado: ${target}`);
  
  // Simula o clique
  element.focus();
  element.click();
  
  await new Promise(resolve => setTimeout(resolve, 300));
}

// Selecionar item de dropdown (digita e aguarda resultado)
async function executeSelectDropdownItem(step: MacroStep): Promise<void> {
  if (!step.target) throw new Error('Seletor do campo de busca não definido');
  if (!step.value) throw new Error('Valor para selecionar não definido');
  
  // Primeiro, encontra o campo de busca
  let searchField: HTMLElement | null = null;
  
  try {
    const escapedTarget = CSS.escape(step.target);
    searchField = document.querySelector(`[data-macro-id="${escapedTarget}"]`);
  } catch {
    // Seletor inválido
  }
  
  if (!searchField) {
    try {
      searchField = document.querySelector(step.target);
    } catch {
      // Seletor inválido
    }
  }
  
  if (!searchField) {
    const inputs = document.querySelectorAll('input, textarea');
    for (const input of inputs) {
      if ((input as HTMLInputElement).placeholder?.toLowerCase().includes(step.target.toLowerCase())) {
        searchField = input as HTMLElement;
        break;
      }
    }
  }
  
  if (!searchField) throw new Error(`Campo de busca não encontrado: ${step.target}`);
  
  // Foca e digita no campo
  searchField.focus();
  searchField.click();
  const inputEl = searchField as HTMLInputElement;
  
  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  )?.set;
  
  if (nativeSetter) {
    nativeSetter.call(inputEl, step.value);
  } else {
    inputEl.value = step.value;
  }
  
  inputEl.dispatchEvent(new Event('input', { bubbles: true }));
  inputEl.dispatchEvent(new Event('change', { bubbles: true }));
  inputEl.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
  
  // Aguarda dropdown aparecer
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const dropdownItem = await waitForElement(() => {
    // Busca ampla por itens de dropdown - inclui portals e popovers
    const selectors = [
      // Radix UI / shadcn
      '[data-radix-popper-content-wrapper] [role="option"]',
      '[data-radix-popper-content-wrapper] [role="listitem"]',
      '[data-radix-popper-content-wrapper] [cmdk-item]',
      '[data-radix-menu-content] [role="menuitem"]',
      // Portals genéricos
      '[data-portal] [role="option"]',
      '[data-portal] li',
      // Popovers
      '[data-state="open"] [role="option"]',
      '[data-state="open"] [role="listitem"]',
      // Command/Combobox shadcn
      '[cmdk-list] [cmdk-item]',
      '[cmdk-group] [cmdk-item]',
      // Classes comuns
      '.popover-content li',
      '.dropdown-content li',
      '[class*="popover"] li',
      '[class*="dropdown"] li',
      '[class*="listbox"] li',
      '[class*="menu"] [role="menuitem"]',
      // Genéricos
      '[role="listbox"] [role="option"]',
      '[role="menu"] [role="menuitem"]',
      'ul[role="listbox"] li',
      'div[role="listbox"] > div'
    ];
    
    for (const selector of selectors) {
      try {
        const items = document.querySelectorAll(selector);
        for (const item of items) {
          const text = item.textContent?.trim();
          if (text && text.toLowerCase().includes(step.value!.toLowerCase())) {
            // Verifica se o elemento está visível
            const rect = item.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              return item as HTMLElement;
            }
          }
        }
      } catch {
        // Seletor inválido, continua
      }
    }
    
    // Fallback: busca qualquer elemento com o texto que seja clicável
    const allElements = document.querySelectorAll('*');
    for (const el of allElements) {
      const text = el.textContent?.trim();
      const rect = el.getBoundingClientRect();
      
      // Elemento visível com texto correspondente
      if (text && 
          text.toLowerCase() === step.value!.toLowerCase() && 
          rect.width > 0 && 
          rect.height > 0 &&
          rect.width < 500 && // Não é um container grande
          rect.height < 100) {
        const style = window.getComputedStyle(el);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          return el as HTMLElement;
        }
      }
    }
    
    return null;
  }, step.waitTimeout || 5000);
  
  if (!dropdownItem) throw new Error(`Item do dropdown não encontrado: ${step.value}`);
  
  // Clica no item
  dropdownItem.click();
  await new Promise(resolve => setTimeout(resolve, 300));
  await new Promise(resolve => setTimeout(resolve, 300));
}

async function executeStep(step: MacroStep): Promise<void> {
  switch (step.type) {
    case 'navigate':
      await executeNavigate(step);
      break;
    case 'typeText':
      await executeTypeText(step);
      break;
    case 'click':
      await executeClick(step);
      break;
    case 'selectDropdownItem':
      await executeSelectDropdownItem(step);
      break;
    default:
      throw new Error(`Tipo de step desconhecido: ${step.type}`);
  }
}

export async function runMacro(macro: Macro): Promise<void> {
  isExecutionCancelled = false;
  
  const enabledSteps = macro.steps.filter(s => s.enabled !== false);
  await runMacroSteps(enabledSteps);
}

export async function runMacroSteps(steps: MacroStep[]): Promise<void> {
  isExecutionCancelled = false;
  
  const enabledSteps = steps.filter(s => s.enabled !== false);
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
    case 'click':
      return `Clicar em: ${step.target || step.value}`;
    case 'selectDropdownItem':
      return `Selecionar "${step.value}" no dropdown ${step.target}`;
    default:
      return `Step: ${step.type}`;
  }
}
