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

export function ElementSelector({ isActive, onSelect, onCancel }: ElementSelectorProps) {
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  
  // Estado para modo de digitação - usuário digita manualmente no campo
  const [typingMode, setTypingMode] = useState<{
    element: HTMLElement;
    selector: string;
    info: ElementInfo;
  } | null>(null);
  const [confirmButtonPos, setConfirmButtonPos] = useState<{ top: number; left: number } | null>(null);
  
  const menuRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (selectedElement || typingMode) return;
    
    const target = e.target as HTMLElement;
    
    if (target.closest('[data-element-selector]')) {
      setHoveredElement(null);
      return;
    }
    
    setHoveredElement(target);
  }, [selectedElement, typingMode]);

  const handleClick = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Permite cliques no seletor
    if (target.closest('[data-element-selector]')) {
      return;
    }
    
    // Se estiver no modo de digitação, permite cliques normais no campo
    if (typingMode) {
      // Permite o clique normal para o usuário poder clicar no input
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
  }, [typingMode]);

  const handleAction = (action: 'click' | 'type') => {
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
      // Modo de digitação: mantém elemento selecionado, mostra botão confirmar
      // O usuário pode agora clicar no campo e digitar normalmente
      setTypingMode({
        element,
        selector,
        info: elementInfo
      });
      
      // Posiciona botão de confirmar próximo ao elemento
      const rect = element.getBoundingClientRect();
      setConfirmButtonPos({
        top: rect.bottom + 8 + window.scrollY,
        left: rect.left + window.scrollX
      });
    }
  };

  const confirmTyping = () => {
    if (!typingMode) return;
    
    const element = typingMode.element;
    let typedValue = '';
    
    // Lê o valor que o usuário digitou no campo
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      typedValue = element.value;
    } else if (element.isContentEditable) {
      typedValue = element.textContent || '';
    }
    
    onSelect(
      typingMode.selector, 
      typingMode.info, 
      typingMode.element, 
      'type', 
      typedValue
    );
    
    // Limpa estados
    setTypingMode(null);
    setConfirmButtonPos(null);
    setSelectedElement(null);
    setHoveredElement(null);
  };

  const cancelTyping = () => {
    setTypingMode(null);
    setConfirmButtonPos(null);
    setSelectedElement(null);
    setHoveredElement(null);
  };

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
      setTypingMode(null);
      setConfirmButtonPos(null);
      return;
    }

    // Bloqueia eventos apenas quando não estamos no modo de digitação
    const blockEvent = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-element-selector]')) {
        return;
      }
      // Não bloqueia se estiver no modo de digitação
      if (typingMode) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    
    // Só bloqueia mousedown/pointerdown quando não está em modo de digitação
    if (!typingMode) {
      document.addEventListener('mousedown', blockEvent, true);
      document.addEventListener('pointerdown', blockEvent, true);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('mousedown', blockEvent, true);
      document.removeEventListener('pointerdown', blockEvent, true);
    };
  }, [isActive, handleMouseMove, handleClick, typingMode]);

  // Highlight do elemento
  useEffect(() => {
    const targetElement = typingMode?.element || selectedElement || hoveredElement;
    if (!targetElement) return;

    const originalOutline = targetElement.style.outline;
    const originalOutlineOffset = targetElement.style.outlineOffset;
    
    const color = typingMode 
      ? 'hsl(142, 76%, 36%)' // Verde para modo digitação
      : selectedElement 
        ? 'hsl(var(--destructive))' 
        : 'hsl(var(--primary))';
    
    targetElement.style.outline = `3px solid ${color}`;
    targetElement.style.outlineOffset = '2px';

    return () => {
      targetElement.style.outline = originalOutline;
      targetElement.style.outlineOffset = originalOutlineOffset;
    };
  }, [hoveredElement, selectedElement, typingMode]);

  if (!isActive) return null;

  return (
    <>
      <div 
        data-element-selector
        className="fixed inset-0 z-[999999] pointer-events-none"
      >
        {/* Barra de instrução */}
        {!typingMode && (
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
        {selectedElement && menuPosition && !typingMode && (
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
                onClick={() => handleAction('click')}
              >
                <MousePointerClick className="h-4 w-4 text-primary" />
                Clicar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="justify-start gap-2 h-8"
                onClick={() => handleAction('type')}
              >
                <Type className="h-4 w-4 text-primary" />
                Digitar
              </Button>
            </div>
          </div>
        )}

        {/* Info do elemento hover */}
        {hoveredElement && !selectedElement && !typingMode && (
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

      {/* Botão de confirmar digitação - renderizado via portal */}
      {typingMode && confirmButtonPos && createPortal(
        <div
          data-element-selector
          className="fixed z-[9999999] pointer-events-auto"
          style={{
            top: confirmButtonPos.top,
            left: confirmButtonPos.left
          }}
        >
          <div className="bg-background border rounded-lg shadow-xl p-3 flex flex-col gap-2 min-w-[200px]">
            <p className="text-sm text-muted-foreground">
              Digite no campo acima e confirme
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={confirmTyping}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4 mr-1" />
                Confirmar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={cancelTyping}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Instrução flutuante no modo digitação */}
      {typingMode && createPortal(
        <div
          data-element-selector
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999999] pointer-events-none"
        >
          <div className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-3">
            <Type className="h-5 w-5" />
            <span className="font-medium">
              Clique no campo destacado e digite. Depois clique em Confirmar.
            </span>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
