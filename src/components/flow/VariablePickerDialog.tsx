import { useState, useEffect } from "react";
import { Node, Edge } from "@xyflow/react";
import { FlowNodeData, NodeType } from "@/types/flow";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, Database } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VariablePickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectVariable: (variable: string) => void;
  onInsertAtEnd?: (variable: string) => void;
  selectedNode: Node | null;
  nodes: Node[];
  edges: Edge[];
}

// Define what variables each block type outputs
const getBlockOutputVariables = (node: Node): { name: string; description: string; type: string }[] => {
  const data = node.data as FlowNodeData;
  const config = data.config || {};
  const outputs: { name: string; description: string; type: string }[] = [];

  switch (data.type) {
    case "start":
      outputs.push(
        { name: "user_message", description: "Mensagem do usuário", type: "string" },
        { name: "user_phone", description: "Telefone do usuário", type: "string" },
        { name: "user_name", description: "Nome do usuário", type: "string" },
        { name: "session_id", description: "ID da sessão", type: "string" },
        { name: "timestamp", description: "Data/hora do início", type: "datetime" }
      );
      break;

    // Question blocks (básicos - 1 variável)
    case "ask_name":
    case "ask_question":
    case "ask_email":
    case "ask_number":
    case "ask_phone":
    case "ask_date":
    case "ask_file":
    case "ask_address":
    case "ask_url": {
      const defaults: Record<string, string> = {
        ask_name: "nome",
        ask_question: "resposta",
        ask_email: "email",
        ask_number: "numero",
        ask_phone: "telefone",
        ask_date: "data",
        ask_file: "arquivo",
        ask_address: "endereco",
        ask_url: "url",
      };
      const varName = (config.variable || defaults[data.type]) as string | undefined;
      if (varName) {
        const cleanVarName = String(varName).replace(/^@/, "");
        outputs.push({
          name: cleanVarName,
          description: `Resposta: ${config.question || 'pergunta'}`,
          type: data.type === "ask_number" ? "number" : 
                data.type === "ask_date" ? "datetime" : 
                data.type === "ask_file" ? "file" : "string"
        });
      }
      break;
    }

    // Perguntar CNPJ (múltiplas variáveis)
    case "ask_cnpj": {
      const varName = (config.variable || "cnpj") as string | undefined;
      if (varName) {
        const cleanVarName = String(varName).replace(/^@/, "");
        // Sempre incluir a variável principal do CNPJ
        outputs.push({ name: cleanVarName, description: "CNPJ digitado", type: "string" });

        // Mapa completo de campos com defaults quando não configurados
        const fields = {
          razao_social: (config.razaoSocialField || 'razao_social') as string,
          nome_fantasia: (config.nomeFantasiaField || 'nome_fantasia') as string,
          natureza_juridica: (config.naturezaJuridicaField || 'natureza_juridica') as string,
          data_abertura: (config.dataAberturaField || 'data_abertura') as string,
          situacao: (config.situacaoField || 'situacao') as string,
          porte: (config.porteField || 'porte') as string,
          atividade_principal: (config.atividadePrincipalField || 'atividade_principal') as string,
          logradouro: (config.logradouroField || 'logradouro') as string,
          numero: (config.numeroField || 'numero') as string,
          complemento: (config.complementoField || 'complemento') as string,
          bairro: (config.bairroField || 'bairro') as string,
          municipio: (config.municipioField || 'municipio') as string,
          uf: (config.ufField || 'uf') as string,
          cep: (config.cepField || 'cep') as string,
          telefone: (config.telefoneField || 'telefone') as string,
          email: (config.emailField || 'email') as string,
          socio_nome: (config.socioNomeField || 'socio_nome') as string,
          socio_qualificacao: (config.socioQualificacaoField || 'socio_qualificacao') as string,
          regime_tributario: (config.regimeTributarioField || 'regime_tributario') as string,
          simples_optante: (config.simplesOptanteField || 'simples_optante') as string,
          simei_optante: (config.simeiOptanteField || 'simei_optante') as string,
        } as const;

        Object.entries(fields).forEach(([label, name]) => {
          const clean = String(name).replace(/^@/, "");
          outputs.push({ name: clean, description: label.replace(/_/g, ' ').replace(/^\w/, c=>c.toUpperCase()), type: "string" });
        });
      }
      break;
    }

    case "ask_cep": {
      const varName = (config.variable || "cep") as string | undefined;
      if (varName) {
        const cleanVarName = String(varName).replace(/^@/, "");
        
        // Usar campos configurados ou padrões
        const fields = {
          cep: config.variable || cleanVarName,
          logradouro: config.logradouroField || 'logradouro',
          bairro: config.bairroField || 'bairro',
          localidade: config.localidadeField || 'localidade',
          uf: config.ufField || 'uf',
          complemento: config.complementoField || 'complemento',
        };
        
        outputs.push(
          { name: fields.cep, description: "CEP digitado", type: "string" },
          { name: fields.logradouro, description: "Logradouro", type: "string" },
          { name: fields.bairro, description: "Bairro", type: "string" },
          { name: fields.localidade, description: "Cidade", type: "string" },
          { name: fields.uf, description: "Estado (UF)", type: "string" },
          { name: fields.complemento, description: "Complemento", type: "string" }
        );
      }
      break;
    }

    case "webhook":
      if (config.outputVariable) {
        outputs.push(
          {
            name: config.outputVariable,
            description: `Resposta da API ${config.url || ''}`,
            type: "object"
          },
          {
            name: `${config.outputVariable}.status`,
            description: "Status HTTP da resposta",
            type: "number"
          },
          {
            name: `${config.outputVariable}.data`,
            description: "Dados retornados pela API",
            type: "object"
          }
        );
      }
      break;

    case "set_field":
      if (config.operations && Array.isArray(config.operations)) {
        config.operations.forEach((op: any) => {
          if (op.variable) {
            outputs.push({
              name: op.variable,
              description: `Campo definido: ${op.variable}`,
              type: "any"
            });
          }
        });
      }
      break;

    case "formulas":
      if (config.outputVariable) {
        outputs.push({
          name: config.outputVariable,
          description: `Resultado: ${config.formula || ''}`,
          type: "any"
        });
      }
      break;

    case "ai_agent":
      if (config.outputVariable) {
        outputs.push({
          name: config.outputVariable,
          description: "Resposta do agente IA",
          type: "string"
        });
      }
      break;

    case "send_message":
    case "media":
    case "goodbye":
      if (config.outputVariable) {
        outputs.push({
          name: config.outputVariable,
          description: "Confirmação de envio",
          type: "boolean"
        });
      }
      break;

    case "trigger_automation":
      if (config.outputVariable) {
        outputs.push({
          name: config.outputVariable,
          description: "Resultado da automação",
          type: "object"
        });
      }
      break;

    case "dynamic_data":
      if (config.outputVariable) {
        outputs.push({
          name: config.outputVariable,
          description: `Dados: ${config.source || ''}`,
          type: "object"
        });
      }
      break;

    case "lead_scoring":
      outputs.push({
        name: config.scoreField || "lead_score",
        description: "Pontuação do lead",
        type: "number"
      });
      break;

    case "reply_buttons": {
      const varName = config.variable as string | undefined;
      if (varName) {
        const cleanVarName = String(varName).replace(/^@/, "");
        outputs.push({
          name: cleanVarName,
          description: "Resposta do botão selecionado",
          type: "string"
        });
      }
      break;
    }

    case "list_buttons": {
      const varName = config.variable as string | undefined;
      if (varName) {
        const cleanVarName = String(varName).replace(/^@/, "");
        outputs.push({
          name: cleanVarName,
          description: "Opção de lista selecionada",
          type: "string"
        });
      }
      break;
    }

    case "keyword_options": {
      const varName = config.variable as string | undefined;
      if (varName) {
        const cleanVarName = String(varName).replace(/^@/, "");
        outputs.push({
          name: cleanVarName,
          description: "Opção selecionada por palavra-chave",
          type: "string"
        });
      }
      break;
    }
  }

  return outputs;
};

// Get all ancestor nodes
const getAncestorNodes = (nodeId: string, nodes: Node[], edges: Edge[]): Node[] => {
  const ancestors: Node[] = [];
  const visited = new Set<string>();

  const traverse = (currentId: string) => {
    if (visited.has(currentId)) return;
    visited.add(currentId);

    const incomingEdges = edges.filter(e => e.target === currentId);
    incomingEdges.forEach(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      if (sourceNode) {
        ancestors.push(sourceNode);
        traverse(sourceNode.id);
      }
    });
  };

  traverse(nodeId);
  return ancestors;
};

export const VariablePickerDialog = ({
  open,
  onClose,
  onSelectVariable,
  onInsertAtEnd,
  selectedNode,
  nodes,
  edges,
}: VariablePickerDialogProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (open) {
      setSearchQuery("");
    }
  }, [open]);

  if (!selectedNode) return null;

  const ancestorNodes = getAncestorNodes(selectedNode.id, nodes, edges);
  // Fallback: também considerar blocos de CNPJ existentes no fluxo (alguns fluxos podem ainda não estar conectados ao nó selecionado)
  const cnpjNodes = nodes.filter(n => (n.data as FlowNodeData).type === "ask_cnpj");
  const consideredNodes: Node[] = [...ancestorNodes];
  cnpjNodes.forEach(n => {
    if (!consideredNodes.some(a => a.id === n.id)) consideredNodes.push(n);
  });

  const allVariables: { 
    blockName: string; 
    blockType: NodeType;
    variable: { name: string; description: string; type: string };
  }[] = [];

  consideredNodes.forEach(node => {
    const outputs = getBlockOutputVariables(node);
    outputs.forEach(variable => {
      allVariables.push({
        blockName: (node.data as FlowNodeData).label,
        blockType: (node.data as FlowNodeData).type,
        variable,
      });
    });
  });

  const filteredVariables = allVariables.filter(item => 
    item.variable.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.variable.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.blockName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-3xl max-h-[85vh] bg-foreground/90 border-slate-700">
        <DialogHeader className="border-b border-slate-700 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                <Database className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-white">
                  Selecionar Variável
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Clique para inserir variáveis no campo
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-muted-foreground hover:text-white hover:bg-foreground/80"
            >
              Fechar
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar variável..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-foreground/50 border-slate-700 text-white placeholder:text-muted-foreground focus:border-cyan-500 focus:ring-cyan-500/20"
              autoFocus
            />
          </div>

          {filteredVariables.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 bg-foreground/80/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Database className="w-8 h-8 text-foreground/70" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">
                {searchQuery 
                  ? "Nenhuma variável encontrada"
                  : "Nenhuma variável disponível"}
              </p>
              <p className="text-xs text-muted-foreground">
                {!searchQuery && "Adicione blocos anteriores que geram variáveis"}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {filteredVariables.map((item, idx) => (
                  <button
                    key={idx}
                    className="w-full p-4 rounded-lg border border-slate-700 bg-foreground/90/30 hover:bg-foreground/80/50 hover:border-cyan-500/50 transition-all text-left group"
                    onClick={() => onSelectVariable(item.variable.name)}
                    onDoubleClick={() => onInsertAtEnd?.(item.variable.name)}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <code className="text-sm font-mono text-cyan-400 bg-slate-950/50 px-3 py-1.5 rounded flex-1 group-hover:text-cyan-300">
                        {"{{"}{item.variable.name}{"}}"}
                      </code>
                      <Badge 
                        variant="secondary" 
                        className="text-xs bg-foreground/80 text-muted-foreground/60 border-slate-700"
                      >
                        {item.variable.type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge 
                        variant="outline" 
                        className="text-xs border-slate-700 text-muted-foreground"
                      >
                        {item.blockName}
                      </Badge>
                      <span className="flex-1 text-muted-foreground group-hover:text-muted-foreground">
                        {item.variable.description}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <div className="pt-4 border-t border-slate-700">
          <div className="flex items-start gap-3 bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3">
            <div className="text-cyan-500 mt-0.5">💡</div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground/60 mb-1 font-medium">
                Modo de inserção múltipla ativo
              </p>
              <p className="text-xs text-muted-foreground">
                <strong>Clique simples:</strong> Insere na posição do cursor<br />
                <strong>Duplo clique:</strong> Insere no final do texto<br />
                Use o botão "Fechar" quando terminar.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
