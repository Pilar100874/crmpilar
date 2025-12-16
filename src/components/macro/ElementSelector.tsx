import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  // Novo: modo de input flutuante próprio
  const [floatingInput, setFloatingInput] = useState<{
    element: HTMLElement;
    selector: string;
    info: ElementInfo;
    position: { top: number; left: number };
  } | null>(null);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (selectedElement || floatingInput) return;
    
    const target = e.target as HTMLElement;
    
    if (target.closest('[data-element-selector]')) {
      setHoveredElement(null);
      return;
    }
    
    setHoveredElement(target);
  }, [selectedElement, floatingInput]);

  const handleClick = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Permite cliques no seletor
    if (target.closest('[data-element-selector]')) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    // Só seleciona elemento se não estiver em modo input
    if (!floatingInput) {
      const rect = target.getBoundingClientRect();
      setSelectedElement(target);
      setMenuPosition({
        top: rect.top + window.scrollY,
        left: rect.right + 8 + window.scrollX
      });
    }
  }, [floatingInput]);

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
      // Abre input flutuante próprio - NÃO tenta digitar no campo real
      const rect = element.getBoundingClientRect();
      setFloatingInput({
        element,
        selector,
        info: elementInfo,
        position: {
          top: rect.bottom + 8 + window.scrollY,
          left: rect.left + window.scrollX
        }
      });
      setInputValue('');
      setSelectedElement(null);
      setMenuPosition(null);
      setHoveredElement(null);
      
      // Foca no nosso input após renderizar
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const confirmInput = () => {
    if (!floatingInput) return;
    
    onSelect(
      floatingInput.selector, 
      floatingInput.info, 
      floatingInput.element, 
      'type', 
      inputValue
    );
    setFloatingInput(null);
    setInputValue('');
  };

  const cancelInput = () => {
    setFloatingInput(null);
    setInputValue('');
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
      setFloatingInput(null);
      setInputValue('');
      return;
    }

    // Bloqueia eventos apenas quando necessário
    const blockEvent = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-element-selector]')) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('mousedown', blockEvent, true);
    document.addEventListener('pointerdown', blockEvent, true);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('mousedown', blockEvent, true);
      document.removeEventListener('pointerdown', blockEvent, true);
    };
  }, [isActive, handleMouseMove, handleClick]);

  // Highlight do elemento
  useEffect(() => {
    const targetElement = floatingInput?.element || selectedElement || hoveredElement;
    if (!targetElement) return;

    const originalOutline = targetElement.style.outline;
    const originalOutlineOffset = targetElement.style.outlineOffset;
    
    const color = floatingInput ? 'hsl(var(--primary))' : 
                  selectedElement ? 'hsl(var(--destructive))' : 
                  'hsl(var(--primary))';
    
    targetElement.style.outline = `3px solid ${color}`;
    targetElement.style.outlineOffset = '2px';

    return () => {
      targetElement.style.outline = originalOutline;
      targetElement.style.outlineOffset = originalOutlineOffset;
    };
  }, [hoveredElement, selectedElement, floatingInput]);

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
            {floatingInput ? 'Digite o texto abaixo' : 
             selectedElement ? 'Escolha a ação' : 
             'Clique no elemento'}
          </span>
          {!floatingInput && (
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

      {/* Input flutuante próprio - substitui a digitação no campo real */}
      {floatingInput && (
        <div 
          className="fixed pointer-events-auto z-[9999999]"
          style={{ 
            top: floatingInput.position.top,
            left: floatingInput.position.left,
            minWidth: 250
          }}
        >
          <div className="bg-background border rounded-lg shadow-xl p-3">
            <div className="text-xs text-muted-foreground mb-2">
              Campo: {floatingInput.info.placeholder || floatingInput.info.tagName.toLowerCase()}
            </div>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    confirmInput();
                  } else if (e.key === 'Escape') {
                    cancelInput();
                  }
                }}
                placeholder="Digite o texto..."
                className="h-9"
                autoFocus
              />
              <Button
                size="sm"
                variant="default"
                onClick={confirmInput}
                className="h-9 px-2"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={cancelInput}
                className="h-9 px-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Info do elemento hover */}
      {hoveredElement && !selectedElement && !floatingInput && (
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
