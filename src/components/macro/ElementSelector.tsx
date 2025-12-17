import { useState, useEffect, useCallback } from 'react';
import { Type, MousePointerClick, ListFilter } from 'lucide-react';

interface ElementSelectorProps {
  isActive: boolean;
  onSelect: (selector: string, elementInfo: ElementInfo, element: HTMLElement, action: 'click' | 'type' | 'selectDropdown', typedValue?: string) => void;
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
  const [isTypingMode, setIsTypingMode] = useState(false);
  const [isDropdownMode, setIsDropdownMode] = useState(false);
  const [typingData, setTypingData] = useState<{
    element: HTMLElement;
    selector: string;
    info: ElementInfo;
  } | null>(null);

  const executeAction = useCallback((action: 'click' | 'type' | 'selectDropdown') => {
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
      setHoveredElement(null);
      onSelect(selector, elementInfo, element, 'click');
    } else if (action === 'selectDropdown') {
      // Para dropdown, entra em modo de digitação marcando como dropdown
      setTypingData({ element, selector, info: elementInfo });
      setIsTypingMode(true);
      setIsDropdownMode(true);
      setSelectedElement(null);
    } else {
      setTypingData({ element, selector, info: elementInfo });
      setIsTypingMode(true);
      setIsDropdownMode(false);
      setSelectedElement(null);
    }
  }, [selectedElement, onSelect]);

  const confirmTyping = useCallback(() => {
    if (!typingData) return;
    
    const { element, selector, info } = typingData;
    let typedValue = '';
    
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      typedValue = element.value;
    } else if (element.isContentEditable) {
      typedValue = element.textContent || '';
    }
    
    const wasDropdownMode = isDropdownMode;
    
    setTypingData(null);
    setIsTypingMode(false);
    setIsDropdownMode(false);
    setHoveredElement(null);
    
    onSelect(selector, info, element, wasDropdownMode ? 'selectDropdown' : 'type', typedValue);
  }, [typingData, isDropdownMode, onSelect]);

  const cancelTyping = useCallback(() => {
    setTypingData(null);
    setIsTypingMode(false);
    setIsDropdownMode(false);
    setSelectedElement(null);
    setHoveredElement(null);
  }, []);

  // Click handler - usando capture para interceptar antes dos elementos
  useEffect(() => {
    if (!isActive || isTypingMode) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Ignora cliques no recorder ou no selector UI
      if (target.closest('[data-macro-recorder]') || target.closest('[data-element-selector]')) {
        return;
      }

      // Permite scroll - não intercepta cliques em scrollbars
      // Scrollbars não são elementos HTML, então o target será o container
      // Verificamos se o clique foi na área de scroll (margem direita/inferior)
      const rect = target.getBoundingClientRect();
      const isOnVerticalScrollbar = e.clientX > rect.right - 20 && target.scrollHeight > target.clientHeight;
      const isOnHorizontalScrollbar = e.clientY > rect.bottom - 20 && target.scrollWidth > target.clientWidth;
      
      if (isOnVerticalScrollbar || isOnHorizontalScrollbar) {
        return; // Permite o clique no scrollbar
      }

      e.preventDefault();
      e.stopPropagation();
      
      setSelectedElement(target);
      setHoveredElement(null);
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [isActive, isTypingMode]);

  // Keyboard handler
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC cancela
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isTypingMode) {
          cancelTyping();
        } else if (selectedElement) {
          setSelectedElement(null);
          setHoveredElement(null);
        } else {
          onCancel();
        }
        return;
      }

      // Se tem elemento selecionado, C = clicar, D = digitar, S = selecionar dropdown
      if (selectedElement && !isTypingMode) {
        if (e.key.toLowerCase() === 'c') {
          e.preventDefault();
          executeAction('click');
        } else if (e.key.toLowerCase() === 'd') {
          e.preventDefault();
          executeAction('type');
        } else if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          executeAction('selectDropdown');
        }
        return;
      }

      // No modo digitação, Ctrl+Enter confirma
      if (isTypingMode && e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        confirmTyping();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isActive, selectedElement, isTypingMode, executeAction, confirmTyping, cancelTyping, onCancel]);

  // Mouse move para highlight
  useEffect(() => {
    if (!isActive || selectedElement || isTypingMode) return;

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      if (!target || target.closest('[data-macro-recorder]') || target.closest('[data-element-selector]')) {
        setHoveredElement(null);
        return;
      }
      
      setHoveredElement(target);
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [isActive, selectedElement, isTypingMode]);

  // Cleanup
  useEffect(() => {
    if (!isActive) {
      setSelectedElement(null);
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
      color = 'hsl(0, 84%, 60%)';
    }
    
    targetElement.style.outline = `3px solid ${color}`;
    targetElement.style.outlineOffset = '2px';

    return () => {
      targetElement.style.outline = originalOutline;
      targetElement.style.outlineOffset = originalOutlineOffset;
    };
  }, [hoveredElement, selectedElement, typingData]);

  // Adiciona cursor crosshair ao body durante seleção
  useEffect(() => {
    if (!isActive || isTypingMode) return;
    
    document.body.style.cursor = 'crosshair';
    return () => {
      document.body.style.cursor = '';
    };
  }, [isActive, isTypingMode]);

  if (!isActive) return null;

  return (
    <>
      {/* UI - Instruções */}
      <div
        data-element-selector
        style={{
          position: 'fixed',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 999999,
          pointerEvents: 'none',
        }}
      >
        {!isTypingMode && !selectedElement && (
          <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg text-center">
            <p className="font-medium">Clique no elemento para selecionar</p>
            <p className="text-xs opacity-80 mt-1">ESC para cancelar • Scroll habilitado</p>
          </div>
        )}

        {!isTypingMode && selectedElement && (
          <div className="bg-orange-500 text-white px-4 py-3 rounded-lg shadow-lg text-center">
            <p className="font-medium mb-2">Elemento selecionado!</p>
            <div className="flex flex-wrap justify-center gap-3 text-sm">
              <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded">
                <MousePointerClick className="h-4 w-4" />
                <span><kbd className="font-bold bg-white/30 px-1 rounded">C</kbd> Clicar</span>
              </div>
              <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded">
                <Type className="h-4 w-4" />
                <span><kbd className="font-bold bg-white/30 px-1 rounded">D</kbd> Digitar</span>
              </div>
              <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded">
                <ListFilter className="h-4 w-4" />
                <span><kbd className="font-bold bg-white/30 px-1 rounded">S</kbd> Selecionar Dropdown</span>
              </div>
            </div>
            <p className="text-xs opacity-80 mt-2">ESC para cancelar seleção</p>
          </div>
        )}

        {isTypingMode && !isDropdownMode && (
          <div className="bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg text-center">
            <p className="font-medium mb-1">Modo Digitação Ativo</p>
            <p className="text-sm">Digite no campo destacado em verde</p>
            <p className="text-xs opacity-80 mt-2">
              <kbd className="font-bold bg-white/30 px-1 rounded">Ctrl+Enter</kbd> para confirmar • 
              <kbd className="font-bold bg-white/30 px-1 rounded ml-1">ESC</kbd> para cancelar
            </p>
          </div>
        )}

        {isTypingMode && isDropdownMode && (
          <div className="bg-purple-600 text-white px-4 py-3 rounded-lg shadow-lg text-center">
            <p className="font-medium mb-1">Modo Seleção de Dropdown</p>
            <p className="text-sm">Digite para buscar e selecione o item desejado</p>
            <p className="text-xs opacity-80 mt-2">
              <kbd className="font-bold bg-white/30 px-1 rounded">Ctrl+Enter</kbd> para confirmar seleção • 
              <kbd className="font-bold bg-white/30 px-1 rounded ml-1">ESC</kbd> para cancelar
            </p>
          </div>
        )}
      </div>

      {/* Info do elemento hover */}
      {hoveredElement && !selectedElement && !isTypingMode && (
        <div 
          data-element-selector
          style={{ 
            position: 'fixed', 
            bottom: 16, 
            left: '50%', 
            transform: 'translateX(-50%)',
            zIndex: 999999,
            pointerEvents: 'none',
          }}
        >
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
    </>
  );
}
