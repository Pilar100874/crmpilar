import { resolve } from "node:path";
import type { Plugin } from "vite";
import { gerarSeMudou, ARQUIVO_GERADO } from "./gerar";

/**
 * Mantém o catálogo de módulos internos das permissões sempre atualizado:
 * regenera ao iniciar o dev server, antes do build e sempre que uma tela,
 * o menu ou as rotas mudam. Assim, qualquer menu/aba nova aparece
 * automaticamente na tela de grupos de acesso.
 */
export const modulosPermissoesPlugin = (): Plugin => {
  let raiz = process.cwd();
  let agendado: NodeJS.Timeout | null = null;

  const regenerar = (motivo: string) => {
    try {
      const { mudou, telas } = gerarSeMudou(raiz);
      if (mudou) {
        console.log(`[permissoes] módulos internos atualizados (${telas} telas) — ${motivo}`);
      }
    } catch (erro) {
      console.warn("[permissoes] falha ao gerar módulos internos:", erro);
    }
  };

  return {
    name: "modulos-permissoes",
    configResolved(config) {
      raiz = config.root || process.cwd();
      regenerar("inicialização");
    },
    handleHotUpdate({ file }) {
      if (!file.endsWith(".tsx") && !file.endsWith(".ts")) return;
      if (file === resolve(raiz, ARQUIVO_GERADO)) return;
      if (agendado) clearTimeout(agendado);
      agendado = setTimeout(() => regenerar("alteração em telas/menu"), 500);
    },
  };
};
