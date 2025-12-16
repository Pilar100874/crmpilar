import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { X, MousePointer2, MousePointerClick, Type, Check } from 'lucide-react';

interface ElementSelectorProps {
  isActive: boolean;
  onSelect: (selector: string, elementInfo: ElementInfo, element: HTMLElement, action: 'click' | 'type', typedValue?: string) => void;
  onCancel: () => void;
}

export interface ElementInfo {
  selector: string;
  tagName: string;
  type?: string;
  placeholder?: string;
  text?: string;
  id?: string;
  className?: string;
}

function generateSelector(element: HTMLElement): string {
  if (element.getAttribute('data-macro-id')) {
    return `[data-macro-id="${element.getAttribute('data-macro-id')}"]`;
  }
  
  if (element.id && document.querySelectorAll(`#${CSS.escape(element.id)}`).length === 1) {
    return `#${element.id}`;
  }
  
  const placeholder = element.getAttribute('placeholder');
  if (placeholder && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
    const selector = `${element.tagName.toLowerCase()}[placeholder="${placeholder}"]`;
    if (document.querySelectorAll(selector).length === 1) {
      return selector;
    }
  }
  
  const name = element.getAttribute('name');
  if (name) {
    const selector = `[name="${name}"]`;
    if (document.querySelectorAll(selector).length === 1) {
      return selector;
    }
  }
  
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) {
    const selector = `[aria-label="${ariaLabel}"]`;
    if (document.querySelectorAll(selector).length === 1) {
      return selector;
    }
  }
  
  if (element.tagName === 'BUTTON' || element.getAttribute('role') === 'button') {
    const text = element.textContent?.trim();
    if (text && text.length < 50) {
      return `button:contains("${text}")`;
    }
  }
  
  const path: string[] = [];
  let current: HTMLElement | null = element;
  
  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    
    if (current.className && typeof current.className === 'string') {
      const classes = current.className.split(' ')
        .filter(c => c && !c.startsWith('hover:') && !c.includes(':'))
        .slice(0, 2)
        .join('.');
      if (classes) {
        selector += `.${classes}`;
      }
    }
    
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        child => child.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }
    
    path.unshift(selector);
    current = parent;
    
    if (path.length >= 4) break;
  }
  
  return path.join(' > ');
}

// Container para o botão de confirmar - criado fora do React para não causar re-renders
let confirmContainer: HTMLDivElement | null = null;

function createConfirmButton(
  element: HTMLElement, 
  onConfirm: () => void, 
  onCancel: () => void
) {
  // Remove container existente
  if (confirmContainer) {
    confirmContainer.remove();
  }
  
  // Cria novo container
  confirmContainer = document.createElement('div');
  confirmContainer.setAttribute('data-element-selector', 'true');
  confirmContainer.style.cssText = `
    position: fixed;
    z-index: 9999999;
    pointer-events: auto;
  `;
  
  const rect = element.getBoundingClientRect();
  confirmContainer.style.top = `${rect.bottom + 8}px`;
  confirmContainer.style.left = `${rect.left}px`;
  
  confirmContainer.innerHTML = `
    <div style="background: hsl(var(--background)); border: 1px solid hsl(var(--border)); border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); padding: 12px; min-width: 220px;">
      <p style="font-size: 13px; color: hsl(var(--muted-foreground)); margin-bottom: 8px;">
        Digite no campo acima e confirme
      </p>
      <div style="display: flex; gap: 8px;">
        <button id="confirm-typing-btn" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 4px; padding: 8px 12px; background: hsl(142, 76%, 36%); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          Confirmar
        </button>
        <button id="cancel-typing-btn" style="padding: 8px 12px; background: transparent; border: 1px solid hsl(var(--border)); border-radius: 6px; cursor: pointer;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(confirmContainer);
  
  // Adiciona listeners
  const confirmBtn = confirmContainer.querySelector('#confirm-typing-btn');
  const cancelBtn = confirmContainer.querySelector('#cancel-typing-btn');
  
  confirmBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onConfirm();
  });
  
  cancelBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onCancel();
  });
}

function removeConfirmButton() {
  if (confirmContainer) {
    confirmContainer.remove();
    confirmContainer = null;
  }
}

// Instrução flutuante para modo digitação
let instructionContainer: HTMLDivElement | null = null;

function createInstruction() {
  if (instructionContainer) return;
  
  instructionContainer = document.createElement('div');
  instructionContainer.setAttribute('data-element-selector', 'true');
  instructionContainer.style.cssText = `
    position: fixed;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999999;
    pointer-events: none;
  `;
  
  instructionContainer.innerHTML = `
    <div style="background: hsl(142, 76%, 36%); color: white; padding: 8px 16px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); display: flex; align-items: center; gap: 12px; font-size: 14px; font-weight: 500;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>
      Clique no campo destacado e digite. Depois clique em Confirmar.
    </div>
  `;
  
  document.body.appendChild(instructionContainer);
}

function removeInstruction() {
  if (instructionContainer) {
    instructionContainer.remove();
    instructionContainer = null;
  }
}

export function ElementSelector({ isActive, onSelect, onCancel }: ElementSelectorProps) {
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  
  // Refs para modo digitação - evita re-renders
  const typingModeRef = useRef<{
    element: HTMLElement;
    selector: string;
    info: ElementInfo;
  } | null>(null);
  const [isTypingMode, setIsTypingMode] = useState(false);
  
  const menuRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (selectedElement || typingModeRef.current) return;
    
    const target = e.target as HTMLElement;
    
    if (target.closest('[data-element-selector]')) {
      setHoveredElement(null);
      return;
    }
    
    setHoveredElement(target);
  }, [selectedElement]);

  const handleClick = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Permite cliques no seletor
    if (target.closest('[data-element-selector]')) {
      return;
    }
    
    // Se estiver no modo de digitação, permite cliques normais
    if (typingModeRef.current) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    const rect = target.getBoundingClientRect();
    setSelectedElement(target);
    setMenuPosition({
      top: rect.top + window.scrollY,
      left: rect.right + 8 + window.scrollX
    });
  }, []);

  const confirmTyping = useCallback(() => {
    if (!typingModeRef.current) return;
    
    const { element, selector, info } = typingModeRef.current;
    let typedValue = '';
    
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      typedValue = element.value;
    } else if (element.isContentEditable) {
      typedValue = element.textContent || '';
    }
    
    // Limpa
    element.style.outline = '';
    element.style.outlineOffset = '';
    removeConfirmButton();
    removeInstruction();
    typingModeRef.current = null;
    setIsTypingMode(false);
    setSelectedElement(null);
    setHoveredElement(null);
    
    onSelect(selector, info, element, 'type', typedValue);
  }, [onSelect]);

  const cancelTyping = useCallback(() => {
    if (typingModeRef.current) {
      typingModeRef.current.element.style.outline = '';
      typingModeRef.current.element.style.outlineOffset = '';
    }
    removeConfirmButton();
    removeInstruction();
    typingModeRef.current = null;
    setIsTypingMode(false);
    setSelectedElement(null);
    setHoveredElement(null);
  }, []);

  const handleAction = useCallback((action: 'click' | 'type') => {
    if (!selectedElement) return;
    
    const element = selectedElement;
    const selector = generateSelector(element);
    const elementInfo: ElementInfo = {
      selector,
      tagName: element.tagName,
      type: element.getAttribute('type') || undefined,
      placeholder: element.getAttribute('placeholder') || undefined,
      text: element.textContent?.trim().slice(0, 50) || undefined,
      id: element.id || undefined,
      className: element.className?.toString().slice(0, 100) || undefined,
    };
    
    // Limpa menu
    setMenuPosition(null);
    
    if (action === 'click') {
      setSelectedElement(null);
      setHoveredElement(null);
      onSelect(selector, elementInfo, element, 'click');
    } else {
      // Modo digitação - usa DOM direto para não causar re-render
      typingModeRef.current = { element, selector, info: elementInfo };
      
      // Destaca elemento em verde
      element.style.outline = '3px solid hsl(142, 76%, 36%)';
      element.style.outlineOffset = '2px';
      
      // Cria botão de confirmar via DOM (não React)
      createConfirmButton(element, confirmTyping, cancelTyping);
      createInstruction();
      
      // Atualiza estado apenas para desabilitar bloqueio de eventos
      setIsTypingMode(true);
      setSelectedElement(null);
    }
  }, [selectedElement, onSelect, confirmTyping, cancelTyping]);

  const cancelSelection = () => {
    setSelectedElement(null);
    setMenuPosition(null);
    setHoveredElement(null);
  };

  useEffect(() => {
    if (!isActive) {
      setSelectedElement(null);
      setMenuPosition(null);
      setHoveredElement(null);
      setIsTypingMode(false);
      removeConfirmButton();
      removeInstruction();
      if (typingModeRef.current) {
        typingModeRef.current.element.style.outline = '';
        typingModeRef.current.element.style.outlineOffset = '';
        typingModeRef.current = null;
      }
      return;
    }

    const blockEvent = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-element-selector]')) {
        return;
      }
      // Não bloqueia se estiver no modo de digitação
      if (typingModeRef.current || isTypingMode) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    
    if (!isTypingMode) {
      document.addEventListener('mousedown', blockEvent, true);
      document.addEventListener('pointerdown', blockEvent, true);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('mousedown', blockEvent, true);
      document.removeEventListener('pointerdown', blockEvent, true);
    };
  }, [isActive, handleMouseMove, handleClick, isTypingMode]);

  // Highlight do elemento (apenas quando não está em typing mode)
  useEffect(() => {
    if (isTypingMode) return;
    
    const targetElement = selectedElement || hoveredElement;
    if (!targetElement) return;

    const originalOutline = targetElement.style.outline;
    const originalOutlineOffset = targetElement.style.outlineOffset;
    
    const color = selectedElement ? 'hsl(var(--destructive))' : 'hsl(var(--primary))';
    
    targetElement.style.outline = `3px solid ${color}`;
    targetElement.style.outlineOffset = '2px';

    return () => {
      targetElement.style.outline = originalOutline;
      targetElement.style.outlineOffset = originalOutlineOffset;
    };
  }, [hoveredElement, selectedElement, isTypingMode]);

  if (!isActive) return null;

  return (
    <>
      <div 
        data-element-selector
        className="fixed inset-0 z-[999999] pointer-events-none"
      >
        {/* Barra de instrução - apenas quando não está em typing mode */}
        {!isTypingMode && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 pointer-events-auto">
            <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-3">
              <MousePointer2 className="h-5 w-5 animate-pulse" />
              <span className="font-medium">
                {selectedElement ? 'Escolha a ação' : 'Clique no elemento'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (selectedElement) {
                    cancelSelection();
                  } else {
                    onCancel();
                  }
                }}
                className="h-7 px-2 hover:bg-primary-foreground/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Menu de ações ao lado do elemento */}
        {selectedElement && menuPosition && !isTypingMode && (
          <div 
            ref={menuRef}
            className="fixed pointer-events-auto z-[9999999]"
            style={{ 
              top: menuPosition.top,
              left: Math.min(menuPosition.left, window.innerWidth - 120)
            }}
          >
            <div className="bg-background border rounded-lg shadow-xl p-1 flex flex-col gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="justify-start gap-2 h-8"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAction('click'); }}
              >
                <MousePointerClick className="h-4 w-4 text-primary" />
                Clicar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="justify-start gap-2 h-8"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAction('type'); }}
              >
                <Type className="h-4 w-4 text-primary" />
                Digitar
              </Button>
            </div>
          </div>
        )}

        {/* Info do elemento hover */}
        {hoveredElement && !selectedElement && !isTypingMode && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
            <div className="bg-background border rounded-lg shadow-lg px-3 py-2 text-sm">
              <span className="text-muted-foreground">Elemento: </span>
              <span className="font-mono text-primary">
                {hoveredElement.tagName.toLowerCase()}
                {hoveredElement.id ? `#${hoveredElement.id}` : ''}
                {hoveredElement.getAttribute('placeholder') ? ` [${hoveredElement.getAttribute('placeholder')}]` : ''}
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
