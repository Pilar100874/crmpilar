import {BarChart3, Boxes, ArrowLeftRight, FileInput, ClipboardList, Send, Receipt, FilePlus2, FileText, FilePen, FileX, Ban, Undo2, History, Hash, ClipboardCheck, Download, ShieldCheck, Calculator, Activity, ListChecks, Scale, Server, Wallet, Package, Building2, ShoppingCart} from 'lucide-react';

/** Shared operational menu catalog; configuration groups use existing screens. */
export const MENUS_OPERACIONAIS = [
  {id:'Compras', title:'Compras', icon:ShoppingCart, subItems:[
    {id:'Necessidade de Compra', title:'Necessidade de Compra', url:'/compras/necessidade', icon:ClipboardList},
    {id:'Cotações de Compra', title:'Cotações', url:'/compras/cotacoes', icon:Send},
    {id:'Config Estab Condicoes Pagamento', title:'Condições de pagamento', url:'/vendas-config?tab=condicoes', icon:Wallet, group:'Configurações'},
  ]},
  {id:'Estoque', title:'Estoque', icon:Boxes, subItems:[
    {id:'Saldos de Estoque', title:'Saldos', url:'/estoque/saldos', icon:Boxes},
    {id:'Movimentações de Estoque', title:'Movimentações', url:'/estoque/movimentacoes', icon:ArrowLeftRight},
    {id:'Entrada de NF-e', title:'Importar NF-e / XML', url:'/estoque/entrada', icon:FileInput},
    {id:'Painel de Entradas', title:'Painel e Conferência de Entradas', url:'/entradas/painel', icon:ClipboardCheck},
    {id:'Distribuição DF-e', title:'Documentos e Manifestação', url:'/entradas/documentos', icon:Download},
    {id:'Config Estab Produtos', title:'Produtos', url:'/vendas-config?tab=produtos', icon:Package, group:'Configurações'},
    {id:'Config Estab Unidades', title:'Unidades', url:'/config?secao=cadastro-unidades', icon:Building2, group:'Configurações'},
  ]},
  {id:'Módulo Faturamento', title:'Faturamento', icon:Receipt, subItems:[
    {id:'Painel de Faturamento', title:'Painel', url:'/faturamento/painel', icon:BarChart3},
    {id:'Faturamento', title:'Faturar Pedidos', url:'/faturamento', icon:Receipt},
    {id:'Nova NF-e', title:'Nova NF-e', url:'/faturamento/nova', icon:FilePlus2},
    {id:'NF-e Emitidas', title:'NF-e Emitidas', url:'/faturamento/notas/emitidas', icon:FileText},
    {id:'Rascunhos NF-e', title:'Rascunhos', url:'/faturamento/notas/rascunhos', icon:FilePen},
    {id:'Notas Rejeitadas', title:'Rejeitadas', url:'/faturamento/notas/rejeitadas', icon:FileX},
    {id:'Notas Canceladas', title:'Canceladas', url:'/faturamento/notas/canceladas', icon:Ban},
    {id:'Devoluções NF-e', title:'Devoluções', url:'/faturamento/notas/devolucoes', icon:Undo2},
    {id:'Eventos Fiscais', title:'Eventos e Inutilização', url:'/faturamento/eventos', icon:History},
    {id:'Auditoria Fiscal', title:'Auditoria Systax', url:'/fiscal/auditoria', icon:ShieldCheck},
    {id:'Simulador Tributário', title:'Simulador Tributário', url:'/fiscal/simulador', icon:Calculator},
    {id:'Relatórios Fiscais', title:'Relatórios', url:'/fiscal/relatorios', icon:BarChart3},
    {id:'Monitor Fiscal', title:'Monitor e Certificados', url:'/fiscal/monitor', icon:Activity},
    {id:'Séries e Numeração', title:'Séries e Numeração', url:'/faturamento/series', icon:Hash, group:'Configurações'},
    {id:'Tipos de operação', title:'Tipos de operação', url:'/fiscal/tipos-operacao', icon:ListChecks, group:'Configurações'},
    {id:'Configuração Systax', title:'Configuração Systax', url:'/fiscal/configuracao-systax', icon:Scale, group:'Configurações'},
    {id:'Motor próprio NF-e', title:'Emissor NF-e próprio', url:'/fiscal/motor-proprio', icon:Server, group:'Configurações'},
  ]},
];