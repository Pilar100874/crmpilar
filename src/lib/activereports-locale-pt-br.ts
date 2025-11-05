// Configuração de localização para ActiveReportsJS em Português BR
export const ptBRLocale = {
  "designer": {
    "title": "Designer de Relatórios",
    "save": "Salvar",
    "preview": "Visualizar",
    "export": "Exportar",
    "print": "Imprimir",
    "undo": "Desfazer",
    "redo": "Refazer",
    "delete": "Excluir",
    "copy": "Copiar",
    "paste": "Colar",
    "cut": "Recortar",
    "properties": "Propriedades",
    "dataSource": "Fonte de Dados",
    "addDataSource": "Adicionar Fonte de Dados",
    "newReport": "Novo Relatório",
    "openReport": "Abrir Relatório",
    "reports": "Relatórios",
    "fields": "Campos",
    "parameters": "Parâmetros",
    "groups": "Grupos",
    "toolbox": "Caixa de Ferramentas",
    "layers": "Camadas",
    "textbox": "Caixa de Texto",
    "image": "Imagem",
    "chart": "Gráfico",
    "table": "Tabela",
    "line": "Linha",
    "shape": "Forma",
    "barcode": "Código de Barras",
    "container": "Container",
    "pageHeader": "Cabeçalho da Página",
    "pageFooter": "Rodapé da Página",
    "reportHeader": "Cabeçalho do Relatório",
    "reportFooter": "Rodapé do Relatório",
    "detail": "Detalhe",
    "groupHeader": "Cabeçalho do Grupo",
    "groupFooter": "Rodapé do Grupo"
  },
  "viewer": {
    "title": "Visualizador de Relatórios",
    "firstPage": "Primeira Página",
    "previousPage": "Página Anterior",
    "nextPage": "Próxima Página",
    "lastPage": "Última Página",
    "zoom": "Zoom",
    "fitToWidth": "Ajustar à Largura",
    "fitToPage": "Ajustar à Página",
    "exportPdf": "Exportar PDF",
    "exportExcel": "Exportar Excel",
    "exportHtml": "Exportar HTML",
    "print": "Imprimir",
    "search": "Pesquisar",
    "pageOf": "de"
  },
  "common": {
    "ok": "OK",
    "cancel": "Cancelar",
    "apply": "Aplicar",
    "close": "Fechar",
    "yes": "Sim",
    "no": "Não",
    "name": "Nome",
    "value": "Valor",
    "type": "Tipo",
    "size": "Tamanho",
    "width": "Largura",
    "height": "Altura",
    "color": "Cor",
    "font": "Fonte",
    "align": "Alinhar",
    "left": "Esquerda",
    "center": "Centro",
    "right": "Direita",
    "top": "Topo",
    "middle": "Meio",
    "bottom": "Inferior"
  }
};

// Função para aplicar a localização
export function applyPortugueseLocale() {
  try {
    // @ts-ignore
    if (window.GC && window.GC.ActiveReports) {
      // @ts-ignore
      window.GC.ActiveReports.Core.setLocale(ptBRLocale);
    }
  } catch (error) {
    console.log("Não foi possível aplicar localização portuguesa:", error);
  }
}
