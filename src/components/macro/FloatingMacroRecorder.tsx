import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMacro } from "@/contexts/MacroContext";
import { Button } from "@/components/ui/button";
import { Circle, Square, Pause, Play, List, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/toast-config";

type ValidationLevel = 'success' | 'warning' | 'error';

interface ValidationResult {
  level: ValidationLevel;
  message: string;
  details: string;
}

// Valida se o seletor do elemento provavelmente funcionará
function validateElementSelector(elementId: string, element: HTMLElement): ValidationResult {
  // Melhor caso: data-macro-id
  if (element.getAttribute('data-macro-id')) {
    return {
      level: 'success',
      message: '✅ Elemento confiável',
      details: 'Usa data-macro-id (100% confiável)'
    };
  }

  // Bom caso: ID estável
  if (elementId.startsWith('#') && element.id && !element.id.match(/[0-9]{5,}|radix|:r/)) {
    return {
      level: 'success',
      message: '✅ Elemento confiável',
      details: 'Usa ID estável'
    };
  }

  // Bom caso: name attribute
  if (elementId.includes('[name=')) {
    return {
      level: 'success',
      message: '✅ Elemento confiável',
      details: 'Usa atributo name'
    };
  }

  // Caso médio: aria-label ou title
  if (elementId.includes('[aria-label=') || elementId.includes('[title=')) {
    return {
      level: 'warning',
      message: '⚠️ Pode falhar',
      details: 'Usa aria-label/title (pode mudar se texto for traduzido)'
    };
  }

  // Caso médio: texto do botão/link
  if (elementId.includes('button:') || elementId.includes('a:')) {
    return {
      level: 'warning',
      message: '⚠️ Pode falhar',
      details: 'Usa texto do elemento (pode mudar se texto for alterado)'
    };
  }

  // Verificar se está em iframe
  try {
    if (element.ownerDocument !== document) {
      return {
        level: 'error',
        message: '❌ NÃO vai funcionar',
        details: 'Elemento está em iframe (não suportado)'
      };
    }
  } catch {
    return {
      level: 'error',
      message: '❌ NÃO vai funcionar',
      details: 'Elemento inacessível (provavelmente iframe)'
    };
  }

  // Verificar se está em Shadow DOM
  if (element.getRootNode() !== document) {
    return {
      level: 'error',
      message: '❌ NÃO vai funcionar',
      details: 'Elemento está em Shadow DOM (não suportado)'
    };
  }

  // Verificar ID dinâmico (radix, números longos, :r pattern)
  if (elementId.startsWith('#') && element.id?.match(/[0-9]{5,}|radix|:r/)) {
    return {
      level: 'error',
      message: '❌ Provavelmente vai falhar',
      details: 'ID dinâmico detectado (muda a cada reload)'
    };
  }

  // Verificar classe dinâmica
  if (elementId.includes('.') && element.className?.includes?.('css-')) {
    return {
      level: 'error',
      message: '❌ Provavelmente vai falhar',
      details: 'Classe CSS dinâmica detectada'
    };
  }

  // Caso incerto: classe genérica
  if (elementId.match(/^[a-z]+\.[a-z]/)) {
    return {
      level: 'warning',
      message: '⚠️ Pode falhar',
      details: 'Usa classe CSS (pode não ser única na página)'
    };
  }

  // Caso fraco: apenas tag + texto
  if (elementId.match(/^[a-z]+:/)) {
    return {
      level: 'warning',
      message: '⚠️ Pode falhar',
      details: 'Usa tag + texto (pode haver duplicatas)'
    };
  }

  return {
    level: 'warning',
    message: '⚠️ Verificar manualmente',
    details: 'Seletor genérico - teste antes de usar'
  };
}

// Mostra toast com feedback visual
function showValidationToast(label: string, validation: ValidationResult) {
  const toastConfig = {
    success: { duration: 2000 },
    warning: { duration: 3500 },
    error: { duration: 5000 }
  };

  const toastFn = validation.level === 'success' 
    ? toast.success 
    : validation.level === 'warning' 
      ? toast.info 
      : toast.error;

  toastFn(`${validation.message}: ${label.substring(0, 40)}${label.length > 40 ? '...' : ''}`, {
    description: validation.details,
    duration: toastConfig[validation.level].duration
  });
}

export function FloatingMacroRecorder() {
  const navigate = useNavigate();
  const {
    isRecording,
    recordingSteps,
    recordingMeta,
    startRecording,
    resumeRecording,
    stopRecording,
    addRecordingStep,
    clearRecordingSteps,
    saveCurrentRecording,
  } = useMacro();

  const hasSteps = recordingSteps.length > 0;

  // Encontra o elemento clicável mais próximo (button, a, etc.)
  const findClickableElement = (element: HTMLElement): HTMLElement | null => {
    // Lista de tags que não são clicáveis por si só
    const nonClickableTags = ['svg', 'path', 'circle', 'rect', 'line', 'polygon', 'polyline', 'g', 'use', 'span'];
    
    // Se for SVG ou elemento interno de SVG, sempre sobe para o pai
    const tagName = element.tagName.toLowerCase();
    if (nonClickableTags.includes(tagName) || element instanceof SVGElement) {
      // Procura o elemento pai clicável
      const clickableSelectors = 'button, a, [role="button"], [role="menuitem"], [role="tab"], [data-macro-id], div[onclick], li';
      const clickable = element.closest(clickableSelectors) as HTMLElement;
      if (clickable && !(clickable instanceof SVGElement)) return clickable;
      
      // Sobe na hierarquia até encontrar algo não-SVG
      let parent = element.parentElement;
      while (parent && parent !== document.body) {
        if (!(parent instanceof SVGElement) && !nonClickableTags.includes(parent.tagName.toLowerCase())) {
          return parent;
        }
        parent = parent.parentElement;
      }
      return null; // Não grave nada se não encontrar
    }
    
    // Procura elemento clicável mais próximo
    const clickableSelectors = 'button, a, [role="button"], [role="menuitem"], [role="tab"], [data-macro-id]';
    const clickable = element.closest(clickableSelectors) as HTMLElement;
    if (clickable && !(clickable instanceof SVGElement)) return clickable;
    
    // Se o próprio elemento ou pai próximo é clicável por natureza
    let current: HTMLElement | null = element;
    while (current && current !== document.body) {
      const tag = current.tagName.toLowerCase();
      if (['button', 'a', 'input', 'select', 'div', 'li', 'span'].includes(tag)) {
        // Verifica se tem algum indicador de ser clicável
        if (current.onclick || current.getAttribute('role') || 
            getComputedStyle(current).cursor === 'pointer' ||
            tag === 'button' || tag === 'a') {
          return current;
        }
      }
      current = current.parentElement;
    }
    
    // Retorna o elemento original se não for SVG
    if (!(element instanceof SVGElement)) {
      return element;
    }
    
    return null;
  };

  // Gera um identificador para o elemento
  const generateElementId = (element: HTMLElement): string => {
    // Prioriza data-macro-id
    const macroId = element.getAttribute('data-macro-id');
    if (macroId) return macroId;

    // Usa id se existir
    if (element.id) return `#${element.id}`;

    // Usa nome do formulário se for input
    const name = element.getAttribute('name');
    if (name) return `[name="${name}"]`;

    // Para botões, usa o texto interno
    const tagName = element.tagName.toLowerCase();
    if (tagName === 'button') {
      const text = element.textContent?.trim().substring(0, 30);
      if (text) return `button:${text}`;
    }

    // Para links, usa href ou texto
    if (tagName === 'a') {
      const href = element.getAttribute('href');
      if (href && href !== '#') return `a[href="${href}"]`;
      const text = element.textContent?.trim().substring(0, 30);
      if (text) return `a:${text}`;
    }

    // Usa aria-label se existir
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return `[aria-label="${ariaLabel}"]`;

    // Usa title se existir
    const title = element.getAttribute('title');
    if (title) return `[title="${title}"]`;

    // Usa classe principal + tag
    const className = element.className?.split?.(' ')?.[0];
    if (className && typeof className === 'string' && !className.includes(':')) {
      return `${tagName}.${className}`;
    }

    // Fallback: tag + texto truncado
    const text = element.textContent?.trim().substring(0, 20) || '';
    return `${tagName}${text ? `:${text}` : ''}`; 
  };

  // Captura automática de cliques e inputs
  useEffect(() => {
    if (!isRecording) return;

    const handleGlobalClick = (e: MouseEvent) => {
      const rawTarget = e.target as HTMLElement;
      
      // Ignora cliques no próprio botão flutuante
      if (rawTarget.closest('.fixed.bottom-4.right-4')) return;
      
      // Encontra o elemento clicável real (não SVG, path, etc.)
      const target = findClickableElement(rawTarget);
      
      // Se não encontrou elemento válido, ignora
      if (!target) return;
      
      const tagName = target.tagName.toLowerCase();
      const isInput = tagName === 'input' || tagName === 'textarea';
      const isSelect = target.closest('[role="combobox"]') || tagName === 'select';
      
      // Só grava cliques (não inputs/selects que são tratados separadamente)
      if (!isInput && !isSelect) {
        const elementId = generateElementId(target);
        // Ignora se o elementId for apenas "svg" ou similar
        if (['svg', 'path', 'circle', 'g'].includes(elementId.toLowerCase())) return;
        
        const label = target.textContent?.trim().substring(0, 50) || elementId;
        
        // Valida e mostra feedback
        const validation = validateElementSelector(elementId, target);
        showValidationToast(`Clique: ${label}`, validation);
        
        addRecordingStep({
          type: 'click',
          target: elementId,
          meta: { 
            label: `Clique: ${label}`,
            validationLevel: validation.level,
            validationMessage: validation.details
          }
        });
      }
    };

    // Captura mudanças em inputs
    const handleGlobalInput = (e: Event) => {
      const target = e.target as HTMLElement;
      
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        const elementId = generateElementId(target);
        const value = (target as HTMLInputElement).value;
        const label = `Preencher: ${elementId} = ${value.substring(0, 30)}${value.length > 30 ? '...' : ''}`;
        
        // Valida e mostra feedback
        const validation = validateElementSelector(elementId, target);
        showValidationToast(label, validation);
        
        addRecordingStep({
          type: 'setValue',
          target: elementId,
          value,
          meta: { 
            label,
            validationLevel: validation.level,
            validationMessage: validation.details
          }
        });
      }
    };

    // Adiciona listeners
    document.addEventListener('click', handleGlobalClick, true);
    document.addEventListener('input', handleGlobalInput, true);
    document.addEventListener('change', handleGlobalInput, true);
 
    return () => {
      document.removeEventListener('click', handleGlobalClick, true);
      document.removeEventListener('input', handleGlobalInput, true);
      document.removeEventListener('change', handleGlobalInput, true);
    };
  }, [isRecording, addRecordingStep]);

  const handleRecordClick = () => {
    if (!recordingMeta) {
      alert('Antes de gravar, vá na aba "Gravador" e preencha Nome, Descrição e Atalho.');
      return;
    }

    if (hasSteps) {
      resumeRecording();
    } else {
      startRecording();
    }
  };

  const handleFinishClick = async () => {
    if (!recordingMeta) {
      alert('Antes de encerrar, vá na aba "Gravador" e preencha Nome, Descrição e Atalho.');
      return;
    }

    if (isRecording) {
      stopRecording();
    }

    await saveCurrentRecording();
  };

  // Só mostra o botão flutuante quando o usuário clicou em "Iniciar Gravação" na aba Gravador
  if (!recordingMeta) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border bg-card px-3 py-2 shadow-lg">
      {/* Indicador de status */}
      <div className={`flex items-center gap-2 ${isRecording ? 'text-destructive' : 'text-muted-foreground'}`}>
        <div className={isRecording ? 'animate-pulse' : ''}>
          <Circle className="h-3 w-3 fill-current" />
        </div>
        <span className="text-xs font-medium">
          {isRecording ? 'Gravando' : hasSteps ? 'Pausado' : 'Macro'}
        </span>
        {hasSteps && (
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
            {recordingSteps.length}
          </Badge>
        )}
      </div>

      <div className="h-4 w-px bg-border mx-1" />

      {/* Botões de controle */}
      {!isRecording ? (
        <>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRecordClick}
            className="h-7 w-7 p-0"
            title={hasSteps ? 'Retomar gravação' : 'Iniciar gravação'}
          >
            {hasSteps ? <Play className="h-4 w-4" /> : <Circle className="h-4 w-4 text-destructive" />}
          </Button>

          {hasSteps && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate('/macros?tab=recorder')}
                className="h-7 w-7 p-0"
                title="Ver passos gravados"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={clearRecordingSteps}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                title="Descartar gravação"
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
        </>
      ) : (
        <>
          <Button
            size="sm"
            variant="ghost"
            onClick={stopRecording}
            className="h-7 w-7 p-0"
            title="Pausar gravação"
          >
            <Pause className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleFinishClick}
            className="h-7 w-7 p-0 text-destructive"
            title="Encerrar e salvar macro"
          >
            <Square className="h-4 w-4 text-destructive fill-destructive" />
          </Button>
        </>
      )}
    </div>
  );
}
