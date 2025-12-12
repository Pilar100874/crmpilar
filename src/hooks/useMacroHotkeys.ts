import { useEffect, useCallback } from 'react';
import { useMacro } from '@/contexts/MacroContext';

function parseShortcut(shortcut: string): { key: string; ctrl: boolean; shift: boolean; alt: boolean; meta: boolean } {
  const parts = shortcut.toUpperCase().split('+');
  return {
    key: parts[parts.length - 1] || '',
    ctrl: parts.includes('CTRL'),
    shift: parts.includes('SHIFT'),
    alt: parts.includes('ALT'),
    meta: parts.includes('META') || parts.includes('CMD')
  };
}

function matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const parsed = parseShortcut(shortcut);
  
  const keyMatches = event.key.toUpperCase() === parsed.key || 
                     event.code.toUpperCase().replace('KEY', '') === parsed.key;
  
  return (
    keyMatches &&
    event.ctrlKey === parsed.ctrl &&
    event.shiftKey === parsed.shift &&
    event.altKey === parsed.alt &&
    event.metaKey === parsed.meta
  );
}

export function useMacroHotkeys() {
  const { macros, executeMacro, isRecording, executionStatus } = useMacro();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Não executa macros durante gravação ou execução
    if (isRecording || executionStatus?.isRunning) return;

    // Ignora se foco está em input/textarea
    const activeElement = document.activeElement;
    if (
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement ||
      activeElement?.getAttribute('contenteditable') === 'true'
    ) {
      return;
    }

    for (const macro of macros) {
      if (macro.enabled && macro.shortcut && matchesShortcut(event, macro.shortcut)) {
        event.preventDefault();
        event.stopPropagation();
        executeMacro(macro.id);
        return;
      }
    }
  }, [macros, executeMacro, isRecording, executionStatus?.isRunning]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Hook para capturar atalho
export function useShortcutCapture(onCapture: (shortcut: string) => void) {
  const captureShortcut = useCallback((event: KeyboardEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const parts: string[] = [];
    if (event.ctrlKey) parts.push('CTRL');
    if (event.shiftKey) parts.push('SHIFT');
    if (event.altKey) parts.push('ALT');
    if (event.metaKey) parts.push('META');

    // Ignora apenas modificadores
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)) {
      return;
    }

    parts.push(event.key.toUpperCase());
    onCapture(parts.join('+'));
  }, [onCapture]);

  return captureShortcut;
}
