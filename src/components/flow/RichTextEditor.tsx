import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Search, User, MapPin, Building2, Hash, Globe, Database } from "lucide-react";
import { cn } from "@/lib/utils";

interface Variable {
  name: string;
  description: string;
  category: string;
  blockName?: string;
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  nodes?: any[];
  edges?: any[];
  selectedNode?: any;
  className?: string;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "User": return User;
    case "Address": return MapPin;
    case "Company": return Building2;
    case "Contact": return Hash;
    case "System": return Database;
    default: return Globe;
  }
};

const getBlockOutputVariables = (node: any): Variable[] => {
  if (!node) return [];
  
  const variables: Variable[] = [];
  const blockName = node.data.config?.title || node.data.label || "Block";
  
  switch (node.data.type) {
    case "start":
      variables.push(
        { name: "user_name", description: "Nome do usuário", category: "User", blockName },
        { name: "user_phone", description: "Telefone do usuário", category: "User", blockName }
      );
      break;
    case "ask_name":
      variables.push({ name: node.data.config?.variable || "user_name", description: "Nome coletado", category: "User", blockName });
      break;
    case "ask_email":
      variables.push({ name: node.data.config?.variable || "user_email", description: "Email coletado", category: "Contact", blockName });
      break;
    case "ask_phone":
      variables.push({ name: node.data.config?.variable || "user_phone", description: "Telefone coletado", category: "Contact", blockName });
      break;
    case "ask_question":
      variables.push({ name: node.data.config?.variable || "user_input", description: "Resposta do usuário", category: "User", blockName });
      break;
    case "ask_number":
      variables.push({ name: node.data.config?.variable || "user_number", description: "Número coletado", category: "User", blockName });
      break;
    case "ask_date":
      variables.push({ name: node.data.config?.variable || "user_date", description: "Data coletada", category: "User", blockName });
      break;
    case "ask_file":
      variables.push({ name: node.data.config?.variable || "user_file", description: "Arquivo enviado", category: "User", blockName });
      break;
    case "ask_url":
      variables.push({ name: node.data.config?.variable || "user_url", description: "URL coletada", category: "User", blockName });
      break;
    case "ask_address":
      const addressVar = node.data.config?.variable || "address";
      variables.push(
        { name: `${addressVar}_cep`, description: "CEP", category: "Address", blockName },
        { name: `${addressVar}_street`, description: "Rua", category: "Address", blockName },
        { name: `${addressVar}_number`, description: "Número", category: "Address", blockName },
        { name: `${addressVar}_complement`, description: "Complemento", category: "Address", blockName },
        { name: `${addressVar}_neighborhood`, description: "Bairro", category: "Address", blockName },
        { name: `${addressVar}_city`, description: "Cidade", category: "Address", blockName },
        { name: `${addressVar}_state`, description: "Estado", category: "Address", blockName }
      );
      break;
    case "ask_cnpj":
      const cnpjVar = node.data.config?.variable || "company";
      variables.push(
        { name: `${cnpjVar}_cnpj`, description: "CNPJ", category: "Company", blockName },
        { name: `${cnpjVar}_name`, description: "Razão Social", category: "Company", blockName },
        { name: `${cnpjVar}_fantasy`, description: "Nome Fantasia", category: "Company", blockName },
        { name: `${cnpjVar}_opening_date`, description: "Data Abertura", category: "Company", blockName },
        { name: `${cnpjVar}_legal_nature`, description: "Natureza Jurídica", category: "Company", blockName },
        { name: `${cnpjVar}_address`, description: "Endereço Completo", category: "Company", blockName },
        { name: `${cnpjVar}_phone`, description: "Telefone", category: "Company", blockName },
        { name: `${cnpjVar}_email`, description: "Email", category: "Company", blockName },
        { name: `${cnpjVar}_regime_tributario`, description: "Regime Tributário", category: "Company", blockName }
      );
      break;
    case "ask_cep":
      const cepVar = node.data.config?.variable || "address";
      variables.push(
        { name: `${cepVar}_cep`, description: "CEP", category: "Address", blockName },
        { name: `${cepVar}_street`, description: "Rua", category: "Address", blockName },
        { name: `${cepVar}_neighborhood`, description: "Bairro", category: "Address", blockName },
        { name: `${cepVar}_city`, description: "Cidade", category: "Address", blockName },
        { name: `${cepVar}_state`, description: "Estado", category: "Address", blockName }
      );
      break;
    case "webhook":
      const webhookVar = node.data.config?.responseVariable || "webhook_response";
      variables.push({ name: webhookVar, description: "Resposta do Webhook", category: "System", blockName });
      break;
    case "set_field":
      const fieldVar = node.data.config?.variable || "custom_field";
      variables.push({ name: fieldVar, description: "Campo personalizado", category: "System", blockName });
      break;
  }
  
  return variables;
};

const getAncestorNodes = (nodeId: string, nodes: any[], edges: any[]): any[] => {
  const ancestors: any[] = [];
  const visited = new Set<string>();
  
  const findAncestors = (currentId: string) => {
    if (visited.has(currentId)) return;
    visited.add(currentId);
    
    const incomingEdges = edges.filter(edge => edge.target === currentId);
    
    for (const edge of incomingEdges) {
      const sourceNode = nodes.find(n => n.id === edge.source);
      if (sourceNode && !ancestors.find(n => n.id === sourceNode.id)) {
        ancestors.push(sourceNode);
        findAncestors(sourceNode.id);
      }
    }
  };
  
  findAncestors(nodeId);
  return ancestors;
};

export const RichTextEditor = ({
  value,
  onChange,
  placeholder,
  multiline = false,
  nodes = [],
  edges = [],
  selectedNode,
  className
}: RichTextEditorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const [cursorPosition, setCursorPosition] = useState(0);

  // Get available variables from ancestor nodes
  const availableVariables: Variable[] = [];
  if (selectedNode && nodes.length > 0 && edges.length > 0) {
    const ancestorNodes = getAncestorNodes(selectedNode.id, nodes, edges);
    ancestorNodes.forEach(node => {
      const vars = getBlockOutputVariables(node);
      availableVariables.push(...vars);
    });
  }

  // Group variables by block
  const variablesByBlock = availableVariables.reduce((acc, variable) => {
    const blockName = variable.blockName || "Other";
    if (!acc[blockName]) {
      acc[blockName] = [];
    }
    acc[blockName].push(variable);
    return acc;
  }, {} as Record<string, Variable[]>);

  // Filter variables based on search
  const filteredBlocks = Object.entries(variablesByBlock).reduce((acc, [blockName, vars]) => {
    const matchingVars = vars.filter(
      v => 
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        blockName.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (matchingVars.length > 0) {
      acc[blockName] = matchingVars;
    }
    return acc;
  }, {} as Record<string, Variable[]>);

  const updateCursorPosition = () => {
    if (inputRef.current) {
      setCursorPosition(inputRef.current.selectionStart || 0);
    }
  };

  const insertVariable = (variableName: string) => {
    const before = value.slice(0, cursorPosition);
    const after = value.slice(cursorPosition);
    const newValue = `${before}{{${variableName}}}${after}`;
    onChange(newValue);
    setIsOpen(false);
    setSearchQuery("");
    
    // Focus back on input and set cursor after inserted variable
    setTimeout(() => {
      if (inputRef.current) {
        const newPosition = cursorPosition + variableName.length + 4; // +4 for {{}}
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  const InputComponent = multiline ? "textarea" : "input";

  return (
    <div className="space-y-2">
      <div className="relative">
        <InputComponent
          ref={inputRef as any}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onSelect={updateCursorPosition}
          onClick={updateCursorPosition}
          onKeyUp={updateCursorPosition}
          placeholder={placeholder}
          className={cn(
            "flex w-full rounded-sm border-2 border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
            multiline ? "min-h-[120px] resize-none" : "h-10",
            className
          )}
          {...(multiline ? { rows: 4 } : {})}
        />
      </div>
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Inserir Variável
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome do bloco ou variável..."
                className="pl-9"
              />
            </div>
          </div>
          
          <ScrollArea className="h-[400px]">
            {Object.keys(filteredBlocks).length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                {availableVariables.length === 0 
                  ? "Nenhuma variável disponível. Adicione blocos antes deste para coletar dados."
                  : "Nenhuma variável encontrada."}
              </div>
            ) : (
              <div className="p-2 space-y-4">
                {Object.entries(filteredBlocks).map(([blockName, vars]) => (
                  <div key={blockName} className="space-y-2">
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {blockName}
                    </div>
                    <div className="space-y-1">
                      {vars.map((variable) => {
                        const Icon = getCategoryIcon(variable.category);
                        return (
                          <button
                            key={variable.name}
                            type="button"
                            onClick={() => insertVariable(variable.name)}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent transition-colors text-left group"
                          >
                            <div className="flex-shrink-0 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                              <Icon className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                                {variable.name}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {variable.description}
                              </div>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {variable.category}
                            </Badge>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>
      
      {/* Preview of variables in text */}
      {value && value.includes("{{") && (
        <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded-md">
          <span className="font-medium">Preview:</span>{" "}
          {value.split(/(\{\{[^}]+\}\})/).map((part, i) => {
            if (part.startsWith("{{") && part.endsWith("}}")) {
              return (
                <Badge key={i} variant="secondary" className="text-xs mx-1">
                  {part.slice(2, -2)}
                </Badge>
              );
            }
            return <span key={i}>{part}</span>;
          })}
        </div>
      )}
    </div>
  );
};
