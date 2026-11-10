// Módulos internos declarados manualmente (complementam os gerados automaticamente).
// Use quando a tela não expõe as abas em um formato reconhecido pelo gerador.

import type { ModuloInternoGerado } from "./modulosInternos.gerado";

export const MODULOS_INTERNOS_EXTRAS: Record<string, ModuloInternoGerado[]> = {
  "Painel Chats": [{ id: "minha-jornada", label: "Minha jornada" }],
  "Config Atendimento": [
    { id: "agentes-voz", label: "Agentes de Voz" },
  ],
};
