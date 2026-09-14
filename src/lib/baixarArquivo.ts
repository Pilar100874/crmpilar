import { toast } from "sonner";

/**
 * Inicia o download de um arquivo.
 * Links externos (ex.: releases do GitHub) abrem em nova aba, pois o atributo
 * `download` é ignorado em origens diferentes e o clique pode ser bloqueado
 * quando o sistema está dentro de um iframe (pré-visualização).
 */
export function baixarArquivo(nomeArquivo: string, url: string) {
  if (!url) {
    toast.error("Link de download indisponível no momento");
    return;
  }

  try {
    const mesmaOrigem = url.startsWith("/") || url.startsWith(window.location.origin);

    if (!mesmaOrigem) {
      const janela = window.open(url, "_blank", "noopener,noreferrer");
      if (!janela) {
        window.location.href = url;
      }
      toast.success("Download iniciado");
      return;
    }

    const a = document.createElement("a");
    a.href = url;
    a.download = nomeArquivo;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success("Download iniciado");
  } catch {
    toast.error("Não foi possível iniciar o download");
  }
}
