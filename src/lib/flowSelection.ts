import { SelectionMode } from "@xyflow/react";

/**
 * Detecta dispositivos touch (tablet/celular) onde queremos
 * desabilitar a seleção múltipla por retângulo e habilitar
 * pan com um dedo + zoom no duplo toque.
 */
const isTouchDevice = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia?.("(pointer: coarse)").matches) return true;
  } catch {
    /* ignore */
  }
  return (
    "ontouchstart" in window ||
    (typeof navigator !== "undefined" && (navigator.maxTouchPoints ?? 0) > 0)
  );
};

/**
 * Props padrão para habilitar seleção por retângulo (rubber-band)
 * em qualquer canvas React Flow do sistema.
 *
 * Em desktop:
 *   - Botão esquerdo no canvas vazio -> desenha retângulo de seleção
 *   - Botão do meio / direito -> faz pan
 *   - Shift/Ctrl/Meta -> adiciona à seleção
 *   - Delete / Backspace -> remove blocos selecionados
 *
 * Em tablet/celular (touch):
 *   - Um dedo arrasta a tela (pan)
 *   - Duplo toque faz zoom in/out
 *   - Sem seleção múltipla por retângulo
 */
export const boxSelectionProps = (opts: { disabled?: boolean } = {}) => {
  const disabled = !!opts.disabled;
  const touch = isTouchDevice();

  if (touch) {
    return {
      selectionOnDrag: false,
      panOnDrag: true,
      panOnScroll: false,
      zoomOnPinch: true,
      zoomOnDoubleClick: true,
      selectionMode: SelectionMode.Partial,
      selectionKeyCode: null,
      multiSelectionKeyCode: null,
      deleteKeyCode: disabled ? null : (["Delete", "Backspace"] as string[]),
    };
  }

  return {
    // Sem Shift: arrastar com o botão esquerdo faz pan da tela.
    // Segurando Shift: arrastar desenha o retângulo de seleção.
    selectionOnDrag: false,
    panOnDrag: true,
    selectionMode: SelectionMode.Partial,
    selectionKeyCode: disabled ? null : "Shift",
    // Ctrl/Cmd: adiciona um bloco por vez à seleção (clique a clique).
    multiSelectionKeyCode: disabled ? null : (["Meta", "Control"] as string[]),
    deleteKeyCode: disabled ? null : (["Delete", "Backspace"] as string[]),
  };
};
