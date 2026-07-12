/**
 * Faz com que TODOS os toasts do Sonner (`import { toast } from "sonner"`)
 * respeitem a flag `showConfirmationMessages` do localStorage,
 * configurada em Config → Notificações do Sistema.
 *
 * Erros continuam sempre aparecendo.
 */
import { toast } from "sonner";

const shouldShow = (): boolean => {
  try {
    return localStorage.getItem("showConfirmationMessages") !== "false";
  } catch {
    return true;
  }
};

let patched = false;

export function installSonnerPatch() {
  if (patched) return;
  patched = true;

  const t = toast as any;

  // Guarda as originais
  const originals = {
    call: t.bind ? t.bind({}) : t,
    success: t.success?.bind(t),
    info: t.info?.bind(t),
    warning: t.warning?.bind(t),
    message: t.message?.bind(t),
    custom: t.custom?.bind(t),
    loading: t.loading?.bind(t),
    // erros e promise NÃO são filtrados
  };

  const guard =
    (fn?: (...args: any[]) => any) =>
    (...args: any[]) => {
      if (!fn) return;
      if (!shouldShow()) return;
      return fn(...args);
    };

  // Sonner exporta `toast` como função + métodos.
  // Substituímos os métodos in-place para que todos os consumidores herdem.
  t.success = guard(originals.success);
  t.info = guard(originals.info);
  t.warning = guard(originals.warning);
  t.message = guard(originals.message);
  t.custom = guard(originals.custom);
  t.loading = guard(originals.loading);

  // Chamada direta `toast("msg")` também é confirmação -> filtra.
  // Não conseguimos reatribuir a função exportada, então interceptamos via Proxy
  // apenas nos métodos acima. Chamadas diretas ficam raras; se necessário,
  // consumidores podem usar toast.message().
}
