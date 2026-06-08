import { SelectionMode } from "@xyflow/react";

/**
 * Props padrão para habilitar seleção por retângulo (rubber-band)
 * em qualquer canvas React Flow do sistema.
 *
 * Uso:
 *   <ReactFlow {...boxSelectionProps({ disabled: isLocked })} ...>
 *
 * - Botão esquerdo no canvas vazio -> desenha retângulo de seleção
 * - Botão do meio / direito -> faz pan
 * - Shift/Ctrl/Meta -> adiciona à seleção
 * - Delete / Backspace -> remove todos os blocos selecionados
 */
export const boxSelectionProps = (opts: { disabled?: boolean } = {}) => {
  const disabled = !!opts.disabled;
  return {
    selectionOnDrag: !disabled,
    panOnDrag: disabled ? true : ([1, 2] as number[]),
    selectionMode: SelectionMode.Partial,
    multiSelectionKeyCode: ["Meta", "Control", "Shift"] as string[],
    deleteKeyCode: disabled ? null : (["Delete", "Backspace"] as string[]),
  };
};
