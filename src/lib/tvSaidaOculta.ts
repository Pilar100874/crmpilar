import { useEffect, useRef, useState } from "react";

/**
 * Saída oculta das apresentações/telas de TV.
 *
 * Mantenha pressionado (toque ou mouse) por X segundos em qualquer ponto da
 * tela para executar a saída — sem exibir nenhum botão visível.
 * Também aceita a tecla ESC pressionada continuamente.
 */
export function useSaidaOculta(
  aoSair: () => void,
  opts?: { segundos?: number; ativo?: boolean },
) {
  const { segundos = 5, ativo = true } = opts ?? {};
  const [progresso, setProgresso] = useState(0); // 0..1
  const aoSairRef = useRef(aoSair);
  aoSairRef.current = aoSair;

  useEffect(() => {
    if (!ativo || typeof window === "undefined") return;

    let inicio = 0;
    let raf = 0;
    let timer = 0;

    const tick = () => {
      const p = Math.min(1, (Date.now() - inicio) / (segundos * 1000));
      setProgresso(p);
      if (p < 1) raf = window.requestAnimationFrame(tick);
    };

    const iniciar = () => {
      if (inicio) return;
      inicio = Date.now();
      raf = window.requestAnimationFrame(tick);
      timer = window.setTimeout(() => {
        cancelar();
        aoSairRef.current();
      }, segundos * 1000);
    };

    const cancelar = () => {
      inicio = 0;
      window.clearTimeout(timer);
      window.cancelAnimationFrame(raf);
      setProgresso(0);
    };

    // Teclas de "Voltar" de controles remotos (Android TV, Tizen, webOS) + ESC
    const TECLAS_SAIDA = new Set([
      "Escape",
      "Backspace",
      "GoBack",
      "BrowserBack",
      "XF86Back",
      "Back",
    ]);
    const CODIGOS_SAIDA = new Set([27, 8, 461, 10009, 166]);
    const ehTeclaSaida = (e: KeyboardEvent) =>
      TECLAS_SAIDA.has(e.key) || CODIGOS_SAIDA.has(e.keyCode);

    // Alguns controles emitem keyup entre repetições: tolera pequenas quebras
    let cancelamentoPendente = 0;
    // Alternativa sem segurar: 3 toques rápidos no botão Voltar
    let cliquesVoltar = 0;
    let janelaCliques = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      if (!ehTeclaSaida(e)) return;
      e.preventDefault();
      window.clearTimeout(cancelamentoPendente);
      iniciar();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (!ehTeclaSaida(e)) return;
      e.preventDefault();

      cliquesVoltar += 1;
      window.clearTimeout(janelaCliques);
      janelaCliques = window.setTimeout(() => {
        cliquesVoltar = 0;
      }, 2000);
      if (cliquesVoltar >= 3) {
        cliquesVoltar = 0;
        cancelar();
        aoSairRef.current();
        return;
      }

      window.clearTimeout(cancelamentoPendente);
      cancelamentoPendente = window.setTimeout(cancelar, 300);
    };


    window.addEventListener("pointerdown", iniciar, true);
    window.addEventListener("pointerup", cancelar, true);
    window.addEventListener("pointercancel", cancelar, true);
    window.addEventListener("pointerleave", cancelar, true);
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);

    return () => {
      cancelar();
      window.removeEventListener("pointerdown", iniciar, true);
      window.removeEventListener("pointerup", cancelar, true);
      window.removeEventListener("pointercancel", cancelar, true);
      window.removeEventListener("pointerleave", cancelar, true);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
    };
  }, [ativo, segundos]);

  return { progresso };
}
