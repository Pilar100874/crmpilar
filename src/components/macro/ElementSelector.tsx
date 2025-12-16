import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
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

// Modal renderizado via portal - independente de qualquer popup
function TextInputModal({ 
  elementInfo, 
  onConfirm, 
  onCancel 
}: { 
  elementInfo: ElementInfo;
  onConfirm: (text: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Foca no input quando o modal abrir
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999999] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <div 
        className="bg-background border rounded-xl shadow-2xl p-6 min-w-[350px] max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Type className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Digitar Texto</h3>
            <p className="text-sm text-muted-foreground">
              Campo: {elementInfo.placeholder || elementInfo.tagName.toLowerCase()}
            </p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-2">
              Texto a ser digitado:
            </label>
            <Input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && value.trim()) {
                  onConfirm(value);
                } else if (e.key === 'Escape') {
                  onCancel();
                }
              }}
              placeholder="Digite o texto aqui..."
              className="h-11"
            />
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={onCancel}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => value.trim() && onConfirm(value)}
              disabled={!value.trim()}
            >
              <Check className="h-4 w-4 mr-2" />
              Confirmar
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function ElementSelector({ isActive, onSelect, onCancel }: ElementSelectorProps) {
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [textInputModal, setTextInputModal] = useState<{
    element: HTMLElement;
    selector: string;
    info: ElementInfo;
  } | null>(null);
  
  const menuRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (selectedElement || textInputModal) return;
    
    const target = e.target as HTMLElement;
    
    if (target.closest('[data-element-selector]')) {
      setHoveredElement(null);
      return;
    }
    
    setHoveredElement(target);
  }, [selectedElement, textInputModal]);

  const handleClick = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Permite cliques no seletor
    if (target.closest('[data-element-selector]')) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    // Só seleciona elemento se não estiver em modo modal
    if (!textInputModal) {
      const rect = target.getBoundingClientRect();
      setSelectedElement(target);
      setMenuPosition({
        top: rect.top + window.scrollY,
        left: rect.right + 8 + window.scrollX
      });
    }
  }, [textInputModal]);

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
    
    // Limpa o estado do menu ANTES de abrir modal ou executar ação
    setSelectedElement(null);
    setMenuPosition(null);
    setHoveredElement(null);
    
    if (action === 'click') {
      onSelect(selector, elementInfo, element, 'click');
    } else {
      // Abre modal para digitar - o popup pode fechar, não importa
      setTextInputModal({
        element,
        selector,
        info: elementInfo
      });
    }
  };

  const handleTextConfirm = (text: string) => {
    if (!textInputModal) return;
    
    onSelect(
      textInputModal.selector, 
      textInputModal.info, 
      textInputModal.element, 
      'type', 
      text
    );
    setTextInputModal(null);
  };

  const handleTextCancel = () => {
    setTextInputModal(null);
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
      setTextInputModal(null);
      return;
    }

    // Bloqueia eventos apenas quando não estamos no modal
    const blockEvent = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-element-selector]')) {
        return;
      }
      // Não bloqueia se o modal de texto estiver aberto
      if (document.querySelector('[data-text-input-modal]')) {
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
  }, [hoveredElement, selectedElement]);

  if (!isActive) return null;

  return (
    <>
      <div 
        data-element-selector
        className="fixed inset-0 z-[999999] pointer-events-none"
      >
        {/* Barra de instrução */}
        {!textInputModal && (
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

        {/* Info do elemento hover */}
        {hoveredElement && !selectedElement && !textInputModal && (
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

      {/* Modal de texto - via portal, independente de popups */}
      {textInputModal && (
        <TextInputModal
          elementInfo={textInputModal.info}
          onConfirm={handleTextConfirm}
          onCancel={handleTextCancel}
        />
      )}
    </>
  );
}
