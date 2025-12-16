import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, MousePointer2 } from 'lucide-react';

interface ElementSelectorProps {
  isActive: boolean;
  onSelect: (selector: string, elementInfo: ElementInfo, element: HTMLElement) => void;
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
  // Prioridade 1: data-macro-id
  if (element.getAttribute('data-macro-id')) {
    return `[data-macro-id="${element.getAttribute('data-macro-id')}"]`;
  }
  
  // Prioridade 2: ID único
  if (element.id && document.querySelectorAll(`#${CSS.escape(element.id)}`).length === 1) {
    return `#${element.id}`;
  }
  
  // Prioridade 3: placeholder (para inputs)
  const placeholder = element.getAttribute('placeholder');
  if (placeholder && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
    const selector = `${element.tagName.toLowerCase()}[placeholder="${placeholder}"]`;
    if (document.querySelectorAll(selector).length === 1) {
      return selector;
    }
  }
  
  // Prioridade 4: name attribute
  const name = element.getAttribute('name');
  if (name) {
    const selector = `[name="${name}"]`;
    if (document.querySelectorAll(selector).length === 1) {
      return selector;
    }
  }
  
  // Prioridade 5: aria-label
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) {
    const selector = `[aria-label="${ariaLabel}"]`;
    if (document.querySelectorAll(selector).length === 1) {
      return selector;
    }
  }
  
  // Prioridade 6: texto do botão
  if (element.tagName === 'BUTTON' || element.getAttribute('role') === 'button') {
    const text = element.textContent?.trim();
    if (text && text.length < 50) {
      return `button:contains("${text}")`;
    }
  }
  
  // Prioridade 7: Gerar seletor baseado em posição e classes
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
  const overlayRef = useRef<HTMLDivElement>(null);

  // Encontra elemento sob o cursor, ignorando o overlay
  const getElementUnderCursor = useCallback((x: number, y: number): HTMLElement | null => {
    // Temporariamente esconde o overlay para encontrar o elemento real
    if (overlayRef.current) {
      overlayRef.current.style.display = 'none';
    }
    
    const element = document.elementFromPoint(x, y) as HTMLElement;
    
    if (overlayRef.current) {
      overlayRef.current.style.display = '';
    }
    
    return element;
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const target = getElementUnderCursor(e.clientX, e.clientY);
    
    if (!target || target.closest('[data-element-selector]')) {
      setHoveredElement(null);
      return;
    }
    
    setHoveredElement(target);
  }, [getElementUnderCursor]);

  const handleClick = useCallback((e: MouseEvent) => {
    // Bloqueia TUDO
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    const target = getElementUnderCursor(e.clientX, e.clientY);
    
    if (!target || target.closest('[data-element-selector]')) {
      return;
    }
    
    const selector = generateSelector(target);
    const elementInfo: ElementInfo = {
      selector,
      tagName: target.tagName,
      type: target.getAttribute('type') || undefined,
      placeholder: target.getAttribute('placeholder') || undefined,
      text: target.textContent?.trim().slice(0, 50) || undefined,
      id: target.id || undefined,
      className: target.className?.toString().slice(0, 100) || undefined,
    };
    
    onSelect(selector, elementInfo, target);
  }, [getElementUnderCursor, onSelect]);

  // Bloqueia eventos que fecham popups
  const blockEvent = useCallback((e: Event) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-element-selector]')) {
      return; // Permite eventos no próprio seletor
    }
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }, []);

  useEffect(() => {
    if (!isActive) return;

    // Captura todos os eventos relevantes na fase de captura
    const events = ['mousedown', 'mouseup', 'click', 'pointerdown', 'pointerup', 'focusin', 'focusout'];
    
    events.forEach(eventName => {
      document.addEventListener(eventName, blockEvent, true);
    });
    
    document.addEventListener('mousemove', handleMouseMove, true);

    return () => {
      events.forEach(eventName => {
        document.removeEventListener(eventName, blockEvent, true);
      });
      document.removeEventListener('mousemove', handleMouseMove, true);
    };
  }, [isActive, handleMouseMove, blockEvent]);

  // Highlight do elemento
  useEffect(() => {
    if (!hoveredElement) return;

    const originalOutline = hoveredElement.style.outline;
    const originalOutlineOffset = hoveredElement.style.outlineOffset;
    
    hoveredElement.style.outline = '3px solid hsl(var(--primary))';
    hoveredElement.style.outlineOffset = '2px';

    return () => {
      hoveredElement.style.outline = originalOutline;
      hoveredElement.style.outlineOffset = originalOutlineOffset;
    };
  }, [hoveredElement]);

  if (!isActive) return null;

  return (
    <div 
      ref={overlayRef}
      data-element-selector
      className="fixed inset-0 z-[999999]"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleClick(e.nativeEvent);
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {/* Overlay transparente que captura cliques */}
      <div className="absolute inset-0 bg-transparent cursor-crosshair" />
      
      {/* Barra de instrução */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 pointer-events-auto z-[9999999]">
        <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-3">
          <MousePointer2 className="h-5 w-5 animate-pulse" />
          <span className="font-medium">Clique no elemento que deseja selecionar</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
            className="h-7 px-2 hover:bg-primary-foreground/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Info do elemento hover */}
      {hoveredElement && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 pointer-events-none z-[9999999]">
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
