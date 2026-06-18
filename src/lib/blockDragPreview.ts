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
    const accent = color || "hsl(var(--primary))";
    Object.assign(ghost.style, {
      position: "absolute",
      top: "0px",
      left: "-9999px",
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
      boxSizing: "border-box",
    } as CSSStyleDeclaration);

    const dot = document.createElement("span");
    Object.assign(dot.style, {
      width: "10px",
      height: "10px",
      borderRadius: "9999px",
      background: accent,
      flexShrink: "0",
      display: "inline-block",
    } as CSSStyleDeclaration);

    const text = document.createElement("span");
    text.textContent = label || "Bloco";
    text.style.overflow = "hidden";
    text.style.textOverflow = "ellipsis";

    ghost.appendChild(dot);
    ghost.appendChild(text);

    document.body.appendChild(ghost);
    dt.setDragImage(ghost, 20, 20);

    // Remove o elemento após o navegador capturar a imagem (precisa permanecer no DOM brevemente)
    setTimeout(() => {
      if (ghost.parentNode) ghost.parentNode.removeChild(ghost);
    }, 50);
  } catch {
    // silencioso — fallback para a imagem padrão do navegador
  }
}
