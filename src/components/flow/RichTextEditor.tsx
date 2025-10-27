import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { X, Plus, Search, User, MapPin, Building2, Hash, Globe, Database, Bold, Italic, Code, Link, List, ListOrdered } from "lucide-react";
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

// Parse markdown + variables para elementos do editor
const parseToEditor = (text: string): string => {
  if (!text) return '';
  
  let html = text;
  
  // Variáveis primeiro (antes de qualquer formatação)
  html = html.replace(/\{\{([^}]+)\}\}/g, '<span class="variable-badge" contenteditable="false" data-variable="$1">$1</span>');
  
  // Negrito: *texto*
  html = html.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
  
  // Itálico: _texto_
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
  
  // Código: ```texto```
  html = html.replace(/```([^`]+)```/g, '<code>$1</code>');
  
  // Tachado: ~texto~
  html = html.replace(/~([^~]+)~/g, '<s>$1</s>');
  
  // Quebras de linha
  html = html.replace(/\n/g, '<br>');
  
  return html;
};

// Converte conteúdo do editor de volta para markdown + variables
const parseFromEditor = (element: HTMLElement): string => {
  let text = '';
  
  const processNode = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent || '';
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      
      if (el.classList.contains('variable-badge')) {
        text += `{{${el.dataset.variable || el.textContent}}}`;
      } else if (el.tagName === 'STRONG' || el.tagName === 'B') {
        text += '*';
        el.childNodes.forEach(processNode);
        text += '*';
      } else if (el.tagName === 'EM' || el.tagName === 'I') {
        text += '_';
        el.childNodes.forEach(processNode);
        text += '_';
      } else if (el.tagName === 'CODE') {
        text += '```';
        el.childNodes.forEach(processNode);
        text += '```';
      } else if (el.tagName === 'S') {
        text += '~';
        el.childNodes.forEach(processNode);
        text += '~';
      } else if (el.tagName === 'BR') {
        text += '\n';
      } else if (el.tagName === 'DIV') {
        el.childNodes.forEach(processNode);
        text += '\n';
      } else {
        el.childNodes.forEach(processNode);
      }
    }
  };
  
  element.childNodes.forEach(processNode);
  
  return text.trim();
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
  const editorRef = useRef<HTMLDivElement>(null);
  const isUpdatingRef = useRef(false);

  // Atualiza o editor quando value muda externamente
  useEffect(() => {
    if (!editorRef.current || isUpdatingRef.current) return;
    
    const currentText = parseFromEditor(editorRef.current);
    if (currentText !== value) {
      const selection = window.getSelection();
      const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
      let offset = 0;
      
      if (range && editorRef.current.contains(range.startContainer)) {
        offset = range.startOffset;
      }
      
      editorRef.current.innerHTML = parseToEditor(value);
      
      // Tenta restaurar o cursor
      if (offset > 0 && editorRef.current.firstChild) {
        try {
          const textNode = editorRef.current.firstChild;
          const newRange = document.createRange();
          const sel = window.getSelection();
          newRange.setStart(textNode, Math.min(offset, textNode.textContent?.length || 0));
          newRange.collapse(true);
          sel?.removeAllRanges();
          sel?.addRange(newRange);
        } catch (e) {
          // Ignora erros de cursor
        }
      }
    }
  }, [value]);

  const handleInput = () => {
    if (!editorRef.current) return;
    
    isUpdatingRef.current = true;
    const newValue = parseFromEditor(editorRef.current);
    onChange(newValue);
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Previne edição de variáveis
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      let node = range.startContainer;
      
      if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentNode as Node;
      }
      
      if ((node as HTMLElement).classList?.contains('variable-badge')) {
        if (e.key === 'Backspace' || e.key === 'Delete') {
          e.preventDefault();
          (node as HTMLElement).remove();
          handleInput();
        } else if (e.key.length === 1) {
          e.preventDefault();
        }
      }
    }
  };

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

  const insertVariable = (variableName: string) => {
    if (!editorRef.current) return;
    
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) {
      editorRef.current.focus();
      return;
    }
    
    const range = selection.getRangeAt(0);
    range.deleteContents();
    
    // Cria badge da variável
    const varBadge = document.createElement('span');
    varBadge.className = 'variable-badge';
    varBadge.contentEditable = 'false';
    varBadge.dataset.variable = variableName;
    varBadge.textContent = variableName;
    
    range.insertNode(varBadge);
    
    // Adiciona espaço após a variável
    const space = document.createTextNode(' ');
    range.setStartAfter(varBadge);
    range.insertNode(space);
    range.setStartAfter(space);
    range.collapse(true);
    
    selection.removeAllRanges();
    selection.addRange(range);
    
    handleInput();
    setIsOpen(false);
    setSearchQuery("");
    editorRef.current.focus();
  };

  const applyFormatting = (tag: string) => {
    if (!editorRef.current) return;
    
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    
    // Se não há texto selecionado, não faz nada
    if (range.collapsed) return;
    
    try {
      // Cria o elemento de formatação
      const element = document.createElement(tag);
      
      // Tenta envolver o conteúdo selecionado
      const contents = range.extractContents();
      element.appendChild(contents);
      range.insertNode(element);
      
      // Move o cursor para depois do elemento formatado
      range.setStartAfter(element);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } catch (e) {
      // Se falhar, tenta uma abordagem alternativa
      console.error('Formatting error:', e);
      document.execCommand(tag === 'strong' ? 'bold' : tag === 'em' ? 'italic' : 'strikethrough', false);
    }
    
    handleInput();
    editorRef.current.focus();
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          className={cn(
            "w-full rounded-sm border-2 border-input bg-background px-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all overflow-auto",
            multiline ? "min-h-[120px]" : "h-10 flex items-center whitespace-nowrap",
            !value && "empty-editor",
            className
          )}
          data-placeholder={placeholder}
          style={{
            whiteSpace: multiline ? 'pre-wrap' : 'nowrap',
            wordWrap: 'break-word'
          }}
        />
        <style>{`
          .empty-editor:empty:before {
            content: attr(data-placeholder);
            color: hsl(var(--muted-foreground));
            pointer-events: none;
          }
          .variable-badge {
            display: inline-flex;
            align-items: center;
            background: hsl(var(--primary) / 0.1);
            color: hsl(var(--primary));
            padding: 0.125rem 0.5rem;
            border-radius: 0.25rem;
            font-size: 0.75rem;
            font-weight: 500;
            margin: 0 0.125rem;
            cursor: default;
            user-select: none;
          }
          .variable-badge:hover {
            background: hsl(var(--primary) / 0.15);
          }
          [contenteditable] strong {
            font-weight: 700;
          }
          [contenteditable] em {
            font-style: italic;
          }
          [contenteditable] code {
            background: hsl(var(--muted));
            padding: 0.125rem 0.25rem;
            border-radius: 0.25rem;
            font-size: 0.875rem;
            font-family: monospace;
          }
          [contenteditable] s {
            text-decoration: line-through;
          }
        `}</style>
      </div>
      
      {/* Formatting Toolbar */}
      <div className="flex items-center gap-1 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => applyFormatting('strong')}
          className="h-8 px-2"
          title="Negrito (*texto*)"
        >
          <Bold className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => applyFormatting('em')}
          className="h-8 px-2"
          title="Itálico (_texto_)"
        >
          <Italic className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => applyFormatting('code')}
          className="h-8 px-2"
          title="Código (```texto```)"
        >
          <Code className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => applyFormatting('s')}
          className="h-8 px-2"
          title="Tachado (~texto~)"
        >
          <span className="text-xs font-semibold">S</span>
        </Button>
        
        <Separator orientation="vertical" className="h-6 mx-1" />
        
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Variável
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
      </div>
    </div>
  );
};
