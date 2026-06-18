import type { Connection, Edge } from "@xyflow/react";

/**
 * Regra global de conexões: cada handle de saída (source + sourceHandle) só pode
 * possuir UMA conexão. Blocos de saída única (sourceHandle nulo) ficam limitados a
 * 1 conexão de saída; blocos com múltiplas saídas naturalmente usam sourceHandles
 * distintos e continuam permitindo 1 conexão por handle.
 */
export function isSingleEdgePerHandleAllowed(
  conn: Connection | Edge,
  edges: Edge[],
): boolean {
  if (!conn.source) return true;
  const sh = (conn as any).sourceHandle ?? null;
  return !edges.some(
    (e) => e.source === conn.source && (e.sourceHandle ?? null) === sh,
  );
}

export const SINGLE_OUTPUT_TOAST =
  "Esta saída já está conectada. Remova a conexão existente antes de criar outra.";
