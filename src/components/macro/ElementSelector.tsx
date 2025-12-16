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
  const [isTypingMode, setIsTypingMode] = useState(false);
  const [typingData, setTypingData] = useState<{
    element: HTMLElement;
    selector: string;
    info: ElementInfo;
  } | null>(null);
  
  const overlayRef = useRef<HTMLDivElement>(null);

  // Função para selecionar elemento pelo ponto
  const getElementAtPoint = useCallback((x: number, y: number): HTMLElement | null => {
    // Temporariamente esconde o overlay para pegar o elemento por baixo
    if (overlayRef.current) {
      overlayRef.current.style.pointerEvents = 'none';
    }
    
    const element = document.elementFromPoint(x, y) as HTMLElement;
    
    if (overlayRef.current) {
      overlayRef.current.style.pointerEvents = 'auto';
    }
    
    return element;
  }, []);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    // Se clicou em algo do seletor, ignora
    const target = e.target as HTMLElement;
    if (target.closest('[data-selector-ui]')) {
      return;
    }

    // Se está em modo de digitação, permite o clique passar
    if (isTypingMode) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    // Pega o elemento por baixo do overlay
    const element = getElementAtPoint(e.clientX, e.clientY);
    
    if (!element || element.closest('[data-macro-recorder]') || element.closest('[data-element-selector]')) {
      return;
    }

    const rect = element.getBoundingClientRect();
    setSelectedElement(element);
    setMenuPosition({
      top: rect.top,
      left: rect.right + 8
    });
  }, [getElementAtPoint, isTypingMode]);

  const handleAction = useCallback((action: 'click' | 'type', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
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
    
    setMenuPosition(null);
    
    if (action === 'click') {
      setSelectedElement(null);
      setHoveredElement(null);
      onSelect(selector, elementInfo, element, 'click');
    } else {
      // Entra no modo de digitação
      setTypingData({ element, selector, info: elementInfo });
      setIsTypingMode(true);
      setSelectedElement(null);
    }
  }, [selectedElement, onSelect]);

  const confirmTyping = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!typingData) return;
    
    const { element, selector, info } = typingData;
    let typedValue = '';
    
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      typedValue = element.value;
    } else if (element.isContentEditable) {
      typedValue = element.textContent || '';
    }
    
    setTypingData(null);
    setIsTypingMode(false);
    setHoveredElement(null);
    
    onSelect(selector, info, element, 'type', typedValue);
  }, [typingData, onSelect]);

  const cancelTyping = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setTypingData(null);
    setIsTypingMode(false);
    setSelectedElement(null);
    setHoveredElement(null);
  }, []);

  const cancelSelection = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setSelectedElement(null);
    setMenuPosition(null);
    setHoveredElement(null);
  }, []);

  // Mouse move para highlight
  useEffect(() => {
    if (!isActive || selectedElement || isTypingMode) return;

    const handleMouseMove = (e: MouseEvent) => {
      const element = getElementAtPoint(e.clientX, e.clientY);
      
      if (!element || element.closest('[data-macro-recorder]') || element.closest('[data-element-selector]') || element.closest('[data-selector-ui]')) {
        setHoveredElement(null);
        return;
      }
      
      setHoveredElement(element);
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [isActive, selectedElement, isTypingMode, getElementAtPoint]);

  // Cleanup
  useEffect(() => {
    if (!isActive) {
      setSelectedElement(null);
      setMenuPosition(null);
      setHoveredElement(null);
      setIsTypingMode(false);
      setTypingData(null);
    }
  }, [isActive]);

  // Highlight do elemento
  useEffect(() => {
    const targetElement = typingData?.element || selectedElement || hoveredElement;
    if (!targetElement) return;

    const originalOutline = targetElement.style.outline;
    const originalOutlineOffset = targetElement.style.outlineOffset;
    
    let color = 'hsl(var(--primary))';
    if (typingData?.element === targetElement) {
      color = 'hsl(142, 76%, 36%)';
    } else if (selectedElement === targetElement) {
      color = 'hsl(var(--destructive))';
    }
    
    targetElement.style.outline = `3px solid ${color}`;
    targetElement.style.outlineOffset = '2px';

    return () => {
      targetElement.style.outline = originalOutline;
      targetElement.style.outlineOffset = originalOutlineOffset;
    };
  }, [hoveredElement, selectedElement, typingData]);

  if (!isActive) return null;

  return (
    <>
      {/* Overlay transparente que captura todos os eventos */}
      <div
        ref={overlayRef}
        data-element-selector
        onClick={handleOverlayClick}
        onMouseDown={(e) => { if (!isTypingMode) { e.preventDefault(); e.stopPropagation(); } }}
        onPointerDown={(e) => { if (!isTypingMode) { e.preventDefault(); e.stopPropagation(); } }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999998,
          cursor: 'crosshair',
          pointerEvents: isTypingMode ? 'none' : 'auto',
        }}
      />

      {/* UI do seletor - acima do overlay */}
      <div
        data-element-selector
        data-selector-ui
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          pointerEvents: 'none',
        }}
      >
        {/* Barra de instrução */}
        {!isTypingMode && (
          <div 
            style={{ 
              position: 'fixed', 
              top: 16, 
              left: '50%', 
              transform: 'translateX(-50%)',
              pointerEvents: 'auto',
            }}
          >
            <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-3">
              <MousePointer2 className="h-5 w-5 animate-pulse" />
              <span className="font-medium">
                {selectedElement ? 'Escolha a ação' : 'Clique no elemento'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (selectedElement) {
                    cancelSelection(e);
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

        {/* Menu de ações */}
        {selectedElement && menuPosition && !isTypingMode && (
          <div 
            style={{ 
              position: 'fixed',
              top: menuPosition.top,
              left: Math.min(menuPosition.left, window.innerWidth - 120),
              pointerEvents: 'auto',
            }}
          >
            <div className="bg-background border rounded-lg shadow-xl p-1 flex flex-col gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="justify-start gap-2 h-8"
                onClick={(e) => handleAction('click', e)}
              >
                <MousePointerClick className="h-4 w-4 text-primary" />
                Clicar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="justify-start gap-2 h-8"
                onClick={(e) => handleAction('type', e)}
              >
                <Type className="h-4 w-4 text-primary" />
                Digitar
              </Button>
            </div>
          </div>
        )}

        {/* Info do elemento hover */}
        {hoveredElement && !selectedElement && !isTypingMode && (
          <div style={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)' }}>
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

        {/* UI do modo de digitação */}
        {isTypingMode && typingData && (
          <>
            {/* Instrução */}
            <div 
              style={{ 
                position: 'fixed', 
                top: 16, 
                left: '50%', 
                transform: 'translateX(-50%)',
                pointerEvents: 'none',
              }}
            >
              <div className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-3">
                <Type className="h-5 w-5" />
                <span className="font-medium">
                  Digite no campo e clique em Confirmar
                </span>
              </div>
            </div>

            {/* Botão de confirmar */}
            <div 
              style={{ 
                position: 'fixed',
                top: typingData.element.getBoundingClientRect().bottom + 8,
                left: typingData.element.getBoundingClientRect().left,
                pointerEvents: 'auto',
              }}
            >
              <div className="bg-background border rounded-lg shadow-xl p-3 min-w-[200px]">
                <p className="text-sm text-muted-foreground mb-2">
                  Digite no campo acima
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
            </div>
          </>
        )}
      </div>
    </>
  );
}
