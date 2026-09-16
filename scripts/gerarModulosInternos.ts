/**
 * CLI: regenera src/lib/permissoes/modulosInternos.gerado.ts
 *
 * Uso: npm run permissoes:gerar
 * (Em desenvolvimento e no build isso já acontece sozinho pelo plugin do Vite.)
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { gerarSeMudou } from "./modulosInternos/gerar";

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = resolve(aqui, "..");

const { mudou, telas } = gerarSeMudou(raiz);
console.log(
  mudou
    ? `Módulos internos atualizados: ${telas} telas.`
    : `Módulos internos já estavam atualizados: ${telas} telas.`
);
