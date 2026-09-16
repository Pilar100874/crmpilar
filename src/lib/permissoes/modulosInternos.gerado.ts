// ARQUIVO GERADO AUTOMATICAMENTE — não edite à mão.
// Gere novamente com: bun run scripts/gerarModulosInternos.ts
// Mapeia o id de um item de menu para os módulos internos (abas) da tela.

export interface ModuloInternoGerado {
  id: string;
  label: string;
}

export const MODULOS_INTERNOS_GERADOS: Record<string, ModuloInternoGerado[]> = {
  "Dashboard Supervisor": [
    {
      "id": "visao-geral",
      "label": "Visão Geral"
    },
    {
      "id": "metricas",
      "label": "Métricas"
    }
  ],
  "Campanhas": [
    {
      "id": "day",
      "label": "Dia"
    },
    {
      "id": "week",
      "label": "Semana"
    },
    {
      "id": "month",
      "label": "Mês"
    },
    {
      "id": "list",
      "label": "Lista"
    },
    {
      "id": "table",
      "label": "Tabela"
    }
  ],
  "Config Vendas": [
    {
      "id": "cadastro",
      "label": "Cadastro"
    },
    {
      "id": "importacao",
      "label": "Importação"
    },
    {
      "id": "ajuste-imagens",
      "label": "Ajuste de Imagem em Lote"
    }
  ],
  "Admin Assistente Voz": [
    {
      "id": "telas",
      "label": "Telas por voz"
    },
    {
      "id": "frases",
      "label": "Frases por voz"
    },
    {
      "id": "testar",
      "label": "Testar"
    },
    {
      "id": "relatorios",
      "label": "Relatórios por voz"
    },
    {
      "id": "snapshots",
      "label": "Snapshots"
    },
    {
      "id": "config",
      "label": "Configurações"
    }
  ]
};
