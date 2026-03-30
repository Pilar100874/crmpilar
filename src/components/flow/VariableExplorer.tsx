import { Node, Edge } from "@xyflow/react";
import { FlowNodeData, NodeType } from "@/types/flow";
import { FlowVariable, VariableType } from "@/components/flow/VariableManager";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Database, Variable, Type, Hash, Calendar, List, ToggleLeft, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "@/lib/toast-config";
import { Button } from "@/components/ui/button";

interface VariableExplorerProps {
  selectedNode: Node | null;
  nodes: Node[];
  edges: Edge[];
  flowVariables?: FlowVariable[];
  expectedType?: VariableType | "string" | "any";
}

// Type icons and colors mapping
const typeConfig = {
  text: { icon: Type, color: "text-primary", bgColor: "bg-primary/5", borderColor: "border-primary/20" },
  string: { icon: Type, color: "text-primary", bgColor: "bg-primary/5", borderColor: "border-primary/20" },
  number: { icon: Hash, color: "text-green-600", bgColor: "bg-green-50", borderColor: "border-green-200" },
  date: { icon: Calendar, color: "text-purple-600", bgColor: "bg-purple-50", borderColor: "border-purple-200" },
  datetime: { icon: Calendar, color: "text-purple-600", bgColor: "bg-purple-50", borderColor: "border-purple-200" },
  array: { icon: List, color: "text-orange-600", bgColor: "bg-orange-50", borderColor: "border-orange-200" },
  boolean: { icon: ToggleLeft, color: "text-cyan-600", bgColor: "bg-cyan-50", borderColor: "border-cyan-200" },
  object: { icon: Database, color: "text-pink-600", bgColor: "bg-pink-50", borderColor: "border-pink-200" },
  file: { icon: FileText, color: "text-yellow-600", bgColor: "bg-yellow-50", borderColor: "border-yellow-200" },
  any: { icon: Variable, color: "text-foreground/70", bgColor: "bg-muted", borderColor: "border-border" },
};

// Check if variable type is compatible with expected type
const isTypeCompatible = (varType: string, expectedType?: string): boolean => {
  if (!expectedType || expectedType === "any") return true;
  
  // Normalize types
  const normalizedVarType = varType === "string" ? "text" : varType;
  const normalizedExpectedType = expectedType === "string" ? "text" : expectedType;
  
  // Text and string are compatible
  if ((normalizedVarType === "text" || normalizedVarType === "string") && 
      (normalizedExpectedType === "text" || normalizedExpectedType === "string")) {
    return true;
  }
  
  // Date and datetime are compatible
  if ((normalizedVarType === "date" || normalizedVarType === "datetime") && 
      (normalizedExpectedType === "date" || normalizedExpectedType === "datetime")) {
    return true;
  }
  
  return normalizedVarType === normalizedExpectedType;
};

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

    // Question blocks (all ask_* types)
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
        ask_cep: "cep",
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
        outputs.push({
          name: config.outputVariable,
          description: `Resposta da API ${config.url || ''}`,
          type: "object"
        });
        outputs.push({
          name: `${config.outputVariable}.status`,
          description: "Status HTTP da resposta",
          type: "number"
        });
        outputs.push({
          name: `${config.outputVariable}.data`,
          description: "Dados retornados pela API",
          type: "object"
        });
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
          description: `Resultado da fórmula: ${config.formula || ''}`,
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
          description: "Confirmação de mensagem enviada",
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
          description: `Dados dinâmicos: ${config.source || ''}`,
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

// Get all ancestor nodes (nodes that come before the selected node in the flow)
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

export const VariableExplorer = ({ selectedNode, nodes, edges, flowVariables = [], expectedType }: VariableExplorerProps) => {
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  if (!selectedNode) {
    return null;
  }

  const ancestorNodes = getAncestorNodes(selectedNode.id, nodes, edges);
  // Fallback: incluir também blocos CNPJ existentes no fluxo (útil quando o fluxo ainda não está totalmente conectado)
  const cnpjNodes = nodes.filter(n => (n.data as FlowNodeData).type === "ask_cnpj");
  const consideredNodes: Node[] = [...ancestorNodes];
  cnpjNodes.forEach(n => {
    if (!consideredNodes.some(a => a.id === n.id)) consideredNodes.push(n);
  });

  const availableVariables: { 
    blockName: string; 
    blockType: NodeType | "custom";
    variables: { name: string; description: string; type: string }[] 
  }[] = [];

  // Add manually created flow variables first
  if (flowVariables.length > 0) {
    const filteredFlowVars = flowVariables
      .filter(v => isTypeCompatible(v.type, expectedType))
      .map(v => ({
        name: v.name,
        description: v.description || `Variável ${v.name}`,
        type: v.type
      }));
    
    if (filteredFlowVars.length > 0) {
      availableVariables.push({
        blockName: "Variáveis Personalizadas",
        blockType: "custom" as const,
        variables: filteredFlowVars
      });
    }
  }

  // Collect variables from all ancestor blocks
  ancestorNodes.forEach(node => {
    const outputs = getBlockOutputVariables(node);
    const filteredOutputs = outputs.filter(v => isTypeCompatible(v.type, expectedType));
    
    if (filteredOutputs.length > 0) {
      availableVariables.push({
        blockName: (node.data as FlowNodeData).label,
        blockType: (node.data as FlowNodeData).type,
        variables: filteredOutputs
      });
    }
  });


  if (availableVariables.length === 0) {
    return (
      <Card className="mt-4 bg-muted border-border">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2 text-foreground">
            <Database className="w-4 h-4 text-primary" />
            Variáveis Disponíveis
            {expectedType && expectedType !== "any" && (
              <Badge variant="outline" className="text-xs ml-auto border-border text-foreground/80">
                Tipo: {expectedType}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-foreground/70">
            {expectedType && expectedType !== "any" 
              ? `Nenhuma variável do tipo "${expectedType}" disponível.`
              : "Nenhuma variável disponível. Crie variáveis ou adicione blocos anteriores."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4 bg-muted border-border">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2 text-foreground">
          <Database className="w-4 h-4 text-primary" />
          Variáveis Disponíveis
          {expectedType && expectedType !== "any" && (
            <Badge variant="outline" className="text-xs ml-auto border-primary/20 text-primary">
              Filtro: {expectedType}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            {availableVariables.map((block, blockIdx) => (
              <div key={blockIdx} className="space-y-2">
                <div className="flex items-center gap-2">
                  {block.blockType === "custom" ? (
                    <Badge variant="default" className="text-xs bg-primary hover:bg-primary/90 text-white">
                      <Variable className="w-3 h-3 mr-1" />
                      {block.blockName}
                    </Badge>
                  ) : (
                    <>
                      <Badge variant="outline" className="text-xs border-border text-foreground/80">
                        {block.blockName}
                      </Badge>
                      <span className="text-xs text-muted-foreground">({block.blockType})</span>
                    </>
                  )}
                </div>
                <div className="space-y-1 pl-2 border-l-2 border-border">
                  {block.variables.map((variable, varIdx) => {
                    const config = typeConfig[variable.type as keyof typeof typeConfig] || typeConfig.any;
                    const Icon = config.icon;
                    
                    return (
                      <div 
                        key={varIdx} 
                        className={`flex items-center justify-between gap-2 p-2 rounded border ${config.borderColor} ${config.bgColor} hover:opacity-80 transition-all group`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                            <code className={`text-xs font-mono ${config.color} font-semibold`}>
                              {variable.name}
                            </code>
                            <Badge 
                              variant="secondary" 
                              className={`text-[10px] ${config.bgColor} ${config.color} border-0`}
                            >
                              {variable.type}
                            </Badge>
                          </div>
                          <p className="text-xs text-foreground/70 mt-1 truncate ml-5">
                            {variable.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex flex-wrap gap-2 mb-2">
            <div className="flex items-center gap-1 text-xs">
              <Type className="w-3 h-3 text-primary" />
              <span className="text-foreground/70">Texto</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <Hash className="w-3 h-3 text-green-600" />
              <span className="text-foreground/70">Número</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <Calendar className="w-3 h-3 text-purple-600" />
              <span className="text-foreground/70">Data</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <List className="w-3 h-3 text-orange-600" />
              <span className="text-foreground/70">Array</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <ToggleLeft className="w-3 h-3 text-cyan-600" />
              <span className="text-foreground/70">Booleano</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
