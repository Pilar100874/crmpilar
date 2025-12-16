import { useState, useEffect, useCallback, useRef } from 'react';
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
  const [typingMode, setTypingMode] = useState<{ element: HTMLElement; selector: string; info: ElementInfo; initialValue: string } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Bloqueador agressivo de eventos para evitar fechamento de popups
  const blockAllEvents = useCallback((e: Event) => {
    const target = e.target as HTMLElement;
    
    // Permite interação com o seletor
    if (target.closest('[data-element-selector]')) {
      return;
    }
    
    // Em modo digitação, permite interação com o input selecionado
    if (typingMode) {
      const inputEl = typingMode.element;
      if (target === inputEl || inputEl.contains(target) || target.contains(inputEl)) {
        return;
      }
    }
    
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }, [typingMode]);

  const handleClick = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Permite cliques no seletor
    if (target.closest('[data-element-selector]')) {
      return;
    }
    
    // Em modo digitação, permite cliques no input
    if (typingMode) {
      const inputEl = typingMode.element;
      if (target === inputEl || inputEl.contains(target) || target.contains(inputEl)) {
        return;
      }
    }
    
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    // Só seleciona elemento se não estiver em modo digitação
    if (!typingMode) {
      const rect = target.getBoundingClientRect();
      setSelectedElement(target);
      setMenuPosition({
        top: rect.top + window.scrollY,
        left: rect.right + 8 + window.scrollX
      });
    }
  }, [typingMode]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (selectedElement || typingMode) return;
    
    const target = e.target as HTMLElement;
    
    if (target.closest('[data-element-selector]')) {
      setHoveredElement(null);
      return;
    }
    
    setHoveredElement(target);
  }, [selectedElement, typingMode]);

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
    
    if (action === 'click') {
      setSelectedElement(null);
      setMenuPosition(null);
      setHoveredElement(null);
      onSelect(selector, elementInfo, element, 'click');
    } else {
      // Entra em modo digitação
      const isInput = element.tagName === 'INPUT' || element.tagName === 'TEXTAREA';
      if (isInput) {
        const input = element as HTMLInputElement;
        // IMPORTANTE: NÃO limpa estados - mantém tudo como está
        // Apenas adiciona o modo digitação
        setTypingMode({
          element,
          selector,
          info: elementInfo,
          initialValue: input.value
        });
        // Esconde o menu mas mantém selectedElement
        setMenuPosition(null);
      } else {
        setSelectedElement(null);
        setMenuPosition(null);
        setHoveredElement(null);
        onSelect(selector, elementInfo, element, 'click');
      }
    }
  };

  const confirmTyping = () => {
    if (!typingMode) return;
    
    const input = typingMode.element as HTMLInputElement;
    const typedValue = input.value;
    
    setTypingMode(null);
    setSelectedElement(null);
    setHoveredElement(null);
    onSelect(typingMode.selector, typingMode.info, typingMode.element, 'type', typedValue);
  };

  const cancelTyping = () => {
    if (!typingMode) return;
    
    // Restaura valor original
    const input = typingMode.element as HTMLInputElement;
    input.value = typingMode.initialValue;
    setTypingMode(null);
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
      return;
    }

    // Bloqueia todos os eventos que podem fechar popups
    const eventsToBlock = ['mousedown', 'pointerdown', 'focusin', 'focusout', 'blur'];
    
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    eventsToBlock.forEach(evt => {
      document.addEventListener(evt, blockAllEvents, true);
    });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('click', handleClick, true);
      eventsToBlock.forEach(evt => {
        document.removeEventListener(evt, blockAllEvents, true);
      });
    };
  }, [isActive, handleMouseMove, blockAllEvents, handleClick]);

  // Highlight do elemento
  useEffect(() => {
    const targetElement = typingMode?.element || selectedElement || hoveredElement;
    if (!targetElement) return;

    const originalOutline = targetElement.style.outline;
    const originalOutlineOffset = targetElement.style.outlineOffset;
    
    const color = typingMode ? 'hsl(var(--primary))' : 
                  selectedElement ? 'hsl(var(--destructive))' : 
                  'hsl(var(--primary))';
    
    targetElement.style.outline = `3px solid ${color}`;
    targetElement.style.outlineOffset = '2px';

    return () => {
      targetElement.style.outline = originalOutline;
      targetElement.style.outlineOffset = originalOutlineOffset;
    };
  }, [hoveredElement, selectedElement, typingMode]);

  if (!isActive) return null;

  return (
    <div 
      data-element-selector
      className="fixed inset-0 z-[999999] pointer-events-none"
    >
      {/* Barra de instrução */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 pointer-events-auto">
        <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-3">
          <MousePointer2 className="h-5 w-5 animate-pulse" />
          <span className="font-medium">
            {typingMode ? 'Digite e clique ✓' : 
             selectedElement ? 'Escolha a ação' : 
             'Clique no elemento'}
          </span>
          {typingMode ? (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={confirmTyping}
                className="h-7 px-2 hover:bg-primary-foreground/20"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={cancelTyping}
                className="h-7 px-2 hover:bg-primary-foreground/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
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
          )}
        </div>
      </div>

      {/* Menu de ações ao lado do elemento */}
      {selectedElement && menuPosition && (
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
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAction('click');
              }}
            >
              <MousePointerClick className="h-4 w-4 text-primary" />
              Clicar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="justify-start gap-2 h-8"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAction('type');
              }}
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
  );
}
