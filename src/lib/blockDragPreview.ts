/**
 * Cria uma imagem de arraste (drag ghost) em formato de retângulo
 * simulando um bloco do workflow, em vez de usar a imagem do botão da paleta.
 *
 * Use dentro de um onDragStart, ANTES de qualquer setData/await.
 */
export function setBlockDragPreview(
  event: React.DragEvent | DragEvent,
  label: string,
  color?: string
) {
  try {
    const dt = (event as DragEvent).dataTransfer;
    if (!dt || typeof dt.setDragImage !== "function") return;

    const ghost = document.createElement("div");
    ghost.textContent = label || "Bloco";
    const accent = color || "hsl(var(--primary))";
    Object.assign(ghost.style, {
      position: "fixed",
      top: "-1000px",
      left: "-1000px",
      width: "220px",
      minHeight: "56px",
      padding: "12px 14px",
      borderRadius: "14px",
      background: "hsl(var(--card))",
      color: "hsl(var(--card-foreground))",
      border: `2px solid ${accent}`,
      boxShadow: "0 10px 25px rgba(0,0,0,0.18)",
      fontFamily: "ui-sans-serif, system-ui, sans-serif",
      fontSize: "13px",
      fontWeight: "600",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      pointerEvents: "none",
      zIndex: "9999",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    } as CSSStyleDeclaration);

    const dot = document.createElement("span");
    Object.assign(dot.style, {
      width: "10px",
      height: "10px",
      borderRadius: "9999px",
      background: accent,
      flexShrink: "0",
    } as CSSStyleDeclaration);
    ghost.prepend(dot);

    document.body.appendChild(ghost);
    dt.setDragImage(ghost, 20, 20);

    // Remove o elemento após o navegador capturar a imagem
    setTimeout(() => {
      if (ghost.parentNode) ghost.parentNode.removeChild(ghost);
    }, 0);
  } catch {
    // silencioso — fallback para a imagem padrão do navegador
  }
}
